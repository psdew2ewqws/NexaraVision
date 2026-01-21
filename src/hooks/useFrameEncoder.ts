'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Web Worker-based frame encoder hook
 * Offloads frame encoding to a separate thread for better UI performance
 * Addresses GAP-PERF-003
 */

interface WorkerMessage {
  type: 'ready' | 'success' | 'error';
  id?: number;
  result?: string | string[] | ImageData | { success: boolean; width: number; height: number };
  error?: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export function useFrameEncoder() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<number, PendingRequest>>(new Map());
  const requestIdRef = useRef(0);
  const [isReady, setIsReady] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  // Initialize worker
  useEffect(() => {
    // Check if OffscreenCanvas is supported
    if (typeof OffscreenCanvas === 'undefined') {
      console.warn('[FrameEncoder] OffscreenCanvas not supported, falling back to main thread');
      setIsSupported(false);
      setIsReady(true);
      return;
    }

    try {
      const worker = new Worker('/workers/frame-encoder.worker.js');

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, id, result, error } = event.data;

        if (type === 'ready') {
          setIsReady(true);
          console.log('[FrameEncoder] Worker ready');
          return;
        }

        if (id === undefined) return;

        const pending = pendingRef.current.get(id);
        if (!pending) return;

        pendingRef.current.delete(id);

        if (type === 'error') {
          pending.reject(new Error(error || 'Unknown worker error'));
        } else {
          pending.resolve(result);
        }
      };

      worker.onerror = (error) => {
        console.error('[FrameEncoder] Worker error:', error);
        setIsSupported(false);
        setIsReady(true);
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
        pendingRef.current.clear();
      };
    } catch (err) {
      console.error('[FrameEncoder] Failed to create worker:', err);
      setIsSupported(false);
      setIsReady(true);
    }
  }, []);

  // Send message to worker and wait for response
  const sendMessage = useCallback(<T>(type: string, payload: Record<string, unknown>): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isSupported) {
        reject(new Error('Worker not available'));
        return;
      }

      const id = ++requestIdRef.current;
      pendingRef.current.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject
      });

      workerRef.current.postMessage({ type, id, payload });
    });
  }, [isSupported]);

  // Initialize canvas in worker
  const initCanvas = useCallback(async (width: number, height: number) => {
    if (!isSupported) return false;
    try {
      await sendMessage<{ success: boolean }>('init', { width, height });
      return true;
    } catch (err) {
      console.error('[FrameEncoder] Init failed:', err);
      return false;
    }
  }, [sendMessage, isSupported]);

  // Encode a single frame (ImageBitmap) to base64
  const encodeFrame = useCallback(async (
    imageBitmap: ImageBitmap,
    quality = 0.85
  ): Promise<string | null> => {
    if (!isSupported) return null;
    try {
      return await sendMessage<string>('encode', { imageBitmap, quality });
    } catch (err) {
      console.error('[FrameEncoder] Encode failed:', err);
      return null;
    }
  }, [sendMessage, isSupported]);

  // Encode video frame directly from video element
  const encodeVideoFrame = useCallback(async (
    video: HTMLVideoElement,
    width: number,
    height: number,
    quality = 0.85
  ): Promise<string | null> => {
    if (!isSupported) {
      // Fallback to main thread encoding
      return encodeOnMainThread(video, width, height, quality);
    }

    try {
      // Create ImageBitmap from video (this is fast)
      const bitmap = await createImageBitmap(video, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'low' // Fast resize
      });

      // Send to worker for encoding
      return await encodeFrame(bitmap, quality);
    } catch (err) {
      console.error('[FrameEncoder] Video encode failed:', err);
      // Fallback to main thread
      return encodeOnMainThread(video, width, height, quality);
    }
  }, [encodeFrame, isSupported]);

  // Fallback main thread encoding
  const encodeOnMainThread = useCallback((
    video: HTMLVideoElement,
    width: number,
    height: number,
    quality: number
  ): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      return dataUrl.split(',')[1]; // Return just the base64 part
    } catch (err) {
      console.error('[FrameEncoder] Main thread encode failed:', err);
      return null;
    }
  }, []);

  return {
    isReady,
    isSupported,
    initCanvas,
    encodeFrame,
    encodeVideoFrame,
    encodeOnMainThread
  };
}

/**
 * Simple hook for components that just need the fallback encoder
 * Use when Web Worker isn't critical
 */
export function useSimpleFrameEncoder() {
  const encode = useCallback((
    video: HTMLVideoElement,
    width: number,
    height: number,
    quality = 0.85
  ): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      return dataUrl.split(',')[1];
    } catch {
      return null;
    }
  }, []);

  return { encode };
}
