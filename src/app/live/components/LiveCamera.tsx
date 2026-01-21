'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import {
  Video,
  Square,
  AlertCircle,
  Activity,
  Clock,
  Brain,
  Shield,
  AlertTriangle,
  Zap,
  BarChart3,
  Cpu,
  Play,
  Monitor,
  Camera,
  Server,
  Smartphone,
  Settings,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import type { Alert as AlertType } from '@/types/detection';
import {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { TextureButton } from '@/components/ui/texture-button';
import { useSimpleFrameEncoder } from '@/hooks/useFrameEncoder';

// TensorFlow.js type definitions for browser-side pose detection
interface TensorFlowBackend {
  setBackend: (backend: string) => Promise<boolean>;
  ready: () => Promise<void>;
}

interface PoseDetectionModel {
  SupportedModels: {
    MoveNet: string;
  };
  movenet: {
    modelType: {
      MULTIPOSE_LIGHTNING: string;
    };
  };
  createDetector: (model: string, config: PoseDetectorConfig) => Promise<PoseDetector>;
}

interface PoseDetectorConfig {
  modelType: string;
  enableSmoothing: boolean;
  minPoseScore: number;
}

interface PoseDetector {
  estimatePoses: (video: HTMLVideoElement) => Promise<DetectedPose[]>;
}

interface DetectedPose {
  keypoints: PoseKeypoint[];
  score?: number;
}

declare global {
  interface Window {
    tf: TensorFlowBackend;
    poseDetection: PoseDetectionModel;
  }
}

type DetectionMode = 'browser-pose' | 'server-pose' | 'screen-share' | 'vastai-realtime';

interface AnalysisResult {
  violence_probability: number;
  confidence: string;
  per_class_scores: {
    non_violence: number;
    violence: number;
  };
  prediction: string;
  inference_time_ms: number;
  backend: string;
}

interface SessionStats {
  totalAnalyses: number;
  avgInferenceTime: number;
  maxViolenceProb: number;
  avgViolenceProb: number;
  detectionRate: number;
  sessionDuration: number;
}

interface PoseKeypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

// Response from Vast.ai WebSocket server
interface VastaiResponse {
  error?: string;
  type?: string;
  t_total?: number;
  violence_score?: number;
  violence?: boolean;
  all_skeletons?: number[][][];
  skeletons?: number[][][];
  num_detected?: number;
}

export function LiveCamera() {
  const { isRTL, locale } = useLanguage();
  const { encode: encodeFrame } = useSimpleFrameEncoder();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartRef = useRef<number>(0);
  const isDetectingRef = useRef<boolean>(false);
  const poseDetectorRef = useRef<PoseDetector | null>(null);
  const vastaiWsRef = useRef<WebSocket | null>(null);
  const vastaiFrameTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [detectionMode, setDetectionMode] = useState<DetectionMode>('vastai-realtime');
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [violenceProb, setViolenceProb] = useState(0);
  const [nonViolenceProb, setNonViolenceProb] = useState(100);
  const [prediction, setPrediction] = useState<string>('none');
  const [inferenceTime, setInferenceTime] = useState(0);
  const [backend, setBackend] = useState<string>('TFJS');
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFirstAnalysis, setHasFirstAnalysis] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [poseCount, setPoseCount] = useState(0);
  const [modelLoading, setModelLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    totalAnalyses: 0,
    avgInferenceTime: 0,
    maxViolenceProb: 0,
    avgViolenceProb: 0,
    detectionRate: 0,
    sessionDuration: 0,
  });
  const frameBuffer = useRef<string[]>([]);
  const poseBuffer = useRef<PoseKeypoint[][]>([]);
  const analysisHistory = useRef<number[]>([]);
  const inferenceHistory = useRef<number[]>([]);

  const ML_SERVICE_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8003/api';
  const VASTAI_WS_URL = process.env.NEXT_PUBLIC_VASTAI_WS_URL || 'ws://136.59.129.136:34788/ws';

  const t = {
    liveCameraFeed: locale === 'ar' ? 'بث الكاميرا المباشر' : 'Live Camera Feed',
    live: locale === 'ar' ? 'مباشر' : 'LIVE',
    processing: locale === 'ar' ? 'جاري المعالجة...' : 'Processing...',
    active: locale === 'ar' ? 'نشط' : 'Active',
    bufferingFrames: locale === 'ar' ? 'تخزين الإطارات...' : 'Buffering frames...',
    violenceDetected: locale === 'ar' ? 'تم اكتشاف عنف' : 'VIOLENCE DETECTED',
    safeNoViolence: locale === 'ar' ? 'آمن - لا عنف' : 'SAFE - NO VIOLENCE',
    violence: locale === 'ar' ? 'عنف' : 'Violence',
    nonViolence: locale === 'ar' ? 'غير عنف' : 'Non-Violence',
    startDetection: locale === 'ar' ? 'بدء الكشف' : 'Start Detection',
    stopDetection: locale === 'ar' ? 'إيقاف الكشف' : 'Stop Detection',
    sessionStatistics: locale === 'ar' ? 'إحصائيات الجلسة' : 'Session Statistics',
    totalAnalyses: locale === 'ar' ? 'إجمالي التحليلات' : 'Total Analyses',
    avgInference: locale === 'ar' ? 'متوسط الاستنتاج' : 'Avg Inference',
    maxViolence: locale === 'ar' ? 'أقصى عنف' : 'Max Violence',
    avgViolence: locale === 'ar' ? 'متوسط العنف' : 'Avg Violence',
    detectionRate: locale === 'ar' ? 'معدل الكشف' : 'Detection Rate',
    sessionTime: locale === 'ar' ? 'وقت الجلسة' : 'Session Time',
    recentAlerts: locale === 'ar' ? 'التنبيهات الأخيرة' : 'Recent Alerts',
    confidence: locale === 'ar' ? 'الثقة' : 'Confidence',
    noCameraFound: locale === 'ar' ? 'لم يتم العثور على كاميرا' : 'No camera found',
    cameraPermissionDenied: locale === 'ar' ? 'تم رفض إذن الكاميرا' : 'Camera permission denied',
    detectionMode: locale === 'ar' ? 'وضع الكشف' : 'Detection Mode',
    browserPose: locale === 'ar' ? 'وضعية المتصفح' : 'Browser Pose',
    serverPose: locale === 'ar' ? 'وضعية الخادم' : 'Server Pose',
    screenShare: locale === 'ar' ? 'مشاركة الشاشة' : 'Screen Share',
    browserPoseDesc: locale === 'ar' ? 'كشف الوضعية في المتصفح باستخدام TensorFlow.js' : 'In-browser pose detection using TensorFlow.js',
    serverPoseDesc: locale === 'ar' ? 'إرسال الإطارات إلى خادم ML للتحليل' : 'Send frames to ML server for analysis',
    screenShareDesc: locale === 'ar' ? 'تحليل مشاركة الشاشة أو نافذة' : 'Analyze shared screen or window',
    loadingModel: locale === 'ar' ? 'جاري تحميل النموذج...' : 'Loading model...',
    posesDetected: locale === 'ar' ? 'أوضاع مكتشفة' : 'poses detected',
    vastaiRealtime: locale === 'ar' ? 'الوقت الفعلي (Vast.ai)' : 'Real-time (Vast.ai)',
    vastaiRealtimeDesc: locale === 'ar' ? 'كشف فوري عبر WebSocket مع خادم GPU مخصص' : 'Instant detection via WebSocket with dedicated GPU server',
    wsConnected: locale === 'ar' ? 'متصل' : 'Connected',
    wsDisconnected: locale === 'ar' ? 'غير متصل' : 'Disconnected',
  };

  const detectionModes = [
    {
      id: 'vastai-realtime' as DetectionMode,
      name: t.vastaiRealtime,
      description: t.vastaiRealtimeDesc,
      icon: Zap,
      color: 'from-yellow-500 to-orange-600',
      recommended: true,
    },
    {
      id: 'browser-pose' as DetectionMode,
      name: t.browserPose,
      description: t.browserPoseDesc,
      icon: Smartphone,
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 'server-pose' as DetectionMode,
      name: t.serverPose,
      description: t.serverPoseDesc,
      icon: Server,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'screen-share' as DetectionMode,
      name: t.screenShare,
      description: t.screenShareDesc,
      icon: Monitor,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  // Load TensorFlow.js pose detection model
  const loadPoseModel = async () => {
    if (poseDetectorRef.current) return;

    setModelLoading(true);
    try {
      // Dynamically load TensorFlow.js
      if (!window.tf) {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
      }
      if (!window.poseDetection) {
        await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.0/dist/pose-detection.min.js');
      }

      // Wait for scripts to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set backend to WebGL for better performance
      await window.tf.setBackend('webgl');
      await window.tf.ready();

      // Create detector with MoveNet MultiPose Lightning
      const model = window.poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: window.poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
        enableSmoothing: true,
        minPoseScore: 0.25,
      };

      poseDetectorRef.current = await window.poseDetection.createDetector(model, detectorConfig);
      setBackend('TFJS-WebGL');
    } catch (err) {
      console.error('Failed to load pose model:', err);
      setError('Failed to load pose detection model');
    } finally {
      setModelLoading(false);
    }
  };

  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const updateSessionStats = (newViolenceProb: number, newInferenceTime: number) => {
    analysisHistory.current.push(newViolenceProb);
    inferenceHistory.current.push(newInferenceTime);

    const totalAnalyses = analysisHistory.current.length;
    const avgViolenceProb = analysisHistory.current.reduce((a, b) => a + b, 0) / totalAnalyses;
    const avgInferenceTime = inferenceHistory.current.reduce((a, b) => a + b, 0) / totalAnalyses;
    const maxViolenceProb = Math.max(...analysisHistory.current);
    const detectionRate = (analysisHistory.current.filter((p) => p > 50).length / totalAnalyses) * 100;
    const sessionDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);

    setSessionStats({
      totalAnalyses,
      avgInferenceTime: Math.round(avgInferenceTime),
      maxViolenceProb: Math.round(maxViolenceProb),
      avgViolenceProb: Math.round(avgViolenceProb),
      detectionRate: Math.round(detectionRate),
      sessionDuration,
    });
  };

  // Browser-side pose detection and violence analysis
  const detectPosesInBrowser = async () => {
    if (!poseDetectorRef.current || !videoRef.current || isAnalyzing) return;

    const startTime = performance.now();
    setIsAnalyzing(true);

    try {
      const poses = await poseDetectorRef.current.estimatePoses(videoRef.current);
      const inferenceMs = performance.now() - startTime;

      setPoseCount(poses.length);
      setInferenceTime(inferenceMs);
      setHasFirstAnalysis(true);
      setAnalysisCount((prev) => prev + 1);

      // Draw poses on overlay canvas
      drawPoses(poses);

      // Analyze poses for violence (simplified - check for aggressive postures)
      const violenceScore = analyzePosturesForViolence(poses);
      const violencePct = Math.round(violenceScore * 100);
      const nonViolencePct = 100 - violencePct;

      setViolenceProb(violencePct);
      setNonViolenceProb(nonViolencePct);
      setPrediction(violencePct > 50 ? 'violence' : 'non_violence');

      updateSessionStats(violencePct, inferenceMs);

      if (violencePct > 85) {
        handleViolenceDetected(violenceScore);
      }
    } catch (err) {
      // GAP-ERR-004 Fix: Log detailed error and track failures
      const errorMessage = err instanceof Error ? err.message : 'Unknown pose detection error';
      console.error('[Pose] Detection failed:', errorMessage);
      // Optionally notify user after repeated failures (not implemented to avoid noise)
    } finally {
      setIsAnalyzing(false);
    }
  };

  const drawPoses = (poses: DetectedPose[]) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const connections = [
      ['nose', 'left_eye'], ['nose', 'right_eye'],
      ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
      ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
      ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
      ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle'],
    ];

    poses.forEach((pose, poseIndex) => {
      const keypoints = pose.keypoints;
      const color = poseIndex === 0 ? '#00ff00' : '#ff6600';

      // Draw connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      connections.forEach(([start, end]) => {
        const startKp = keypoints.find((kp: PoseKeypoint) => kp.name === start);
        const endKp = keypoints.find((kp: PoseKeypoint) => kp.name === end);
        if (startKp && endKp && startKp.score > 0.3 && endKp.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(startKp.x, startKp.y);
          ctx.lineTo(endKp.x, endKp.y);
          ctx.stroke();
        }
      });

      // Draw keypoints
      keypoints.forEach((kp: PoseKeypoint) => {
        if (kp.score > 0.3) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }
      });
    });
  };

  const analyzePosturesForViolence = (poses: DetectedPose[]): number => {
    if (poses.length === 0) return 0;
    if (poses.length === 1) return 0.1; // Single person, low violence probability

    let violenceScore = 0;

    // Check for proximity between people (potential confrontation)
    for (let i = 0; i < poses.length; i++) {
      for (let j = i + 1; j < poses.length; j++) {
        const pose1 = poses[i].keypoints;
        const pose2 = poses[j].keypoints;

        const nose1 = pose1.find((kp: PoseKeypoint) => kp.name === 'nose');
        const nose2 = pose2.find((kp: PoseKeypoint) => kp.name === 'nose');

        if (nose1 && nose2 && nose1.score > 0.3 && nose2.score > 0.3) {
          const distance = Math.sqrt(
            Math.pow(nose1.x - nose2.x, 2) + Math.pow(nose1.y - nose2.y, 2)
          );

          // If people are very close, increase violence probability
          if (distance < 100) violenceScore += 0.3;
          else if (distance < 200) violenceScore += 0.1;
        }

        // Check for raised arms (potential punching)
        const checkRaisedArms = (keypoints: PoseKeypoint[]) => {
          const shoulder = keypoints.find((kp: PoseKeypoint) => kp.name === 'left_shoulder' || kp.name === 'right_shoulder');
          const wrist = keypoints.find((kp: PoseKeypoint) => kp.name === 'left_wrist' || kp.name === 'right_wrist');
          if (shoulder && wrist && shoulder.score > 0.3 && wrist.score > 0.3) {
            if (wrist.y < shoulder.y - 50) return true; // Arm raised above shoulder
          }
          return false;
        };

        if (checkRaisedArms(pose1) || checkRaisedArms(pose2)) {
          violenceScore += 0.2;
        }
      }
    }

    return Math.min(violenceScore, 1);
  };

  // Vast.ai WebSocket connection for real-time detection
  const connectVastaiWebSocket = () => {
    return new Promise<void>((resolve, reject) => {
      if (vastaiWsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      console.log('[Vast.ai] Connecting to WebSocket:', VASTAI_WS_URL);
      const ws = new WebSocket(VASTAI_WS_URL);

      ws.onopen = () => {
        console.log('[Vast.ai] WebSocket connected');
        setWsConnected(true);
        setBackend('Vast.ai GPU');
        vastaiWsRef.current = ws;
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVastaiResponse(data);
        } catch (err) {
          // GAP-ERR-001 Fix: Log with details and notify user of malformed response
          const errorMessage = err instanceof Error ? err.message : 'Unknown parse error';
          console.error('[Vast.ai] Failed to parse response:', errorMessage, 'Raw:', event.data?.substring(0, 100));
          // Don't set error state here to avoid disrupting detection, just log
        }
      };

      ws.onerror = (err) => {
        console.error('[Vast.ai] WebSocket error:', err);
        setWsConnected(false);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        console.log('[Vast.ai] WebSocket closed');
        setWsConnected(false);
        vastaiWsRef.current = null;
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  };

  const handleVastaiResponse = (data: VastaiResponse) => {
    if (data.error) {
      console.error('[Vast.ai] Error:', data.error);
      return;
    }

    // Skip non-result messages
    if (data.type !== 'result') {
      console.log('[Vast.ai] Non-result message:', data.type);
      return;
    }

    // Calculate latency from server timing
    const latency = data.t_total || 0;
    setWsLatency(latency);
    setInferenceTime(latency);

    // Update violence probabilities
    const violencePct = Math.round((data.violence_score || 0) * 100);
    const nonViolencePct = 100 - violencePct;

    setViolenceProb(violencePct);
    setNonViolenceProb(nonViolencePct);
    setPrediction(data.violence ? 'violence' : 'non_violence');
    setHasFirstAnalysis(true);
    setAnalysisCount((prev) => prev + 1);
    setIsAnalyzing(false);

    // Draw skeletons if provided (use all_skeletons for visualization in server mode)
    const skeletonsToShow = data.all_skeletons || data.skeletons || [];
    if (skeletonsToShow.length > 0) {
      drawVastaiSkeletons(skeletonsToShow);
    }
    setPoseCount(data.num_detected || skeletonsToShow.length);

    updateSessionStats(violencePct, latency);

    // Alert on high violence
    if (violencePct > 85) {
      handleViolenceDetected(violencePct / 100);
    }
  };

  const drawVastaiSkeletons = (skeletons: number[][][]) => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // COCO 17-keypoint skeleton connections
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4],  // Head
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],  // Arms
      [5, 11], [6, 12], [11, 12],  // Torso
      [11, 13], [13, 15], [12, 14], [14, 16]  // Legs
    ];

    const colors = ['#00ff00', '#ff6600', '#00ffff', '#ff00ff', '#ffff00'];

    skeletons.forEach((skeleton, poseIndex) => {
      const color = colors[poseIndex % colors.length];

      // Draw connections
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      connections.forEach(([i, j]) => {
        if (skeleton[i] && skeleton[j]) {
          const [x1, y1, c1] = skeleton[i];
          const [x2, y2, c2] = skeleton[j];
          if (c1 > 0.3 && c2 > 0.3) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      });

      // Draw keypoints
      skeleton.forEach((kp) => {
        if (kp && kp[2] > 0.3) {
          ctx.beginPath();
          ctx.arc(kp[0], kp[1], 5, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });
  };

  const sendFrameToVastai = () => {
    if (!vastaiWsRef.current || vastaiWsRef.current.readyState !== WebSocket.OPEN) return;
    if (!videoRef.current) return;
    if (isAnalyzing) return;

    const video = videoRef.current;

    setIsAnalyzing(true);

    // Use frame encoder hook for cleaner encoding (prepared for Web Worker offloading)
    const base64 = encodeFrame(video, 640, 480, 0.85);
    if (!base64) return;

    // Send to Vast.ai WebSocket
    vastaiWsRef.current.send(JSON.stringify({
      type: 'image',
      data: base64,
      width: 640,
      height: 480,
    }));
  };

  const startVastaiDetectionLoop = () => {
    // Send frames at ~15 FPS for real-time detection
    vastaiFrameTimerRef.current = setInterval(() => {
      if (!isDetectingRef.current) return;
      sendFrameToVastai();
    }, 66); // ~15 FPS
  };

  const disconnectVastaiWebSocket = () => {
    if (vastaiFrameTimerRef.current) {
      clearInterval(vastaiFrameTimerRef.current);
      vastaiFrameTimerRef.current = null;
    }
    if (vastaiWsRef.current) {
      vastaiWsRef.current.close();
      vastaiWsRef.current = null;
    }
    setWsConnected(false);
  };

  // Server-side analysis
  const analyzeFramesOnServer = async (frames: string[]) => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch(`${ML_SERVICE_URL}/detect_live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map((f) => f.split(',')[1]),
        }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result: AnalysisResult = await response.json();

      const violencePct = Math.round(result.violence_probability * 100);
      const nonViolencePct = Math.round(result.per_class_scores.non_violence * 100);

      setViolenceProb(violencePct);
      setNonViolenceProb(nonViolencePct);
      setPrediction(result.prediction);
      setInferenceTime(result.inference_time_ms);
      setBackend(result.backend || 'KERAS');
      setHasFirstAnalysis(true);
      setAnalysisCount((prev) => prev + 1);

      updateSessionStats(violencePct, result.inference_time_ms);

      if (violencePct > 85) {
        handleViolenceDetected(result.violence_probability);
      }
    } catch (err) {
      console.error('Server analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startDetection = async () => {
    try {
      setError(null);

      let stream: MediaStream;

      if (detectionMode === 'screen-share') {
        // Screen share mode
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
      } else {
        // Camera mode
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported');
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');

        if (cameras.length === 0) {
          throw new Error(t.noCameraFound);
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Load pose model if using browser pose detection
      if (detectionMode === 'browser-pose') {
        await loadPoseModel();
      }

      // Connect to Vast.ai WebSocket if using real-time mode
      if (detectionMode === 'vastai-realtime') {
        setModelLoading(true);
        try {
          await connectVastaiWebSocket();
        } catch (err) {
          // GAP-ERR-002 Fix: Distinguish between error types
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          const isTimeout = errorMessage.includes('timeout');
          const userMessage = isTimeout
            ? 'Connection to Vast.ai server timed out. Server may be unavailable.'
            : `Failed to connect to Vast.ai server: ${errorMessage}`;
          console.error('[Detection] WebSocket connection failed:', errorMessage);
          setError(userMessage);
          setModelLoading(false);
          return;
        }
        setModelLoading(false);
      }

      // Reset session
      sessionStartRef.current = Date.now();
      analysisHistory.current = [];
      inferenceHistory.current = [];
      frameBuffer.current = [];
      poseBuffer.current = [];
      setHasFirstAnalysis(false);
      setAnalysisCount(0);
      setViolenceProb(0);
      setNonViolenceProb(100);
      setPrediction('none');
      setInferenceTime(0);
      setPoseCount(0);
      setSessionStats({
        totalAnalyses: 0,
        avgInferenceTime: 0,
        maxViolenceProb: 0,
        avgViolenceProb: 0,
        detectionRate: 0,
        sessionDuration: 0,
      });

      setIsDetecting(true);
      isDetectingRef.current = true;

      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopDetection();
      });

      // Start appropriate detection loop
      if (detectionMode === 'browser-pose') {
        startBrowserPoseLoop();
      } else if (detectionMode === 'vastai-realtime') {
        startVastaiDetectionLoop();
      } else {
        startServerDetectionLoop();
      }
    } catch (err) {
      let errorMessage = 'Detection failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  const startBrowserPoseLoop = () => {
    // Run pose detection at ~15 FPS for smooth performance
    intervalRef.current = setInterval(() => {
      if (!isDetectingRef.current) return;
      detectPosesInBrowser();
    }, 66); // ~15 FPS
  };

  const startServerDetectionLoop = () => {
    const video = videoRef.current;
    if (!video) return;

    intervalRef.current = setInterval(() => {
      if (!isDetectingRef.current) return;

      // Use frame encoder hook for cleaner encoding (prepared for Web Worker offloading)
      const base64 = encodeFrame(video, 224, 224, 0.8);
      if (!base64) return;

      // Add data URL prefix for compatibility with analyzeFramesOnServer
      const imageData = `data:image/jpeg;base64,${base64}`;
      frameBuffer.current.push(imageData);

      if (frameBuffer.current.length === 20) {
        analyzeFramesOnServer(frameBuffer.current);
        frameBuffer.current = frameBuffer.current.slice(10);
      }
    }, 1000 / 30);
  };

  const handleViolenceDetected = (probability: number) => {
    const audio = new Audio('/alert-sound.mp3');
    // GAP-ERR-003 Fix: Handle audio play failures gracefully (user interaction required)
    audio.play().catch((err) => {
      // Most common cause: autoplay blocked by browser until user interaction
      console.warn('[Alert] Audio play failed (may need user interaction):', err?.message || 'Autoplay blocked');
    });

    const newAlert: AlertType = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US'),
      confidence: Math.round(probability * 100),
      violenceProbability: probability,
    };

    setAlerts((prev) => [newAlert, ...prev.slice(0, 4)]);
  };

  const stopDetection = () => {
    setIsDetecting(false);
    isDetectingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Disconnect Vast.ai WebSocket
    disconnectVastaiWebSocket();

    frameBuffer.current = [];
    poseBuffer.current = [];

    // Clear overlay canvas
    const canvas = overlayCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDetecting) {
      timer = setInterval(() => {
        const duration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
        setSessionStats((prev) => ({ ...prev, sessionDuration: duration }));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDetecting]);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  const violenceDetected = violenceProb > 50;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("space-y-6", isRTL && "text-right")}>
      {/* Detection Mode Selection */}
      {!isDetecting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <TextureCardStyled>
            <TextureCardHeader>
              <TextureCardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <Settings className="h-5 w-5 text-blue-400" />
                {t.detectionMode}
              </TextureCardTitle>
            </TextureCardHeader>
            <TextureSeparator />
            <TextureCardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {detectionModes.map((mode) => (
                  <motion.button
                    key={mode.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDetectionMode(mode.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-left",
                      detectionMode === mode.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-slate-800/30 hover:border-white/20"
                    )}
                  >
                    <div className={cn("flex items-center gap-3 mb-2", isRTL && "flex-row-reverse")}>
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", mode.color)}>
                        <mode.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white">{mode.name}</span>
                        {'recommended' in mode && mode.recommended && (
                          <span className="text-[10px] text-yellow-400 font-medium">⚡ RECOMMENDED</span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">{mode.description}</p>
                  </motion.button>
                ))}
              </div>
            </TextureCardContent>
          </TextureCardStyled>
        </motion.div>
      )}

      {/* Main Camera Card */}
      <TextureCardStyled>
        <TextureCardHeader>
          <TextureCardTitle className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              {detectionMode === 'screen-share' ? (
                <Monitor className="h-5 w-5 text-purple-400" />
              ) : (
                <Video className="h-5 w-5 text-blue-400" />
              )}
              {t.liveCameraFeed}
              {isDetecting && (
                <span className="px-2 py-0.5 text-[10px] bg-slate-700 rounded-full text-slate-300">
                  {detectionModes.find(m => m.id === detectionMode)?.name}
                </span>
              )}
            </span>
            {isDetecting && (
              <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full flex items-center gap-1">
                  <span className="animate-pulse">●</span> {t.live}
                </span>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-mono rounded-full flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(sessionStats.sessionDuration)}
                </span>
              </div>
            )}
          </TextureCardTitle>
        </TextureCardHeader>
        <TextureSeparator />
        <TextureCardContent className="pt-6 space-y-6">
          {/* Video Preview with Overlay */}
          <div
            className={cn(
              "relative rounded-xl overflow-hidden bg-slate-900",
              violenceDetected && isDetecting && hasFirstAnalysis && "ring-4 ring-red-500 animate-pulse"
            )}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full aspect-video bg-slate-900"
            />
            <canvas ref={canvasRef} width={640} height={480} className="hidden" />
            {/* Pose overlay canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Model Loading Indicator */}
            {modelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-white font-medium">{t.loadingModel}</p>
                </div>
              </div>
            )}

            {/* Analysis Status Indicator */}
            {isDetecting && !modelLoading && (
              <div className={cn("absolute top-4 flex flex-col gap-2", isRTL ? "left-4" : "right-4")}>
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1",
                    isAnalyzing ? 'bg-yellow-500/90 text-black' : 'bg-blue-500/90 text-white'
                  )}
                >
                  <Brain className="h-3 w-3" />
                  {isAnalyzing ? t.processing : `#${analysisCount} ${t.active}`}
                </motion.span>
                {(detectionMode === 'browser-pose' || detectionMode === 'vastai-realtime') && hasFirstAnalysis && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-2 py-1 bg-green-500/90 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Activity className="h-3 w-3" />
                    {poseCount} {t.posesDetected}
                  </motion.span>
                )}
                {detectionMode === 'vastai-realtime' && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "px-2 py-1 text-xs font-semibold rounded-lg flex items-center gap-1",
                      wsConnected ? "bg-yellow-500/90 text-black" : "bg-red-500/90 text-white"
                    )}
                  >
                    <Zap className="h-3 w-3" />
                    {wsConnected ? `${wsLatency.toFixed(0)}ms` : t.wsDisconnected}
                  </motion.span>
                )}
                {!hasFirstAnalysis && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-2 py-1 bg-purple-500/90 text-white text-xs font-semibold rounded-lg flex items-center gap-1 animate-pulse"
                  >
                    <Activity className="h-3 w-3" />
                    {t.bufferingFrames}
                  </motion.span>
                )}
              </div>
            )}

            {/* Large Status Indicator */}
            <AnimatePresence>
              {isDetecting && hasFirstAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn("absolute top-4", isRTL ? "right-4" : "left-4")}
                >
                  <div
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-lg shadow-lg",
                      violenceProb > 50
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white animate-pulse border border-red-400'
                        : 'bg-gradient-to-r from-green-600 to-green-500 text-white border border-green-400'
                    )}
                  >
                    {violenceProb > 50 ? (
                      <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <AlertTriangle className="h-5 w-5" />
                        {t.violenceDetected}
                      </span>
                    ) : (
                      <span className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Shield className="h-5 w-5" />
                        {t.safeNoViolence}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Real-time Analysis Overlay */}
            <AnimatePresence>
              {isDetecting && hasFirstAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-4 left-4 right-4"
                >
                  <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className={cn("flex items-center gap-1 text-red-400 text-xs font-medium", isRTL && "flex-row-reverse")}>
                          <AlertTriangle className="h-3 w-3" />
                          {t.violence}
                        </div>
                        <div className="text-xl font-bold text-red-400">{violenceProb}%</div>
                        <Progress value={violenceProb} className="h-1.5 bg-slate-700" />
                      </div>
                      <div className="space-y-1">
                        <div className={cn("flex items-center gap-1 text-green-400 text-xs font-medium", isRTL && "flex-row-reverse")}>
                          <Shield className="h-3 w-3" />
                          {t.nonViolence}
                        </div>
                        <div className="text-xl font-bold text-green-400">{nonViolenceProb}%</div>
                        <Progress value={nonViolenceProb} className="h-1.5 bg-slate-700" />
                      </div>
                    </div>

                    <div className={cn("flex items-center justify-between text-xs", isRTL && "flex-row-reverse")}>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-lg font-semibold",
                          prediction === 'violence'
                            ? 'border border-red-500/30 text-red-400 bg-red-500/10'
                            : 'border border-green-500/30 text-green-400 bg-green-500/10'
                        )}
                      >
                        {prediction === 'violence' ? t.violence.toUpperCase() : 'SAFE'}
                      </span>
                      <div className={cn("flex items-center gap-3 text-slate-400", isRTL && "flex-row-reverse")}>
                        <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                          <Zap className="h-3 w-3 text-yellow-400" />
                          {inferenceTime.toFixed(0)}ms
                        </span>
                        <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                          <Cpu className="h-3 w-3 text-purple-400" />
                          {backend}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Placeholder when not detecting */}
            {!isDetecting && !modelLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="text-center">
                  {detectionMode === 'screen-share' ? (
                    <Monitor className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  ) : (
                    <Camera className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  )}
                  <p className="text-slate-400">{t.startDetection}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p className="flex-1">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
            {!isDetecting ? (
              <TextureButton
                size="lg"
                variant="accent"
                onClick={startDetection}
                disabled={modelLoading}
                className="flex-1"
              >
                <Play className={cn("h-5 w-5", isRTL ? "ml-2" : "mr-2")} />
                {t.startDetection}
              </TextureButton>
            ) : (
              <TextureButton
                size="lg"
                variant="destructive"
                onClick={stopDetection}
                className="flex-1"
              >
                <Square className={cn("h-5 w-5", isRTL ? "ml-2" : "mr-2")} />
                {t.stopDetection}
              </TextureButton>
            )}
          </div>
        </TextureCardContent>
      </TextureCardStyled>

      {/* Session Statistics */}
      <AnimatePresence>
        {isDetecting && sessionStats.totalAnalyses > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TextureCardStyled>
              <TextureCardHeader>
                <TextureCardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  {t.sessionStatistics}
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureSeparator />
              <TextureCardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: t.totalAnalyses, value: sessionStats.totalAnalyses, color: 'text-white' },
                    { label: t.avgInference, value: `${sessionStats.avgInferenceTime}ms`, color: 'text-blue-400' },
                    { label: t.maxViolence, value: `${sessionStats.maxViolenceProb}%`, color: 'text-red-400' },
                    { label: t.avgViolence, value: `${sessionStats.avgViolenceProb}%`, color: 'text-orange-400' },
                    { label: t.detectionRate, value: `${sessionStats.detectionRate}%`, color: 'text-yellow-400' },
                    { label: t.sessionTime, value: formatDuration(sessionStats.sessionDuration), color: 'text-purple-400' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-slate-800/50 rounded-xl p-3"
                    >
                      <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
                      <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
                    </motion.div>
                  ))}
                </div>
              </TextureCardContent>
            </TextureCardStyled>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert History */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TextureCardStyled className="border-red-500/20">
              <TextureCardHeader>
                <TextureCardTitle className={cn("flex items-center gap-2 text-red-400", isRTL && "flex-row-reverse")}>
                  <AlertCircle className="h-5 w-5" />
                  {t.recentAlerts} ({alerts.length})
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureSeparator />
              <TextureCardContent className="pt-6 space-y-2">
                {alerts.map((alert, i) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                  >
                    <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-400 font-semibold text-sm">{t.violenceDetected}</p>
                      <p className="text-slate-400 text-xs">
                        {alert.timestamp} - {t.confidence}: {alert.confidence}%
                      </p>
                    </div>
                  </motion.div>
                ))}
              </TextureCardContent>
            </TextureCardStyled>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
