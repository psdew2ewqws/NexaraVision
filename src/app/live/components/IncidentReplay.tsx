'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  X,
  Gauge,
} from 'lucide-react';
import type { DetectionEvent } from '@/hooks/useDetectionHistory';

export interface IncidentReplayProps {
  event: DetectionEvent | null;
  onClose: () => void;
}

export function IncidentReplay({ event, onClose }: IncidentReplayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const frames = event?.clipData || [];
  const totalFrames = frames.length;

  // Stop playback when reaching end
  useEffect(() => {
    if (currentFrame >= totalFrames - 1) {
      setIsPlaying(false);
    }
  }, [currentFrame, totalFrames]);

  // Playback control
  useEffect(() => {
    if (isPlaying && totalFrames > 0) {
      const frameRate = 30; // Original capture rate
      const interval = (1000 / frameRate) / playbackSpeed;

      intervalRef.current = setInterval(() => {
        setCurrentFrame((prev) => {
          if (prev >= totalFrames - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalFrames]);

  // Render current frame to canvas
  useEffect(() => {
    if (!canvasRef.current || totalFrames === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = frames[currentFrame];
  }, [currentFrame, frames, totalFrames]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevFrame = () => {
    setCurrentFrame(Math.max(0, currentFrame - 1));
    setIsPlaying(false);
  };

  const handleNextFrame = () => {
    setCurrentFrame(Math.min(totalFrames - 1, currentFrame + 1));
    setIsPlaying(false);
  };

  const handleSeek = (value: number[]) => {
    setCurrentFrame(value[0]);
    setIsPlaying(false);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleDownload = () => {
    if (!event) return;

    // Create video-like export (download all frames as zip or create video blob)
    // For now, download first frame as sample
    const link = document.createElement('a');
    link.href = frames[0];
    link.download = `incident-${event.id}-frame.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!event) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-4xl border-[var(--border)] bg-[var(--card-bg)] shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--text-primary)]">
              Incident Replay
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[var(--border)]">
                {new Date(event.timestamp).toLocaleString()}
              </Badge>
              <Badge
                variant="destructive"
                className="bg-[var(--danger-red)]"
              >
                {Math.round(event.confidence * 100)}% Confidence
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Video Player */}
          <div className="relative bg-black rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full aspect-video"
            />

            {/* Frame Counter Overlay */}
            <div className="absolute top-4 left-4 bg-black/70 backdrop-blur px-3 py-1 rounded">
              <span className="text-white text-sm font-mono">
                Frame {currentFrame + 1} / {totalFrames}
              </span>
            </div>

            {/* Confidence Overlay */}
            <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded">
              <span className="text-red-500 text-sm font-bold">
                {Math.round(event.confidence * 100)}% Violence
              </span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="space-y-4">
            {/* Timeline Slider */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-[var(--text-secondary)] w-12">
                {Math.floor((currentFrame / 30) * 10) / 10}s
              </span>
              <Slider
                value={[currentFrame]}
                min={0}
                max={totalFrames - 1}
                step={1}
                onValueChange={handleSeek}
                className="flex-1"
              />
              <span className="text-xs text-[var(--text-secondary)] w-12 text-right">
                {Math.floor((totalFrames / 30) * 10) / 10}s
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevFrame}
                  disabled={currentFrame === 0}
                  className="border-[var(--border)]"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  onClick={handlePlayPause}
                  className="bg-[var(--accent-blue)] hover:bg-blue-600"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextFrame}
                  disabled={currentFrame === totalFrames - 1}
                  className="border-[var(--border)]"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>

              {/* Playback Speed */}
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[var(--text-secondary)]" />
                {[0.25, 0.5, 1, 2].map((speed) => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSpeedChange(speed)}
                    className={
                      playbackSpeed === speed
                        ? 'bg-[var(--accent-blue)]'
                        : 'border-[var(--border)]'
                    }
                  >
                    {speed}x
                  </Button>
                ))}
              </div>

              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-[var(--border)]"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">
                Camera ID
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {event.cameraId || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] mb-1">
                Status
              </p>
              <Badge variant="outline" className="border-[var(--border)]">
                {event.status}
              </Badge>
            </div>
            {event.notes && (
              <div className="col-span-2">
                <p className="text-xs text-[var(--text-secondary)] mb-1">
                  Notes
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  {event.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
