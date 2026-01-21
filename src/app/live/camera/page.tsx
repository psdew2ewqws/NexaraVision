'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Video, Square, AlertCircle } from 'lucide-react';
import { createWebSocketConnection } from '@/lib/api';
import type { Alert as AlertType } from '@/types/detection';

export default function LiveCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [violenceProb, setViolenceProb] = useState(0);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const frameBuffer = useRef<string[]>([]);

  const startDetection = async () => {
    try {
      setError(null);

      // Request webcam access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Connect to WebSocket
      const ws = createWebSocketConnection();
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsDetecting(true);
        startFrameCapture();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.result) {
            const probability = data.result.violenceProbability || 0;
            setViolenceProb(Math.round(probability * 100));

            if (probability > 0.85) {
              handleViolenceDetected(probability);
            }
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('WebSocket connection failed');
        stopDetection();
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Camera access denied';
      setError(errorMessage);
      console.error('Failed to start detection:', err);
    }
  };

  const startFrameCapture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frames at 30fps, send batch of 20 frames every 0.66s
    intervalRef.current = setInterval(() => {
      if (!isDetecting) return;

      // Capture frame
      ctx.drawImage(video, 0, 0, 224, 224);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      frameBuffer.current.push(imageData);

      // Send batch when we have 20 frames
      if (frameBuffer.current.length === 20) {
        sendFrameBatch(frameBuffer.current);
        frameBuffer.current = frameBuffer.current.slice(10); // Keep 50% overlap
      }
    }, 1000 / 30); // 30fps
  };

  const sendFrameBatch = (frames: string[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    wsRef.current.send(
      JSON.stringify({
        type: 'analyze_frames',
        frames: frames,
      })
    );
  };

  const handleViolenceDetected = (probability: number) => {
    // Play alert sound
    const audio = new Audio('/alert-sound.mp3');
    audio.play().catch(() => {
      // Audio playback failed (user interaction may be required)
    });

    // Add to alerts list
    const newAlert: AlertType = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      confidence: Math.round(probability * 100),
      violenceProbability: probability,
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]); // Keep last 5 alerts
  };

  const stopDetection = () => {
    setIsDetecting(false);

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Reset state
    frameBuffer.current = [];
    setViolenceProb(0);
  };

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  const violenceDetected = violenceProb > 85;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
          Live Violence Detection
        </h1>
        <p className="text-[var(--text-secondary)]">
          Monitor your webcam feed in real-time with AI violence detection
        </p>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card-bg)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-[var(--text-primary)]">
            <span>Live Camera Feed</span>
            {isDetecting && (
              <Badge variant="destructive" className="animate-pulse bg-[var(--danger-red)]">
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div
            className={`relative rounded-lg overflow-hidden bg-black ${
              violenceDetected ? 'ring-4 ring-[var(--danger-red)] animate-pulse' : ''
            }`}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video"
            />
            <canvas ref={canvasRef} width={224} height={224} className="hidden" />

            {/* Real-time Probability Overlay */}
            {isDetecting && (
              <div className="absolute bottom-4 left-4 right-4">
                <Card className="bg-black/70 backdrop-blur border-[var(--border)]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium">Violence Probability</span>
                      <span
                        className={`text-2xl font-bold ${
                          violenceProb > 85
                            ? 'text-[var(--danger-red)]'
                            : 'text-[var(--success-green)]'
                        }`}
                      >
                        {violenceProb}%
                      </span>
                    </div>
                    <Progress
                      value={violenceProb}
                      className="h-2 bg-gray-700"
                      indicatorClassName={
                        violenceProb > 85 ? 'bg-[var(--danger-red)]' : 'bg-[var(--success-green)]'
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="border-[var(--danger-red)]">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Controls */}
          <div className="flex gap-4">
            {!isDetecting ? (
              <Button
                size="lg"
                onClick={startDetection}
                className="flex-1 bg-[var(--accent-blue)] hover:bg-blue-600"
              >
                <Video className="mr-2 h-5 w-5" />
                Start Live Detection
              </Button>
            ) : (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopDetection}
                className="flex-1 bg-[var(--danger-red)] hover:bg-red-600"
              >
                <Square className="mr-2 h-5 w-5" />
                Stop Detection
              </Button>
            )}
          </div>

          {/* Alert History */}
          {alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-[var(--text-primary)]">Recent Alerts</h3>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    variant="destructive"
                    className="border-[var(--danger-red)] bg-red-950/30"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-[var(--danger-red)]">Violence Detected</AlertTitle>
                    <AlertDescription className="text-[var(--text-secondary)]">
                      {alert.timestamp} - Confidence: {alert.confidence}%
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
