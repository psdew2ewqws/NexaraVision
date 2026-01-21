/**
 * React Hook for WebSocket Detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { DetectionWebSocket, type DetectionResult } from '@/lib/websocket';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  onDetection?: (result: DetectionResult) => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect: () => Promise<void>;
  disconnect: () => void;
  sendFrames: (frames: string[], cameraId?: string) => void;
  latestResult: DetectionResult | null;
  error: Error | null;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = false, onDetection, onError } = options;

  const wsRef = useRef<DetectionWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [latestResult, setLatestResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    if (!wsRef.current) {
      wsRef.current = new DetectionWebSocket();

      // Register event handlers
      wsRef.current.onDetection((result) => {
        setLatestResult(result);
        onDetection?.(result);
      });

      wsRef.current.onError((err) => {
        setError(err);
        onError?.(err);
      });

      wsRef.current.onStatus((newStatus) => {
        setStatus(newStatus);
        setIsConnected(newStatus === 'connected');
      });
    }

    try {
      await wsRef.current.connect();
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      throw err;
    }
  }, [onDetection, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      setIsConnected(false);
      setStatus('disconnected');
    }
  }, []);

  const sendFrames = useCallback((frames: string[], cameraId?: string) => {
    if (wsRef.current && isConnected) {
      wsRef.current.analyzeFrames(frames, cameraId);
    }
  }, [isConnected]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect().catch((err) => {
        console.error('Auto-connect failed:', err);
      });
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    status,
    connect,
    disconnect,
    sendFrames,
    latestResult,
    error,
  };
}
