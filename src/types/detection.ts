// Detection Types for NexaraVision

export interface DetectionResult {
  violenceProbability: number;
  confidence: 'Low' | 'Medium' | 'High';
  timestamp?: string;
  peakTimestamp?: string;
  frameAnalysis?: FrameAnalysis[];
  perClassScores?: {
    nonViolence: number;
    violence: number;
  };
  prediction?: string;
  inferenceTimeMs?: number;
  backend?: string;
  videoMetadata?: {
    filename?: string;
    durationSeconds?: number;
    fps?: number;
    resolution?: string;
    totalFrames?: number;
  };
  timing?: {
    extractionMs?: number;
    inferenceMs?: number;
    totalMs?: number;
  };
}

export interface FrameAnalysis {
  frameIndex: number;
  timestamp: string;
  violenceProb: number;
}

export interface UploadResponse {
  success: boolean;
  data?: DetectionResult;
  error?: string;
}

export interface LiveDetectionMessage {
  type: 'analyze_frames' | 'detection_result' | 'error';
  frames?: string[];
  result?: DetectionResult;
  error?: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  confidence: number;
  violenceProbability: number;
  clipUrl?: string;
}

export interface CameraGridConfig {
  rows: number;
  cols: number;
  totalCameras: number;
  cameraBounds: CameraBound[];
  segmentationConfidence?: number;
}

export interface CameraBound {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MultiCameraResult {
  cameraId: string;
  maxViolenceProb: number;
  peakTimestamp: string;
  timeline: FrameAnalysis[];
}
