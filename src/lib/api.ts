import type { UploadResponse, DetectionResult } from '@/types/detection';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function uploadVideo(file: File): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append('video', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Upload failed: ${response.statusText}`);
    }

    const data: UploadResponse = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function uploadWithProgress(
  file: File,
  onProgress: (progress: number) => void
): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append('video', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          if (response.success && response.data) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Failed to parse response'));
        }
      } else {
        reject(new ApiError(xhr.status, `Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.open('POST', `${API_BASE_URL}/upload`);
    xhr.send(formData);
  });
}

// Confidence level type
type ConfidenceLevel = 'Low' | 'Medium' | 'High';

// Raw ML service API response (snake_case format)
interface MLApiResponse {
  violence_probability?: number;
  violenceProbability?: number;
  confidence?: string;
  per_class_scores?: {
    non_violence: number;
    violence: number;
  };
  prediction?: string;
  inference_time_ms?: number;
  inferenceTimeMs?: number;
  backend?: string;
  video_metadata?: {
    filename?: string;
    duration_seconds?: number;
    fps?: number;
    resolution?: string;
    total_frames?: number;
  };
  timing?: {
    extraction_ms?: number;
    inference_ms?: number;
    total_ms?: number;
  };
}

// Helper to validate and convert confidence level
function toConfidenceLevel(value?: string): ConfidenceLevel {
  if (value === 'High' || value === 'Low' || value === 'Medium') {
    return value;
  }
  return 'Medium';
}

interface StreamProgressUpdate {
  type: 'start' | 'progress' | 'result' | 'error' | 'end';
  stage?: string;
  progress?: number;
  message?: string;
  data?: MLApiResponse; // Raw API response, will be transformed
  filename?: string;
  size_mb?: number;
  video_info?: {
    total_frames: number;
    fps: number;
    width: number;
    height: number;
    duration_seconds: number;
  };
  frame?: number;
  total?: number;
  extraction_time_ms?: number;
  inference_time_ms?: number;
}

/**
 * Transform ML service response (snake_case) to frontend format (camelCase)
 */
function transformMLResponse(apiResponse: MLApiResponse): DetectionResult {
  return {
    violenceProbability: apiResponse.violence_probability ?? apiResponse.violenceProbability ?? 0,
    confidence: toConfidenceLevel(apiResponse.confidence),
    perClassScores: apiResponse.per_class_scores ? {
      nonViolence: apiResponse.per_class_scores.non_violence ?? 0,
      violence: apiResponse.per_class_scores.violence ?? 0,
    } : undefined,
    prediction: apiResponse.prediction,
    inferenceTimeMs: apiResponse.inference_time_ms ?? apiResponse.inferenceTimeMs,
    backend: apiResponse.backend,
    videoMetadata: apiResponse.video_metadata ? {
      filename: apiResponse.video_metadata.filename,
      durationSeconds: apiResponse.video_metadata.duration_seconds,
      fps: apiResponse.video_metadata.fps,
      resolution: apiResponse.video_metadata.resolution,
      totalFrames: apiResponse.video_metadata.total_frames,
    } : undefined,
    timing: apiResponse.timing ? {
      extractionMs: apiResponse.timing.extraction_ms,
      inferenceMs: apiResponse.timing.inference_ms,
      totalMs: apiResponse.timing.total_ms,
    } : undefined,
  };
}

/**
 * Upload video with streaming progress using Server-Sent Events
 * Provides real-time feedback during frame extraction and inference
 */
export async function uploadWithStreamingProgress(
  file: File,
  onProgress: (update: StreamProgressUpdate) => void
): Promise<DetectionResult> {
  const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8003/api';
  const formData = new FormData();
  formData.append('video', file);

  return new Promise((resolve, reject) => {
    fetch(`${ML_SERVICE_URL}/detect_stream`, {
      method: 'POST',
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new ApiError(response.status, `Upload failed: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) as StreamProgressUpdate;
                  onProgress(data);

                  if (data.type === 'result' && data.data) {
                    // Transform snake_case API response to camelCase frontend format
                    const transformedResult = transformMLResponse(data.data);
                    resolve(transformedResult);
                  } else if (data.type === 'error') {
                    reject(new Error(data.message || 'Processing failed'));
                  }
                } catch (e) {
                  console.error('Failed to parse SSE event:', e);
                }
              }
            }
          }
        };

        processStream().catch(reject);
      })
      .catch(reject);
  });
}

/**
 * Fast detection using optimized TFLite model
 * Returns results with detailed timing information
 */
export async function uploadVideoFast(file: File): Promise<DetectionResult> {
  const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8003/api';
  const formData = new FormData();
  formData.append('video', file);

  const response = await fetch(`${ML_SERVICE_URL}/detect_fast`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Fast detection failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Model Abstraction Layer
 * Supports multiple AI models for A/B testing and gradual migration
 */
export interface DetectionModel {
  id: string;
  name: string;
  version: string;
  endpoint: string;
  type: 'legacy' | 'modern' | 'experimental';
  preprocess?: (frames: string[]) => string[];
  postprocess?: (results: DetectionResult[]) => DetectionResult[];
}

/**
 * Available detection models
 * Add new models here without changing calling code
 */
export const DETECTION_MODELS: Record<string, DetectionModel> = {
  'vgg19-legacy': {
    id: 'vgg19-legacy',
    name: 'VGG19 + Bi-LSTM',
    version: '1.0',
    endpoint: '/api/detect/video',
    type: 'legacy',
  },
  'modern-model': {
    id: 'modern-model',
    name: 'Modern Architecture',
    version: '2.0',
    endpoint: '/api/v2/detect',
    type: 'modern',
  },
  'experimental': {
    id: 'experimental',
    name: 'Experimental Model',
    version: '3.0-beta',
    endpoint: '/api/v3/detect',
    type: 'experimental',
  },
};

/**
 * Get active model (can be configured via env or user preference)
 */
export function getActiveModel(): DetectionModel {
  const modelId = process.env.NEXT_PUBLIC_ACTIVE_MODEL || 'vgg19-legacy';
  return DETECTION_MODELS[modelId] || DETECTION_MODELS['vgg19-legacy'];
}

export function createWebSocketConnection(url?: string): WebSocket {
  const wsUrl = url || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws/live';
  return new WebSocket(wsUrl);
}

export async function detectViolenceBatch(
  imageDataArray: string[]
): Promise<{ violenceProbability: number }[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/detect/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images: imageDataArray,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Detection failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.results) {
      throw new Error(data.error || 'Detection failed');
    }

    return data.results;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function detectViolenceSingle(
  imageData: string
): Promise<{ violenceProbability: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/detect/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
      }),
    });

    if (!response.ok) {
      throw new ApiError(response.status, `Detection failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.result) {
      throw new Error(data.error || 'Detection failed');
    }

    return data.result;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
