/**
 * React Hook for WebSocket Detection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { DetectionWebSocket, type DetectionResult } from '@/lib/websocket';
import { wsLogger as log } from '@/lib/logger';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  userId?: string | null;
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
  const { autoConnect = false, userId = null, onDetection, onError } = options;

  const wsRef = useRef<DetectionWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [latestResult, setLatestResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(async () => {
    if (!wsRef.current) {
      wsRef.current = new DetectionWebSocket();

      // Set user ID for per-user model configuration
      if (userId) {
        wsRef.current.setUserId(userId);
      }

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
    } else if (userId) {
      // Update user ID if already connected
      wsRef.current.setUserId(userId);
    }

    try {
      await wsRef.current.connect();
    } catch (err) {
      log.error('Failed to connect WebSocket:', err);
      throw err;
    }
  }, [userId, onDetection, onError]);

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
        log.error('Auto-connect failed:', err);
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
