/**
 * React Hook for Adaptive Frame Rate
 *
 * Research: "Low activity: 1 FPS, Medium: 2-3 FPS, High: 5 FPS"
 * Automatically adjusts capture rate based on motion detection
 */

import { useState, useCallback, useRef } from 'react';
import { detectMotion, type MotionAnalysis } from '@/lib/preprocessing';

export interface UseAdaptiveFrameRateOptions {
  minFPS?: number;
  maxFPS?: number;
  enabled?: boolean;
}

export interface UseAdaptiveFrameRateReturn {
  currentFPS: number;
  motionLevel: 'low' | 'medium' | 'high';
  motionScore: number;
  updateMotion: (currentFrame: ImageData, previousFrame: ImageData | null) => void;
  getFrameInterval: () => number;
  reset: () => void;
}

/**
 * Adaptive Frame Rate Hook
 */
export function useAdaptiveFrameRate(
  options: UseAdaptiveFrameRateOptions = {}
): UseAdaptiveFrameRateReturn {
  const { minFPS = 1, maxFPS = 5, enabled = true } = options;

  const [currentFPS, setCurrentFPS] = useState(2); // Start at medium
  const [motionLevel, setMotionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [motionScore, setMotionScore] = useState(0);

  const motionHistoryRef = useRef<number[]>([]);
  const maxHistorySize = 10;

  /**
   * Update motion analysis and adjust FPS
   */
  const updateMotion = useCallback(
    (currentFrame: ImageData, previousFrame: ImageData | null) => {
      if (!enabled || !previousFrame) {
        return;
      }

      // Detect motion
      const analysis: MotionAnalysis = detectMotion(currentFrame, previousFrame);

      // Add to motion history
      motionHistoryRef.current.push(analysis.motionScore);
      if (motionHistoryRef.current.length > maxHistorySize) {
        motionHistoryRef.current.shift();
      }

      // Calculate average motion over recent history
      const avgMotion =
        motionHistoryRef.current.reduce((sum, score) => sum + score, 0) /
        motionHistoryRef.current.length;

      setMotionScore(avgMotion);
      setMotionLevel(analysis.motionLevel);

      // Adjust FPS based on motion level
      let targetFPS: number;
      switch (analysis.motionLevel) {
        case 'low':
          targetFPS = 1;
          break;
        case 'medium':
          targetFPS = 2.5;
          break;
        case 'high':
          targetFPS = 5;
          break;
        default:
          targetFPS = 2;
      }

      // Clamp to min/max
      targetFPS = Math.max(minFPS, Math.min(maxFPS, targetFPS));

      setCurrentFPS(targetFPS);
    },
    [enabled, minFPS, maxFPS]
  );

  /**
   * Get frame capture interval in milliseconds
   */
  const getFrameInterval = useCallback(() => {
    return Math.round(1000 / currentFPS);
  }, [currentFPS]);

  /**
   * Reset adaptive frame rate
   */
  const reset = useCallback(() => {
    setCurrentFPS(2);
    setMotionLevel('medium');
    setMotionScore(0);
    motionHistoryRef.current = [];
  }, []);

  return {
    currentFPS,
    motionLevel,
    motionScore,
    updateMotion,
    getFrameInterval,
    reset,
  };
}
