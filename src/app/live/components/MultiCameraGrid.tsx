'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { GridControls } from './GridControls';
import { CameraCell } from './CameraCell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface CameraData {
  id: string;
  label: string;
  violenceProb: number;
  imageData?: string;
  isActive: boolean;
}

interface CameraRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export function MultiCameraGrid() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [detectedRegions, setDetectedRegions] = useState<CameraRegion[] | null>(null);
  const [useAutoDetection, setUseAutoDetection] = useState(true);
  const [detectionStatus, setDetectionStatus] = useState<string>('');

  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);  // Track recording state with ref to avoid closure issues
  const frameBuffersRef = useRef<Map<number, string[]>>(new Map());  // Frame buffers for each camera
  const frameCounterRef = useRef(0);  // Counter for frame collection

  const totalCameras = rows * cols;

  // Initialize camera grid
  useEffect(() => {
    const newCameras: CameraData[] = [];
    for (let i = 0; i < totalCameras; i++) {
      newCameras.push({
        id: `camera-${i}`,
        label: `Camera ${i + 1}`,
        violenceProb: 0,
        isActive: false,
      });
    }
    setCameras(newCameras);
  }, [totalCameras]);

  const handleGridChange = (newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
  };

  const detectCameraGrid = async (canvas: HTMLCanvasElement): Promise<{ regions: CameraRegion[]; gridRows: number; gridCols: number } | null> => {
    try {
      setDetectionStatus('🔍 Detecting camera grid...');
      console.log('[GridDetection] Starting detection...');
      console.log('[GridDetection] Canvas size:', canvas.width, 'x', canvas.height);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });
      console.log('[GridDetection] Blob created, size:', blob.size, 'bytes');

      // Send to GridDetector backend
      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.jpg');

      console.log('[GridDetection] Sending request to http://localhost:8004/api/detect-grid');
      const response = await fetch('http://localhost:8004/api/detect-grid', {
        method: 'POST',
        body: formData,
      });

      console.log('[GridDetection] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GridDetection] Response error:', errorText);
        throw new Error(`Grid detection failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[GridDetection] Result:', result);

      if (result.success && result.regions && result.regions.length > 0) {
        const statusMsg = `✅ Detected ${result.regions.length} cameras (${result.grid_layout[0]}×${result.grid_layout[1]} grid, confidence: ${(result.confidence * 100).toFixed(0)}%)`;
        console.log('[GridDetection]', statusMsg);
        setDetectionStatus(statusMsg);

        // Update grid dimensions
        setRows(result.grid_layout[0]);
        setCols(result.grid_layout[1]);

        return {
          regions: result.regions,
          gridRows: result.grid_layout[0],
          gridCols: result.grid_layout[1],
        };
      } else {
        console.warn('[GridDetection] Detection failed or no regions found');
        setDetectionStatus('⚠️ Auto-detection failed. Using manual grid.');
        return null;
      }
    } catch (err) {
      console.error('[GridDetection] Error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setDetectionStatus(`❌ Auto-detection error: ${errorMsg}. Using manual grid.`);
      return null;
    }
  };

  const startScreenRecording = async () => {
    try {
      setError(null);

      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      screenStreamRef.current = stream;

      // Create video element to capture screen
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      videoRef.current = video;

      // Wait for video to load
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve(null);
        };
      });

      // Create canvas for segmentation
      const canvas = document.createElement('canvas');
      canvasRef.current = canvas;

      // Capture first frame for grid detection
      const ctx = canvas.getContext('2d');
      let detectedGridRows = rows;
      let detectedGridCols = cols;

      if (ctx && useAutoDetection) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        // Try auto-detection
        const detectionResult = await detectCameraGrid(canvas);
        if (detectionResult) {
          setDetectedRegions(detectionResult.regions);
          detectedGridRows = detectionResult.gridRows;
          detectedGridCols = detectionResult.gridCols;
        }
      }

      setIsRecording(true);
      isRecordingRef.current = true;  // Set ref immediately for closure access

      // Mark all cameras as active using the detected grid dimensions
      const currentTotal = detectedGridRows * detectedGridCols;
      console.log(`[Recording] Initializing ${currentTotal} cameras (${detectedGridRows}x${detectedGridCols})`);
      const activeCameras: CameraData[] = [];
      for (let i = 0; i < currentTotal; i++) {
        activeCameras.push({
          id: `camera-${i}`,
          label: `Camera ${i + 1}`,
          violenceProb: 0,
          isActive: true,
          imageData: undefined,
        });
      }
      setCameras(activeCameras);

      // Start segmentation and detection
      startSegmentationLoop();
      startDetectionLoop();

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopScreenRecording();
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Screen recording failed';
      setError(errorMessage);
      console.error('Failed to start screen recording:', err);
    }
  };

  const startSegmentationLoop = useCallback(() => {
    const segmentFrame = () => {
      if (!isRecordingRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw full screen to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Segment into grid cells
      const newCameraData: string[] = [];

      // Use detected regions if available, otherwise fallback to manual grid
      if (detectedRegions && detectedRegions.length > 0) {
        // Auto-detected regions
        for (const region of detectedRegions) {
          // Create temporary canvas for this region
          const cellCanvas = document.createElement('canvas');
          cellCanvas.width = 224; // Model input size
          cellCanvas.height = 224;
          const cellCtx = cellCanvas.getContext('2d');

          if (cellCtx) {
            // Draw this camera region scaled to 224x224
            cellCtx.drawImage(
              canvas,
              region.x,
              region.y,
              region.width,
              region.height,
              0,
              0,
              224,
              224
            );

            // Convert to data URL
            const imageData = cellCanvas.toDataURL('image/jpeg', 0.7);
            newCameraData.push(imageData);
          }
        }
      } else {
        // Manual grid segmentation (fallback)
        const cellWidth = canvas.width / cols;
        const cellHeight = canvas.height / rows;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * cellWidth;
            const y = row * cellHeight;

            // Create temporary canvas for this cell
            const cellCanvas = document.createElement('canvas');
            cellCanvas.width = 224; // Model input size
            cellCanvas.height = 224;
            const cellCtx = cellCanvas.getContext('2d');

            if (cellCtx) {
              // Draw this cell region scaled to 224x224
              cellCtx.drawImage(
                canvas,
                x,
                y,
                cellWidth,
                cellHeight,
                0,
                0,
                224,
                224
              );

              // Convert to data URL
              const imageData = cellCanvas.toDataURL('image/jpeg', 0.7);
              newCameraData.push(imageData);
            }
          }
        }
      }

      // Update camera images
      setCameras((prev) =>
        prev.map((cam, index) => ({
          ...cam,
          imageData: newCameraData[index],
        }))
      );

      // Collect frames for ML detection (every 3rd frame to avoid too much data)
      frameCounterRef.current++;
      if (frameCounterRef.current % 3 === 0) {
        // Add frames to buffers for each camera
        newCameraData.forEach((frameData, index) => {
          if (!frameBuffersRef.current.has(index)) {
            frameBuffersRef.current.set(index, []);
          }
          const buffer = frameBuffersRef.current.get(index)!;

          // Extract base64 data without the data URL prefix
          const base64Data = frameData.split(',')[1] || frameData;
          buffer.push(base64Data);

          // Keep only the latest 20 frames
          if (buffer.length > 20) {
            buffer.shift();
          }
        });
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(segmentFrame);
    };

    segmentFrame();
  }, [rows, cols, detectedRegions]);

  const startDetectionLoop = () => {
    // Run detection every 2 seconds (throttled for performance)
    detectionIntervalRef.current = setInterval(() => {
      performDetection();
    }, 2000);
  };

  const performDetection = async () => {
    try {
      // Check if we have enough frames for any camera
      const camerasWithFrames: { index: number; frames: string[] }[] = [];

      frameBuffersRef.current.forEach((buffer, index) => {
        if (buffer.length >= 20) {
          camerasWithFrames.push({ index, frames: buffer.slice(-20) });
        }
      });

      if (camerasWithFrames.length === 0) {
        console.log('[Detection] No cameras with enough frames yet (need 20 frames)');
        return;
      }

      console.log(`[Detection] Processing ${camerasWithFrames.length} cameras with ML service`);

      // Send detection requests for each camera with enough frames
      const detectionPromises = camerasWithFrames.map(async ({ index, frames }) => {
        try {
          const mlServiceUrl = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8003/api';
          const response = await fetch(`${mlServiceUrl}/detect_live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ frames }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Detection] Camera ${index} error:`, errorText);
            return { index, probability: 0, error: true };
          }

          const result = await response.json();
          console.log(`[Detection] Camera ${index}: ${(result.violence_probability * 100).toFixed(1)}% violence`);
          return {
            index,
            probability: result.violence_probability * 100,
            error: false,
          };
        } catch (err) {
          console.error(`[Detection] Camera ${index} request failed:`, err);
          return { index, probability: 0, error: true };
        }
      });

      const results = await Promise.all(detectionPromises);

      // Update camera probabilities
      setCameras((prev) =>
        prev.map((cam, idx) => {
          const result = results.find((r) => r.index === idx);
          if (result && !result.error) {
            return { ...cam, violenceProb: result.probability };
          }
          return cam;
        })
      );
    } catch (err) {
      console.error('Detection failed:', err);
      // Don't show error to user, just log it
      // Detection will retry on next interval
    }
  };

  const stopScreenRecording = () => {
    setIsRecording(false);
    isRecordingRef.current = false;  // Stop the segmentation loop

    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Clear animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clear detection interval
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Clear frame buffers
    frameBuffersRef.current.clear();
    frameCounterRef.current = 0;

    // Reset cameras to inactive
    setCameras((prev) =>
      prev.map((cam) => ({
        ...cam,
        isActive: false,
        violenceProb: 0,
        imageData: undefined,
      }))
    );

    // Clean up video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopScreenRecording();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Grid Controls */}
      <GridControls
        rows={rows}
        cols={cols}
        onGridChange={handleGridChange}
        isRecording={isRecording}
        onStartRecording={startScreenRecording}
        onStopRecording={stopScreenRecording}
        totalCameras={totalCameras}
      />

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="border-[var(--danger-red)]">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Detection Status Display */}
      {detectionStatus && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertDescription className="text-sm font-medium">
            {detectionStatus}
          </AlertDescription>
        </Alert>
      )}

      {/* Auto-Detection Toggle */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useAutoDetection}
            onChange={(e) => setUseAutoDetection(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Auto-detect camera grid (recommended for CCTV split-screens)
          </span>
        </label>
      </div>

      {/* Camera Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {cameras.map((camera) => (
          <CameraCell
            key={camera.id}
            id={camera.id}
            label={camera.label}
            violenceProb={camera.violenceProb}
            imageData={camera.imageData}
            isActive={camera.isActive}
          />
        ))}
      </div>

      {/* Performance Note */}
      {isRecording && totalCameras > 16 && (
        <Alert className="border-yellow-500/50 bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-500">
            Monitoring {totalCameras} cameras. Detection is throttled to 1 request per 2 seconds per
            camera for optimal performance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
