/**
 * WebSocket Client for Real-Time Detection
 *
 * Replaces HTTP polling with WebSocket for <200ms latency
 * Research: "Replace HTTP polling with WebSocket for real-time updates"
 */

import { wsLogger as log } from '@/lib/logger';

export interface WebSocketMessage {
  type: 'analyze_frames' | 'ping' | 'subscribe' | 'unsubscribe';
  frames?: string[];
  cameraId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface DetectionResult {
  cameraId?: string;
  violenceProbability: number;
  confidence: number;
  timestamp: number;
  modelVersion?: string;
  processingTime?: number;
}

export interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type WebSocketEventHandler = (data: DetectionResult) => void;
export type WebSocketErrorHandler = (error: Error) => void;
export type WebSocketStatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void;

/**
 * WebSocket Client Manager
 */
export class DetectionWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isManualClose = false;
  private userId: string | null = null;

  private config: Required<WebSocketConfig>;
  private eventHandlers: WebSocketEventHandler[] = [];
  private errorHandlers: WebSocketErrorHandler[] = [];
  private statusHandlers: WebSocketStatusHandler[] = [];

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
    };
  }

  /**
   * Get WebSocket URL based on environment
   */
  private getWebSocketUrl(): string {
    // Use environment variable if available
    if (process.env.NEXT_PUBLIC_WS_URL) {
      return process.env.NEXT_PUBLIC_WS_URL;
    }

    if (typeof window === 'undefined') {
      return 'ws://localhost:8002';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;

    // In production, use same host (nginx will proxy)
    if (host !== 'localhost') {
      return `${protocol}//${host}/ws/live`;
    }

    // Backend WebSocket server runs on port 8002
    return `${protocol}//${host}:8002`;
  }

  /**
   * Connect to WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isManualClose = false;
        this.notifyStatus('connecting');

        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          log.debug('[WebSocket] Connected to detection server');
          this.reconnectAttempts = 0;
          this.notifyStatus('connected');
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle different message types
            if (data.type === 'pong') {
              // Heartbeat response
              return;
            }

            if (data.result) {
              // Detection result
              const result: DetectionResult = {
                cameraId: data.cameraId,
                violenceProbability: data.result.violenceProbability || 0,
                confidence: data.result.confidence || data.result.violenceProbability || 0,
                timestamp: data.timestamp || Date.now(),
                modelVersion: data.modelVersion,
                processingTime: data.processingTime,
              };

              this.notifyEvent(result);
            }
          } catch (err) {
            log.error('[WebSocket] Failed to parse message:', err);
          }
        };

        this.ws.onerror = (error) => {
          log.error('[WebSocket] Error:', error);
          this.notifyStatus('error');
          this.notifyError(new Error('WebSocket connection error'));
          reject(error);
        };

        this.ws.onclose = (event) => {
          log.debug('[WebSocket] Disconnected:', event.code, event.reason);
          this.notifyStatus('disconnected');
          this.stopHeartbeat();

          if (!this.isManualClose) {
            this.attemptReconnect();
          }
        };
      } catch (err) {
        this.notifyError(err as Error);
        reject(err);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.isManualClose = true;
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Set user ID for per-user model configuration
   */
  public setUserId(userId: string | null): void {
    this.userId = userId;
    log.debug(`[WebSocket] User ID set to: ${userId || 'anonymous'}`);
  }

  /**
   * Get current user ID
   */
  public getUserId(): string | null {
    return this.userId;
  }

  /**
   * Send frames for analysis
   */
  public analyzeFrames(frames: string[], cameraId?: string): void {
    if (!this.isConnected()) {
      log.warn('[WebSocket] Not connected, cannot send frames');
      return;
    }

    const message: WebSocketMessage = {
      type: 'analyze_frames',
      frames,
      cameraId,
      userId: this.userId || undefined,
      metadata: {
        timestamp: Date.now(),
        frameCount: frames.length,
      },
    };

    this.send(message);
  }

  /**
   * Send WebSocket message
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      log.error('[WebSocket] Max reconnect attempts reached');
      this.notifyError(new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    log.debug(`[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        log.error('[WebSocket] Reconnect failed:', err);
      });
    }, this.config.reconnectInterval);
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Register event handler for detection results
   */
  public onDetection(handler: WebSocketEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      this.eventHandlers = this.eventHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register error handler
   */
  public onError(handler: WebSocketErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register status change handler
   */
  public onStatus(handler: WebSocketStatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Notify event handlers
   */
  private notifyEvent(data: DetectionResult): void {
    this.eventHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (err) {
        log.error('[WebSocket] Event handler error:', err);
      }
    });
  }

  /**
   * Notify error handlers
   */
  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => {
      try {
        handler(error);
      } catch (err) {
        log.error('[WebSocket] Error handler error:', err);
      }
    });
  }

  /**
   * Notify status handlers
   */
  private notifyStatus(status: 'connecting' | 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(status);
      } catch (err) {
        log.error('[WebSocket] Status handler error:', err);
      }
    });
  }
}

/**
 * Singleton instance for global WebSocket management
 */
let globalWebSocket: DetectionWebSocket | null = null;

export function getGlobalWebSocket(): DetectionWebSocket {
  if (!globalWebSocket) {
    globalWebSocket = new DetectionWebSocket();
  }
  return globalWebSocket;
}

export function resetGlobalWebSocket(): void {
  if (globalWebSocket) {
    globalWebSocket.disconnect();
    globalWebSocket = null;
  }
}
