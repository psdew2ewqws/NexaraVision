/**
 * Client-Side Video Preprocessing Library
 *
 * Implements edge detection, motion detection, and frame optimization
 * based on research findings from Consensus.app:
 * - Canny edge detection for object highlighting
 * - Motion-based pre-filtering to reduce false positives
 * - Adaptive quality based on activity level
 */

export interface PreprocessingOptions {
  edgeDetection?: boolean;
  motionDetection?: boolean;
  quality?: number; // 0.1-1.0
  targetSize?: { width: number; height: number };
}

export interface MotionAnalysis {
  motionLevel: 'low' | 'medium' | 'high';
  motionScore: number; // 0-1
  hasSignificantMotion: boolean;
}

export interface PreprocessedFrame {
  original: string;
  edgeMap?: string;
  motionAnalysis?: MotionAnalysis;
  compressed: string;
  metadata: {
    timestamp: number;
    quality: number;
    size: { width: number; height: number };
  };
}

/**
 * Apply Canny-like edge detection to highlight objects
 * Based on research: "Canny and multi-scale edge detection methods are robust"
 */
export function applyEdgeDetection(
  imageData: ImageData,
  lowThreshold = 50,
  highThreshold = 150
): ImageData {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);

  // Convert to grayscale
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Sobel operator for gradient calculation
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  const gradient = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }

      const idx = y * width + x;
      gradient[idx] = Math.sqrt(gx * gx + gy * gy);
      direction[idx] = Math.atan2(gy, gx);
    }
  }

  // Non-maximum suppression
  const suppressed = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx];
      const mag = gradient[idx];

      let neighbor1 = 0;
      let neighbor2 = 0;

      // Determine neighbors based on gradient direction
      if ((angle >= -Math.PI / 8 && angle < Math.PI / 8) ||
          (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8)) {
        neighbor1 = gradient[idx - 1];
        neighbor2 = gradient[idx + 1];
      } else if ((angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) ||
                 (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8)) {
        neighbor1 = gradient[idx - width - 1];
        neighbor2 = gradient[idx + width + 1];
      } else if ((angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) ||
                 (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8)) {
        neighbor1 = gradient[idx - width];
        neighbor2 = gradient[idx + width];
      } else {
        neighbor1 = gradient[idx - width + 1];
        neighbor2 = gradient[idx + width - 1];
      }

      suppressed[idx] = (mag >= neighbor1 && mag >= neighbor2) ? mag : 0;
    }
  }

  // Double thresholding and edge tracking
  for (let i = 0; i < suppressed.length; i++) {
    const mag = suppressed[i];
    const pixelIdx = i * 4;

    if (mag >= highThreshold) {
      // Strong edge
      output.data[pixelIdx] = 255;
      output.data[pixelIdx + 1] = 255;
      output.data[pixelIdx + 2] = 255;
      output.data[pixelIdx + 3] = 255;
    } else if (mag >= lowThreshold) {
      // Weak edge (would need connectivity check for full Canny)
      output.data[pixelIdx] = 128;
      output.data[pixelIdx + 1] = 128;
      output.data[pixelIdx + 2] = 128;
      output.data[pixelIdx + 3] = 255;
    } else {
      // Not an edge
      output.data[pixelIdx] = 0;
      output.data[pixelIdx + 1] = 0;
      output.data[pixelIdx + 2] = 0;
      output.data[pixelIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * Detect motion by comparing consecutive frames
 * Research: "Motion-based pre-filtering to reduce false positives"
 */
export function detectMotion(
  currentFrame: ImageData,
  previousFrame: ImageData,
  threshold = 30,
  minChangedPixels = 0.01 // 1% of pixels changed
): MotionAnalysis {
  const { width, height, data: current } = currentFrame;
  const { data: previous } = previousFrame;

  let changedPixels = 0;
  let totalDifference = 0;
  const totalPixels = width * height;

  for (let i = 0; i < current.length; i += 4) {
    const rDiff = Math.abs(current[i] - previous[i]);
    const gDiff = Math.abs(current[i + 1] - previous[i + 1]);
    const bDiff = Math.abs(current[i + 2] - previous[i + 2]);

    const avgDiff = (rDiff + gDiff + bDiff) / 3;
    totalDifference += avgDiff;

    if (avgDiff > threshold) {
      changedPixels++;
    }
  }

  const changeRatio = changedPixels / totalPixels;
  const avgDifference = totalDifference / totalPixels;
  const motionScore = Math.min(avgDifference / 255, 1);

  let motionLevel: 'low' | 'medium' | 'high';
  if (motionScore < 0.05) {
    motionLevel = 'low';
  } else if (motionScore < 0.15) {
    motionLevel = 'medium';
  } else {
    motionLevel = 'high';
  }

  return {
    motionLevel,
    motionScore,
    hasSignificantMotion: changeRatio >= minChangedPixels,
  };
}

/**
 * Extract frame from video element or canvas
 */
export function captureFrame(
  source: HTMLVideoElement | HTMLCanvasElement,
  targetSize?: { width: number; height: number }
): ImageData {
  const canvas = document.createElement('canvas');
  const size = targetSize || { width: 224, height: 224 };

  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(source, 0, 0, size.width, size.height);
  return ctx.getImageData(0, 0, size.width, size.height);
}

/**
 * Convert ImageData to base64 JPEG
 */
export function imageDataToBase64(imageData: ImageData, quality = 0.8): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Preprocess a video frame with edge detection and motion analysis
 * Research-based: Combines Canny edge detection + motion filtering
 */
export function preprocessFrame(
  source: HTMLVideoElement | HTMLCanvasElement,
  previousFrame: ImageData | null,
  options: PreprocessingOptions = {}
): PreprocessedFrame {
  const {
    edgeDetection = false,
    motionDetection = true,
    quality = 0.8,
    targetSize = { width: 224, height: 224 },
  } = options;

  // Capture current frame
  const currentFrame = captureFrame(source, targetSize);
  const original = imageDataToBase64(currentFrame, quality);

  // Motion detection (if previous frame exists)
  let motionAnalysis: MotionAnalysis | undefined;
  if (motionDetection && previousFrame) {
    motionAnalysis = detectMotion(currentFrame, previousFrame);
  }

  // Edge detection (optional, computational cost)
  let edgeMap: string | undefined;
  if (edgeDetection) {
    const edges = applyEdgeDetection(currentFrame);
    edgeMap = imageDataToBase64(edges, quality);
  }

  // Compress based on motion level
  let adaptiveQuality = quality;
  if (motionAnalysis) {
    // High motion = higher quality needed
    // Low motion = can compress more
    switch (motionAnalysis.motionLevel) {
      case 'high':
        adaptiveQuality = Math.min(quality * 1.2, 1.0);
        break;
      case 'low':
        adaptiveQuality = quality * 0.7;
        break;
      default:
        adaptiveQuality = quality;
    }
  }

  const compressed = imageDataToBase64(currentFrame, adaptiveQuality);

  return {
    original,
    edgeMap,
    motionAnalysis,
    compressed,
    metadata: {
      timestamp: Date.now(),
      quality: adaptiveQuality,
      size: targetSize,
    },
  };
}

/**
 * Calculate optimal frame rate based on motion level
 * Research: "Adaptive frame rate: Low activity 1 FPS, Medium 2-3 FPS, High 5 FPS"
 */
export function calculateAdaptiveFPS(motionLevel: 'low' | 'medium' | 'high'): number {
  switch (motionLevel) {
    case 'low':
      return 1;
    case 'medium':
      return 2.5;
    case 'high':
      return 5;
    default:
      return 2;
  }
}

/**
 * Check if person is present in frame (basic heuristic)
 * Can be enhanced with TensorFlow.js pose detection
 */
export function detectPerson(_imageData: ImageData): boolean {
  // Placeholder for person detection
  // In production, use TensorFlow.js MoveNet or PoseNet
  // For now, always return true to avoid filtering
  return true;
}
