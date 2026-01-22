'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Monitor,
  Upload,
  Camera,
  Play,
  Square,
  Zap,
  Server,
  Smartphone,
  Grid3X3,
  AlertTriangle,
  Shield,
  Activity,
  Clock,
  Eye,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronRight,
  Cpu,
  Wifi,
  Brain,
  Target,
  TrendingUp,
  FileVideo,
  X,
} from 'lucide-react';
import {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { TextureButton } from '@/components/ui/texture-button';
import { cn } from '@/lib/utils';
import {
  findOrCreateCamera,
  setCameraStatus,
  getOrCreateDefaultLocation,
  createIncidentWithRecording,
  uploadIncidentVideo,
  captureVideoFrame,
  CameraSourceType,
  type Camera as CameraRecord,
  type Location,
} from '@/hooks/useSupabase';
import { useDetectionSettings } from '@/hooks/useDetectionSettings';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useAuth } from '@/contexts/AuthContext';

// Types
type SourceType = 'webcam' | 'screen' | 'upload';
type DetectionMode = 'browser' | 'server';

interface SessionStats {
  totalFrames: number;
  violentFrames: number;
  peakViolence: number;
  avgLatency: number;
  fightCount: number;
  sessionDuration: number;
}

// VETO status types
type VetoStatus = 'none' | 'PRIMARY_FAST' | 'PRIMARY' | 'VETO_OVERRIDE';

/** Keypoint from pose detection */
interface PoseKeypoint {
  x: number;
  y: number;
  score: number;
  name?: string;
}

/** Pose from MoveNet or server detection */
interface DetectedPose {
  score: number;
  keypoints: PoseKeypoint[];
}

/** TensorFlow.js pose detector interface */
interface PoseDetector {
  estimatePoses: (video: HTMLVideoElement) => Promise<DetectedPose[]>;
}

/** Server detection response (v39 format) and browser detection data */
interface ServerDetectionData {
  type?: string;
  violence_score?: number;
  violence_probability?: number;
  violence?: boolean;
  skeletons?: number[][][];
  all_skeletons?: number[][][];
  num_detected?: number;
  buffer_size?: number;
  t_total?: number;
  t_gcn?: number;
  inference_time?: number;
  // Smart Veto result field - CRITICAL for alert logic
  result?: 'VIOLENCE' | 'VETOED' | 'SAFE';
  // Browser detection fields
  model_used?: string;
  poses_detected?: number;
  extra?: {
    src?: string;
    [key: string]: unknown;
  };
}

/** Grid camera region */
interface CameraRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  violenceProb: number;
  imageData?: string;
}

// Translations
const translations = {
  en: {
    title: 'Live Detection',
    subtitle: 'Real-time violence monitoring',
    sources: {
      title: 'Source',
      webcam: 'Webcam',
      screen: 'Screen Share',
      upload: 'Video Upload',
    },
    detection: {
      title: 'Detection Mode',
      browser: 'Browser Pose',
      browserDesc: 'TensorFlow.js MoveNet',
      server: 'Server Pose',
      serverDesc: 'YOLO v26 + Smart Veto',
    },
    controls: {
      start: 'Start Detection',
      stop: 'Stop Detection',
      mute: 'Mute',
      unmute: 'Unmute',
      fullscreen: 'Fullscreen',
      record: 'Recording',
    },
    status: {
      idle: 'Ready to start',
      connecting: 'Connecting...',
      active: 'Monitoring',
      detecting: 'Violence Detected!',
      paused: 'Paused',
      error: 'Connection Error',
    },
    stats: {
      title: 'Session Statistics',
      duration: 'Duration',
      frames: 'Frames Processed',
      violent: 'Violent Frames',
      peak: 'Peak Violence',
      latency: 'Avg Latency',
      fights: 'Fights Detected',
    },
    alerts: {
      title: 'Alert History',
      noAlerts: 'No alerts in this session',
      fightDetected: 'FIGHT DETECTED',
      severity: 'Severity',
      confidence: 'Confidence',
    },
    grid: {
      title: 'Multi-Camera Grid',
      autoDetect: 'Auto-detect cameras',
      manual: 'Manual grid',
      cameras: 'cameras detected',
      detecting: 'Detecting grid layout...',
    },
    upload: {
      drag: 'Drag video here or click to upload',
      formats: 'MP4, WebM, MOV up to 500MB',
      analyzing: 'Analyzing video...',
    },
  },
  ar: {
    title: 'الكشف المباشر',
    subtitle: 'مراقبة العنف في الوقت الفعلي',
    sources: {
      title: 'المصدر',
      webcam: 'كاميرا الويب',
      screen: 'مشاركة الشاشة',
      upload: 'رفع فيديو',
    },
    detection: {
      title: 'وضع الكشف',
      browser: 'وضع المتصفح',
      browserDesc: 'TensorFlow.js MoveNet',
      server: 'وضع الخادم',
      serverDesc: 'YOLO v26 + Smart Veto',
    },
    controls: {
      start: 'بدء الكشف',
      stop: 'إيقاف الكشف',
      mute: 'كتم الصوت',
      unmute: 'تشغيل الصوت',
      fullscreen: 'ملء الشاشة',
      record: 'جاري التسجيل',
    },
    status: {
      idle: 'جاهز للبدء',
      connecting: 'جاري الاتصال...',
      active: 'قيد المراقبة',
      detecting: 'تم اكتشاف عنف!',
      paused: 'متوقف مؤقتاً',
      error: 'خطأ في الاتصال',
    },
    stats: {
      title: 'إحصائيات الجلسة',
      duration: 'المدة',
      frames: 'الإطارات المعالجة',
      violent: 'الإطارات العنيفة',
      peak: 'أعلى نسبة عنف',
      latency: 'متوسط التأخير',
      fights: 'المشاجرات المكتشفة',
    },
    alerts: {
      title: 'سجل التنبيهات',
      noAlerts: 'لا توجد تنبيهات في هذه الجلسة',
      fightDetected: 'تم اكتشاف مشاجرة',
      severity: 'الخطورة',
      confidence: 'نسبة الثقة',
    },
    grid: {
      title: 'شبكة الكاميرات',
      autoDetect: 'اكتشاف تلقائي',
      manual: 'شبكة يدوية',
      cameras: 'كاميرات مكتشفة',
      detecting: 'جاري اكتشاف الشبكة...',
    },
    upload: {
      drag: 'اسحب الفيديو هنا أو انقر للرفع',
      formats: 'MP4, WebM, MOV حتى 500 ميجابايت',
      analyzing: 'جاري تحليل الفيديو...',
    },
  },
};

export default function LivePage() {
  const { isRTL, locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  // State
  const [source, setSource] = useState<SourceType>('webcam');
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('server');
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);  // Track isActive for closures (avoid stale closure bug)
  const [isMuted, setIsMuted] = useState(true);
  const [currentViolence, setCurrentViolence] = useState(0);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'detecting' | 'paused' | 'error'>('idle');
  const lastViolenceRef = useRef<number>(0);  // Preserve violence reading on pause
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isGridMode, setIsGridMode] = useState(false);
  const [gridCameras, setGridCameras] = useState<CameraRegion[]>([]);
  const [useAutoDetection, setUseAutoDetection] = useState(true);
  const [gridRows, setGridRows] = useState(2);
  const [gridCols, setGridCols] = useState(2);
  const [alerts, setAlerts] = useState<{ time: Date; confidence: number; error?: string }[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalFrames: 0,
    violentFrames: 0,
    peakViolence: 0,
    avgLatency: 0,
    fightCount: 0,
    sessionDuration: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  // VETO status tracking
  const [vetoStatus, setVetoStatus] = useState<VetoStatus>('none');
  const [vetoScore, setVetoScore] = useState<number | null>(null);

  // Track if server is sending processed frames (to hide raw video and show server-rendered frame)
  const [showProcessedFrame, setShowProcessedFrame] = useState(false);

  // Detection settings from Supabase (per-user) with localStorage fallback
  const { settings: detectionSettings, isLoading: settingsLoading, isAuthenticated: settingsAuthenticated } = useDetectionSettings();

  // Auth context for user ID
  const { user } = useAuth();

  // Alert settings for WhatsApp notifications
  const { settings: alertSettings } = useAlertSettings(user?.id);

  // Camera tracking for incident creation
  const [activeCamera, setActiveCamera] = useState<CameraRecord | null>(null);
  const [defaultLocation, setDefaultLocation] = useState<Location | null>(null);
  const [dbError, setDbError] = useState<string | null>(null); // Track database errors for user display

  // Refs for camera/location to avoid stale closures in WebSocket callbacks
  const activeCameraRef = useRef<CameraRecord | null>(null);
  const defaultLocationRef = useRef<Location | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedFrameCanvasRef = useRef<HTMLCanvasElement>(null);  // For server-processed frames with skeleton
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);  // WebRTC peer connection
  const dcRef = useRef<RTCDataChannel | null>(null);  // WebRTC data channel for frames
  const webrtcReadyRef = useRef<boolean>(false);  // Track if WebRTC is ready
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const _frameBufferRef = useRef<string[]>([]); // Reserved for future buffering
  const violenceHitsRef = useRef<number>(0);
  const sustainedViolenceRef = useRef<number>(0);
  const fightAlertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const poseDetectorRef = useRef<PoseDetector | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTimeRef = useRef<number>(0);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const incidentStartConfidenceRef = useRef<number>(0);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const recordingCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const currentIncidentIdRef = useRef<string | null>(null);
  const lastIncidentTimeRef = useRef<number>(0);
  const lastFrameSentTimeRef = useRef<number>(0);  // For frame rate throttling
  const lastWsWarningRef = useRef<number>(0);  // Throttle WS warning logs
  const TARGET_FPS = 10;  // 10 FPS = 100ms interval (reduced for smoother UI)
  const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Detection settings are now loaded via useDetectionSettings hook
  // Settings are per-user from Supabase when authenticated, localStorage fallback otherwise

  // Load TensorFlow.js for browser pose mode
  const loadBrowserPoseModel = async () => {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
      });

    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.0/dist/pose-detection.min.js');

    await (window as any).tf.setBackend('webgl');
    await (window as any).tf.ready();

    const model = (window as any).poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
      modelType: (window as any).poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
      enableSmoothing: true,
      minPoseScore: 0.25,
    };

    poseDetectorRef.current = await (window as any).poseDetection.createDetector(model, detectorConfig);
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (err) {
      console.error('Webcam error:', err);
      return false;
    }
  };

  // Start screen share
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Listen for stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        stopDetection();
      });

      // Auto-detect grid if enabled
      if (useAutoDetection && isGridMode) {
        setTimeout(() => detectCameraGrid(), 1000);
      }

      return true;
    } catch (err) {
      console.error('Screen share error:', err);
      return false;
    }
  };

  // Load video file
  const loadVideoFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      await videoRef.current.play();
    }
    return true;
  };

  // Detect camera grid in screen share
  const detectCameraGrid = async () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);

    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      const formData = new FormData();
      formData.append('screenshot', blob, 'screenshot.jpg');

      const response = await fetch('http://localhost:8004/api/detect-grid', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.regions) {
          setGridCameras(result.regions.map((r: CameraRegion) => ({ ...r, violenceProb: 0 })));
          setGridRows(result.grid_layout[0]);
          setGridCols(result.grid_layout[1]);
        }
      }
    } catch (err) {
      console.error('Grid detection error:', err);
      generateManualGrid();
    }
  };

  // Generate manual grid
  const generateManualGrid = () => {
    if (!videoRef.current) return;

    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    const cellWidth = vw / gridCols;
    const cellHeight = vh / gridRows;

    const regions: CameraRegion[] = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        regions.push({
          x: col * cellWidth,
          y: row * cellHeight,
          width: cellWidth,
          height: cellHeight,
          confidence: 1,
          violenceProb: 0,
        });
      }
    }
    setGridCameras(regions);
  };

  // Send config to server - reserved for dynamic settings sync
  const _sendConfigToServer = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const configMessage = {
        type: 'config',
        settings: {
          primary_threshold: detectionSettings.primary_threshold,
          veto_threshold: detectionSettings.veto_threshold,
          instant_trigger_threshold: detectionSettings.instant_trigger_threshold,
          instant_trigger_count: detectionSettings.instant_trigger_count,
          sustained_threshold: detectionSettings.sustained_threshold,
          sustained_duration: detectionSettings.sustained_duration,
        }
      };
      wsRef.current.send(JSON.stringify(configMessage));
    }
  }, [detectionSettings]);

  // Setup WebRTC DataChannel for low-latency frame transmission
  const setupWebRTC = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Create peer connection with STUN server for NAT traversal
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      // Create data channel for sending frames (ordered=false for lower latency)
      const dc = pc.createDataChannel('frames', {
        ordered: false,  // Allow out-of-order delivery (faster!)
        maxRetransmits: 0  // Don't retransmit lost packets (real-time is more important)
      });
      dcRef.current = dc;

      dc.onopen = () => {
        webrtcReadyRef.current = true;
      };

      dc.onclose = () => {
        webrtcReadyRef.current = false;
      };

      dc.onerror = (err) => {
        console.error('[WebRTC] DataChannel error:', err);
        webrtcReadyRef.current = false;
      };

      // Handle incoming messages on DataChannel (detection results)
      dc.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Process same as WebSocket message
          if (data.result !== undefined && data.primary !== undefined) {
            if (data.result === 'VIOLENCE') {
              setVetoStatus('PRIMARY');
              setVetoScore(data.veto / 100);
            } else if (data.result === 'VETOED') {
              setVetoStatus('VETO_OVERRIDE');
              setVetoScore(data.veto / 100);
            } else {
              setVetoStatus('PRIMARY_FAST');
              setVetoScore(null);
            }

            // CRITICAL: Pass result to prevent alerts when VETOED
            processDetectionResult({
              violence_score: data.primary / 100,
              t_total: data.inference_ms,
              buffer_size: data.buffer,
              result: data.result, // Pass VIOLENCE/VETOED/SAFE status
            });

            // Handle skeleton display - same logic as WebSocket handler
            if (data.processed_frame) {
              // Server sent processed frame with skeleton - display it
              displayProcessedFrame(data.processed_frame);
              // Clear overlay canvas since skeleton is in processed frame
              const overlay = overlayCanvasRef.current;
              if (overlay) {
                const ctx = overlay.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
              }
            } else if (data.skeletons && data.skeletons.length > 0) {
              // Fallback: draw skeletons client-side (only if no processed_frame)
              clearProcessedFrame();
              drawServerSkeletons(data.skeletons);
            }
          }
        } catch (err) {
          console.error('[WebRTC] Message parse error:', err);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate
          }));
        }
      };

      pc.onconnectionstatechange = () => {
        // Connection state change tracked internally
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsRef.current.send(JSON.stringify({
        type: 'webrtc_offer',
        sdp: offer.sdp,
        sdp_type: offer.type
      }));

    } catch (err) {
      console.error('[WebRTC] Setup failed:', err);
      webrtcReadyRef.current = false;
    }
  };

  // Connect WebSocket for server mode - returns Promise that resolves when connected
  const connectWebSocket = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const wsUrl = process.env.NEXT_PUBLIC_VASTAI_WS_URL || 'wss://api.nexaravision.com:14033/ws/live';

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setStatus('active');

          // Send current config to server on connection
          const configMessage = {
            type: 'config',
            settings: {
              primary_threshold: detectionSettings.primary_threshold,
              veto_threshold: detectionSettings.veto_threshold,
              instant_trigger_threshold: detectionSettings.instant_trigger_threshold,
              instant_trigger_count: detectionSettings.instant_trigger_count,
              sustained_threshold: detectionSettings.sustained_threshold,
              sustained_duration: detectionSettings.sustained_duration,
            }
          };
          ws.send(JSON.stringify(configMessage));

          // Setup WebRTC DataChannel for low-latency transmission
          setTimeout(() => setupWebRTC(), 500);

          resolve(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle config_updated confirmation (legacy v39)
            if (data.type === 'config_updated') {
              return;
            }

            // Handle WebRTC answer from server
            if (data.type === 'webrtc_answer') {
              if (pcRef.current) {
                const answer = new RTCSessionDescription({
                  type: data.sdp_type,
                  sdp: data.sdp
                });
                pcRef.current.setRemoteDescription(answer)
                  .catch(err => console.error('[WebRTC] Failed to set remote description:', err));
              }
              return;
            }

            // Handle smart_veto_final format (no type field, has 'result' field)
            if (data.result !== undefined && data.primary !== undefined) {
              // Smart Veto Final format: {primary, veto, result, buffer, inference_ms, stats}

              // Update VETO status based on result
              if (data.result === 'VIOLENCE') {
                setVetoStatus('PRIMARY');
                setVetoScore(data.veto / 100); // Convert percentage to 0-1
              } else if (data.result === 'VETOED') {
                setVetoStatus('VETO_OVERRIDE');
                setVetoScore(data.veto / 100);
              } else {
                setVetoStatus('PRIMARY_FAST');
                setVetoScore(null);
              }

              // Convert smart_veto format to v39-compatible format for processDetectionResult
              // CRITICAL: Pass result to prevent alerts when VETOED
              processDetectionResult({
                violence_score: data.primary / 100, // Convert 0-100 to 0-1
                t_total: data.inference_ms,
                buffer_size: data.buffer,
                result: data.result, // Pass VIOLENCE/VETOED/SAFE status
              });

              // Display processed frame with skeleton (perfect sync - skeleton drawn server-side)
              if (data.processed_frame) {
                displayProcessedFrame(data.processed_frame);
                // Clear overlay canvas since skeleton is in processed frame
                const overlay = overlayCanvasRef.current;
                if (overlay) {
                  const ctx = overlay.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
                }
              } else if (data.skeletons && data.skeletons.length > 0) {
                // Fallback: draw skeletons client-side (has latency)
                clearProcessedFrame();
                drawServerSkeletons(data.skeletons);
              } else {
                // Clear both canvases if no skeleton data
                clearProcessedFrame();
                const overlay = overlayCanvasRef.current;
                if (overlay) {
                  const ctx = overlay.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
                }
              }
              return;
            }

            // Handle legacy v39 format (has type: 'result')
            if (data.type === 'result') {
              // Update VETO status from v39 extra field
              if (data.extra?.src) {
                setVetoStatus(data.extra.src as VetoStatus);
                setVetoScore(data.extra.v_veto ?? null);
              } else {
                setVetoStatus('none');
                setVetoScore(null);
              }

              // Process detection result
              processDetectionResult(data);

              // Draw YOLO v26 skeletons from v39 response
              const skeletons = data.all_skeletons || data.skeletons || [];
              if (skeletons.length > 0) {
                drawServerSkeletons(skeletons);
              } else {
                // Clear overlay if no skeletons
                const overlay = overlayCanvasRef.current;
                if (overlay) {
                  const ctx = overlay.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
                }
              }
              return;
            }

            // Unknown message format - ignore silently
          } catch (err) {
            console.error('WS message error:', err, event.data?.substring?.(0, 100));
          }
        };

        ws.onerror = (err) => {
          console.error('[WS] Error:', err);
          setStatus('error');
          resolve(false);
        };

        ws.onclose = () => {
          // Use ref to avoid stale closure - isActiveRef is always current
          if (isActiveRef.current) {
            setTimeout(() => connectWebSocket(), 2000);
          }
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('[WS] Failed to create WebSocket:', err);
        setStatus('error');
        resolve(false);
      }
    });
  };

  // Process detection result (handles both old format and v39 format)
  const processDetectionResult = (data: ServerDetectionData) => {
    // Handle v39 format: violence_score (0-1) or old format: violence_probability (0-1)
    const violenceScore = data.violence_score ?? data.violence_probability ?? 0;
    const violence = violenceScore * 100;
    setCurrentViolence(violence);

    // Handle v39 timing: t_total or old format: inference_time
    const latency = data.t_total ?? data.t_gcn ?? data.inference_time ?? 0;

    // CRITICAL: Check if this was VETOED - don't count as violent frame or trigger alerts
    // If result is 'VETOED', the VETO model rejected it as a false positive
    // Only trigger alerts for confirmed 'VIOLENCE' or when no result field (browser mode)
    const isVetoed = data.result === 'VETOED';
    const isConfirmedViolence = data.result === 'VIOLENCE';
    // For browser mode (no result field), use threshold-based detection
    const shouldTriggerAlerts = isConfirmedViolence || (data.result === undefined);

    // Use configurable threshold for violent frame counting
    // DON'T count VETOED frames as violent
    setStats((prev) => ({
      ...prev,
      totalFrames: prev.totalFrames + 1,
      violentFrames: (!isVetoed && violence > detectionSettings.primary_threshold) ? prev.violentFrames + 1 : prev.violentFrames,
      peakViolence: Math.max(prev.peakViolence, violence),
      avgLatency: prev.avgLatency === 0 ? latency : (prev.avgLatency + latency) / 2,
    }));

    // CRITICAL: Skip fight detection entirely if VETOED
    if (isVetoed) {
      // Reset violence counters when vetoed - this was a false positive
      violenceHitsRef.current = Math.max(0, violenceHitsRef.current - 1);
      sustainedViolenceRef.current = Math.max(0, sustainedViolenceRef.current - 10);
      return; // Don't trigger any alerts
    }

    // SERVER CONFIRMED VIOLENCE - trigger alert IMMEDIATELY (no frame counting needed)
    // The server's Smart Veto already confirmed this is real violence
    if (isConfirmedViolence) {
      violenceHitsRef.current++;
      // Trigger after just 2 confirmed VIOLENCE frames (very fast response)
      if (violenceHitsRef.current >= 2) {
        triggerFightAlert(violence);
        violenceHitsRef.current = 0; // Reset after triggering
      }
      return;
    }

    // BROWSER MODE ONLY (no server result) - use threshold-based detection
    if (data.result !== undefined) {
      return; // Server sent SAFE, don't trigger
    }

    // Instant trigger: N× frames at X%+
    if (violence >= detectionSettings.instant_trigger_threshold) {
      violenceHitsRef.current++;
      if (violenceHitsRef.current >= detectionSettings.instant_trigger_count) {
        triggerFightAlert(violence);
      }
    } else {
      violenceHitsRef.current = Math.max(0, violenceHitsRef.current - 1);
    }

    // Sustained trigger: X seconds at Y%+
    // Assuming ~30fps, sustained_duration seconds = sustained_duration * 30 frames
    const sustainedFrameCount = detectionSettings.sustained_duration * 30;
    if (violence >= detectionSettings.sustained_threshold) {
      sustainedViolenceRef.current++;
      if (sustainedViolenceRef.current >= sustainedFrameCount) {
        triggerFightAlert(violence);
      }
    } else {
      sustainedViolenceRef.current = Math.max(0, sustainedViolenceRef.current - 10);
    }
  };

  // Trigger fight alert - saves incident IMMEDIATELY to database
  const triggerFightAlert = async (confidence: number) => {
    setStatus('detecting');
    setAlerts((prev) => [...prev, { time: new Date(), confidence }]);
    setStats((prev) => ({ ...prev, fightCount: prev.fightCount + 1 }));

    // Throttle incident creation - minimum 10 seconds between incidents
    const now = Date.now();
    const timeSinceLastIncident = now - lastIncidentTimeRef.current;
    const shouldCreateNewIncident = timeSinceLastIncident > 10000; // 10 seconds

    // Save incident IMMEDIATELY to database (without video first)
    // CRITICAL: Use refs (not state) to avoid stale closure in WebSocket callback
    let camera = activeCameraRef.current;
    let location = defaultLocationRef.current;

    // If camera or location is missing, try to create them now (fallback)
    if (shouldCreateNewIncident && (!camera?.id || !location?.id)) {

      // Try to create location if missing
      if (!location?.id) {
        try {
          const { location: newLoc, error: locErr } = await getOrCreateDefaultLocation();
          if (newLoc) {
            location = newLoc;
            defaultLocationRef.current = newLoc;
            setDefaultLocation(newLoc);
          } else {
            console.error('[Incident] Fallback location failed:', locErr);
          }
        } catch (err) {
          console.error('[Incident] Location creation exception:', err);
        }
      }

      // Try to create camera if missing
      if (!camera?.id) {
        try {
          const { camera: newCam, error: camErr } = await findOrCreateCamera('webcam', undefined, 'Browser Webcam');
          if (newCam) {
            camera = newCam;
            activeCameraRef.current = newCam;
            setActiveCamera(newCam);
          } else {
            console.error('[Incident] Fallback camera failed:', camErr);
          }
        } catch (err) {
          console.error('[Incident] Camera creation exception:', err);
        }
      }
    }

    if (shouldCreateNewIncident && camera?.id && location?.id) {
      lastIncidentTimeRef.current = now;

      // Capture thumbnail immediately
      let thumbnailBlob: Blob | null = null;
      if (videoRef.current) {
        thumbnailBlob = await captureVideoFrame(videoRef.current);
      }

      // Create incident right away (video will be added later if recording)
      const { incident, error } = await createIncidentWithRecording({
        camera_id: camera.id,
        location_id: location.id,
        confidence: Math.round(confidence),
        model_used: detectionMode === 'server' ? 'Smart Veto Ensemble' : 'MoveNet Lightning',
        thumbnailBlob: thumbnailBlob || undefined,
        // No video yet - will be added when recording completes
      });

      if (incident) {
        currentIncidentIdRef.current = incident.id;
        setDbError(null); // Clear any previous error

        // Send WhatsApp alert if enabled
        if (alertSettings?.whatsapp_enabled && alertSettings?.whatsapp_number && user?.id) {
          console.log('[WhatsApp] Sending violence alert to:', alertSettings.whatsapp_number);
          fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: alertSettings.whatsapp_number,
              userId: user.id,
              incidentId: incident.id,
              cameraName: camera?.name || 'Browser Camera',
              locationName: location?.name || 'Unknown Location',
              confidence: Math.round(confidence),
              timestamp: new Date().toISOString(),
            }),
          }).then(res => res.json())
            .then(data => {
              if (data.success) {
                console.log('[WhatsApp] Alert sent successfully:', data.id);
              } else if (data.cooldownActive) {
                console.log('[WhatsApp] Cooldown active, skipped alert');
              } else {
                console.error('[WhatsApp] Failed to send alert:', data.error);
              }
            })
            .catch(err => console.error('[WhatsApp] Error sending alert:', err));
        }
      } else if (error) {
        console.error('[Incident] ❌ Failed to create:', error);
        const errMsg = (error as { message?: string; code?: string })?.message || 'Unknown error';
        const errCode = (error as { code?: string })?.code;
        // Show error to user
        setDbError(errCode === '42501'
          ? 'Database permission denied. Go to /debug to fix RLS policies.'
          : `Failed to save incident: ${errMsg}`
        );
        setAlerts((prev) => [...prev, {
          time: new Date(),
          confidence,
          error: 'Failed to save to database'
        }]);
      }
    } else if (shouldCreateNewIncident) {
      console.error('[Incident] ❌ Cannot create - missing camera or location after fallback. Camera:', camera?.id, 'Location:', location?.id);
      setDbError('Cannot save incidents - database setup required. Go to /debug to fix.');
      // Still show alert to user even if DB save failed
      setAlerts((prev) => [...prev, {
        time: new Date(),
        confidence,
        error: 'Database connection issue - incident not saved'
      }]);
    }

    // Start recording ONCE per incident (no timer reset on re-trigger)
    if (detectionSettings.auto_record && streamRef.current && !mediaRecorderRef.current) {
      startIncidentRecording();
      startRecordingTimer(confidence);
    }

    if (fightAlertTimeoutRef.current) {
      clearTimeout(fightAlertTimeoutRef.current);
    }

    fightAlertTimeoutRef.current = setTimeout(() => {
      setStatus('active');
      violenceHitsRef.current = 0;
      sustainedViolenceRef.current = 0;
    }, 3000);

    // Play alert sound
    if (!isMuted && detectionSettings.sound_enabled) {
      try {
        // Use Web Audio API for more reliable playback
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Alert sound: two-tone beep
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
        oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.15); // C#6
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch {
        // Sound playback failed silently
      }
    }
  };

  // Detection loop with frame rate throttling (GAP-007 fix)
  const runDetectionLoop = useCallback(async () => {
    if (!isActive || !videoRef.current || !canvasRef.current) {
      if (isActive) {
        animationRef.current = requestAnimationFrame(runDetectionLoop);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Skip if video is paused - don't send frames (GAP-004 fix)
    if (video.paused || video.ended) {
      animationRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Frame rate throttling - only process at TARGET_FPS (GAP-007 fix)
    const now = performance.now();
    if (detectionMode === 'server' && now - lastFrameSentTimeRef.current < FRAME_INTERVAL_MS) {
      animationRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      animationRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    // Constrain canvas size for performance (GAP-015 fix)
    const MAX_WIDTH = 640;  // Reduced for faster processing
    const MAX_HEIGHT = 480;
    let canvasWidth = video.videoWidth;
    let canvasHeight = video.videoHeight;

    if (canvasWidth > MAX_WIDTH || canvasHeight > MAX_HEIGHT) {
      const scale = Math.min(MAX_WIDTH / canvasWidth, MAX_HEIGHT / canvasHeight);
      canvasWidth = Math.round(canvasWidth * scale);
      canvasHeight = Math.round(canvasHeight * scale);
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

    setStats((prev) => ({
      ...prev,
      sessionDuration: (Date.now() - startTimeRef.current) / 1000,
    }));

    if (detectionMode === 'browser' && poseDetectorRef.current) {
      try {
        const poses = await poseDetectorRef.current.estimatePoses(video);
        drawPoses(poses);
        analyzePostures(poses);
      } catch (err) {
        console.error('Pose detection error:', err);
      }
    } else if (detectionMode === 'server') {
      // Check WebSocket status
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        // WS not ready - wait for reconnection
        animationRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      // Skip if WebSocket buffer is too full (GAP-008 fix - prevent backlog)
      if (wsRef.current.bufferedAmount > 256 * 1024) {  // 256KB threshold (reduced for faster response)
        animationRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      // Use async toBlob instead of blocking toDataURL (CRITICAL LATENCY FIX)
      // toDataURL is synchronous and blocks UI for 10-50ms per frame!
      // toBlob is async and sends binary directly (no base64 = 33% smaller)
      lastFrameSentTimeRef.current = now;  // Update throttle timestamp

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // Prefer WebRTC DataChannel (UDP, lower latency) over WebSocket (TCP)
        if (webrtcReadyRef.current && dcRef.current?.readyState === 'open') {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            dcRef.current.send(arrayBuffer);
            // console.log('[WebRTC] Frame sent via DataChannel');
          } catch {
            // DataChannel send failed - falling back to WebSocket
            webrtcReadyRef.current = false;
          }
        } else if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Fallback to WebSocket
          if (wsRef.current.bufferedAmount < 256 * 1024) {
            wsRef.current.send(blob);
          }
        }
      }, 'image/jpeg', 0.5);  // 0.5 quality for even faster transmission
    }

    animationRef.current = requestAnimationFrame(runDetectionLoop);
  }, [isActive, detectionMode]);

  // Draw poses on overlay canvas
  const drawPoses = (poses: DetectedPose[]) => {
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const ctx = overlay.getContext('2d');
    if (!ctx || !videoRef.current) return;

    overlay.width = videoRef.current.videoWidth;
    overlay.height = videoRef.current.videoHeight;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4],
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
      [5, 11], [6, 12], [11, 12],
      [11, 13], [13, 15], [12, 14], [14, 16],
    ];

    poses.forEach((pose) => {
      if (pose.score < 0.25) return;

      ctx.strokeStyle = currentViolence > 70 ? '#ef4444' : '#22c55e';
      ctx.lineWidth = 3;

      connections.forEach(([i, j]) => {
        const kp1 = pose.keypoints[i];
        const kp2 = pose.keypoints[j];
        if (kp1?.score > 0.3 && kp2?.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(kp1.x, kp1.y);
          ctx.lineTo(kp2.x, kp2.y);
          ctx.stroke();
        }
      });

      pose.keypoints.forEach((kp: PoseKeypoint) => {
        if (kp.score > 0.3) {
          ctx.fillStyle = currentViolence > 70 ? '#ef4444' : '#22c55e';
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });
  };

  // Display processed frame from server (with skeleton already drawn) for perfect sync
  const displayProcessedFrame = (base64Data: string) => {
    const canvas = processedFrameCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create image from base64
    const img = new Image();
    img.onload = () => {
      // Match canvas to video display size
      const displayWidth = video.clientWidth || video.videoWidth || 640;
      const displayHeight = video.clientHeight || video.videoHeight || 480;
      canvas.width = displayWidth;
      canvas.height = displayHeight;

      // Draw the processed frame (which has skeleton already drawn by server)
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Hide raw video, show processed frame (prevents double image)
      setShowProcessedFrame(true);
    };
    img.src = `data:image/jpeg;base64,${base64Data}`;
  };

  // Clear the processed frame canvas and show raw video again
  const clearProcessedFrame = () => {
    const canvas = processedFrameCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setShowProcessedFrame(false);  // Show raw video again
  };

  // Draw YOLO v26 skeletons from server response (COCO 17-keypoint format)
  // CRITICAL: Server coordinates are in SENT FRAME SIZE (max 640x480), not video native size!
  const drawServerSkeletons = (skeletons: number[][][]) => {
    const overlay = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!overlay || !video) {
      return; // Missing overlay or video
      return;
    }

    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    // IMPORTANT: Server coordinates are in the SENT frame size (max 640x480)
    // NOT in video.videoWidth/videoHeight!
    const SENT_MAX_WIDTH = 640;
    const SENT_MAX_HEIGHT = 480;

    // Calculate the actual sent frame dimensions (same logic as frame capture)
    const videoNativeWidth = video.videoWidth || 640;
    const videoNativeHeight = video.videoHeight || 480;
    let sentWidth = videoNativeWidth;
    let sentHeight = videoNativeHeight;

    if (sentWidth > SENT_MAX_WIDTH || sentHeight > SENT_MAX_HEIGHT) {
      const scale = Math.min(SENT_MAX_WIDTH / sentWidth, SENT_MAX_HEIGHT / sentHeight);
      sentWidth = Math.round(sentWidth * scale);
      sentHeight = Math.round(sentHeight * scale);
    }

    // Set canvas to match video display size
    const displayWidth = video.clientWidth || videoNativeWidth;
    const displayHeight = video.clientHeight || videoNativeHeight;
    overlay.width = displayWidth;
    overlay.height = displayHeight;
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // COCO 17-keypoint skeleton connections
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4],  // Head
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],  // Arms
      [5, 11], [6, 12], [11, 12],  // Torso
      [11, 13], [13, 15], [12, 14], [14, 16]  // Legs
    ];

    const colors = ['#00ff00', '#ff6600', '#00ffff', '#ff00ff', '#ffff00'];

    // Scale from SENT frame coordinates to DISPLAY coordinates
    const scaleX = displayWidth / sentWidth;
    const scaleY = displayHeight / sentHeight;

    // Skeleton scaling: sent ${sentWidth}x${sentHeight} -> display ${displayWidth}x${displayHeight}

    skeletons.forEach((skeleton, poseIndex) => {
      if (!skeleton || skeleton.length < 17) {
        return;
      }

      const color = colors[poseIndex % colors.length];
      const isViolent = currentViolence > 50;

      // Draw connections (no shadow - was causing "double skeleton" appearance)
      ctx.strokeStyle = isViolent ? '#ef4444' : color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;  // Disable shadow

      connections.forEach(([i, j]) => {
        const kp1 = skeleton[i];
        const kp2 = skeleton[j];
        if (kp1 && kp2 && kp1[2] > 0.3 && kp2[2] > 0.3) {
          const x1 = kp1[0] * scaleX;
          const y1 = kp1[1] * scaleY;
          const x2 = kp2[0] * scaleX;
          const y2 = kp2[1] * scaleY;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      // Draw keypoints
      ctx.shadowBlur = 0;
      skeleton.forEach((kp) => {
        if (kp && kp[2] > 0.3) {
          const x = kp[0] * scaleX;
          const y = kp[1] * scaleY;

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = isViolent ? '#ef4444' : color;
          ctx.fill();
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    });
  };

  // Analyze postures for violence
  const analyzePostures = (poses: DetectedPose[]) => {
    if (poses.length < 1) return;

    let violenceScore = 0;

    poses.forEach((pose) => {
      const keypoints = pose.keypoints;
      const leftWrist = keypoints[9];
      const rightWrist = keypoints[10];
      const leftShoulder = keypoints[5];
      const rightShoulder = keypoints[6];

      if (leftWrist?.score > 0.3 && leftShoulder?.score > 0.3) {
        if (leftWrist.y < leftShoulder.y) violenceScore += 15;
      }
      if (rightWrist?.score > 0.3 && rightShoulder?.score > 0.3) {
        if (rightWrist.y < rightShoulder.y) violenceScore += 15;
      }
    });

    if (poses.length >= 2) {
      const pose1 = poses[0];
      const pose2 = poses[1];
      const hip1 = pose1.keypoints[11];
      const hip2 = pose2.keypoints[11];

      if (hip1?.score > 0.3 && hip2?.score > 0.3) {
        const distance = Math.hypot(hip1.x - hip2.x, hip1.y - hip2.y);
        if (distance < 150) violenceScore += 30;
      }
    }

    violenceScore = Math.min(100, violenceScore);
    processDetectionResult({
      violence_probability: violenceScore / 100,
      model_used: 'MoveNet',
      inference_time: 15,
      poses_detected: poses.length,
    });
  };

  // Recording duration in seconds (1 minute)
  const RECORDING_DURATION = 60;

  // Start incident recording when violence is detected
  const startIncidentRecording = useCallback(() => {
    if (!streamRef.current) return;

    // If already recording, just reset the timer (handled in triggerRecordingReset)
    if (mediaRecorderRef.current) return;

    try {
      const options = { mimeType: 'video/webm;codecs=vp9' };
      const recorder = new MediaRecorder(streamRef.current, options);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000); // Capture in 1-second chunks
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);

      // Start countdown display
      setRecordingTimeLeft(RECORDING_DURATION);
      recordingCountdownRef.current = setInterval(() => {
        setRecordingTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
    }
  }, []);

  // Start the recording finalization timer (called ONCE when recording starts)
  const startRecordingTimer = useCallback((confidence: number) => {
    // Track the starting confidence
    incidentStartConfidenceRef.current = confidence;

    // Set timeout to finalize after RECORDING_DURATION (NO reset on re-trigger)
    recordingTimeoutRef.current = setTimeout(() => {
      finalizeIncidentRecording();
    }, RECORDING_DURATION * 1000);
  }, []);

  // Finalize and save the incident recording (video only - incident already created)
  const finalizeIncidentRecording = useCallback(async () => {
    // Clear countdown interval
    if (recordingCountdownRef.current) {
      clearInterval(recordingCountdownRef.current);
      recordingCountdownRef.current = null;
    }
    setRecordingTimeLeft(0);

    // Stop the recorder to get final chunks
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);

    const allChunks = [...recordedChunksRef.current];
    const incidentId = currentIncidentIdRef.current;

    // Reset for next incident
    recordedChunksRef.current = [];
    incidentStartConfidenceRef.current = 0;
    currentIncidentIdRef.current = null;

    if (allChunks.length === 0) {
      return;
    }

    const videoBlob = new Blob(allChunks, { type: 'video/webm' });

    // Upload video to storage and update the incident record
    if (incidentId && videoBlob.size > 0) {
      // Don't await - let upload happen in background
      uploadIncidentVideo(incidentId, videoBlob);
    }
  }, []);

  // Stop recording without saving (when detection stops)
  const stopRecording = useCallback(() => {
    // Clear timeouts
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (recordingCountdownRef.current) {
      clearInterval(recordingCountdownRef.current);
      recordingCountdownRef.current = null;
    }
    setRecordingTimeLeft(0);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    recordedChunksRef.current = [];
    incidentStartConfidenceRef.current = 0;
    setIsRecording(false);
  }, []);

  // Start detection
  const startDetection = async () => {
    setStatus('connecting');
    setStats({
      totalFrames: 0,
      violentFrames: 0,
      peakViolence: 0,
      avgLatency: 0,
      fightCount: 0,
      sessionDuration: 0,
    });
    setAlerts([]);
    startTimeRef.current = Date.now();

    // Get or create default location first
    const { location, error: locationError } = await getOrCreateDefaultLocation();
    if (location) {
      setDefaultLocation(location);
      defaultLocationRef.current = location; // Set ref immediately for WebSocket callback
      setDbError(null); // Clear any previous error
    } else {
      console.error('[Live] Failed to get/create location:', locationError);
      const errCode = (locationError as { code?: string })?.code;
      if (errCode === '42501' || errCode === 'AUTH_ERROR') {
        setDbError('Database setup required - incidents won\'t be saved. Click "Fix Now" to resolve.');
      }
    }

    // Register camera based on source type
    let cameraSourceType: CameraSourceType = 'webcam';
    let sourceUrl: string | undefined;

    if (source === 'webcam') {
      cameraSourceType = 'webcam';
    } else if (source === 'screen') {
      cameraSourceType = 'rtsp'; // Screen share treated as RTSP-like
    } else if (source === 'upload') {
      cameraSourceType = 'upload';
    }

    // Try to register camera in Supabase
    try {
      const { camera, error: cameraError } = await findOrCreateCamera(
        cameraSourceType,
        sourceUrl,
        source === 'screen' ? 'Screen Share' : undefined
      );

      if (camera) {
        setActiveCamera(camera);
        activeCameraRef.current = camera; // Set ref immediately for WebSocket callback
      } else {
        console.error('[Live] Camera registration failed:', cameraError);
      }
    } catch (err) {
      console.error('[Live] Camera registration error:', err);
    }

    let success = false;

    if (source === 'webcam') {
      success = await startWebcam();
    } else if (source === 'screen') {
      success = await startScreenShare();
    } else if (source === 'upload' && uploadedFile) {
      success = await loadVideoFile(uploadedFile);
    }

    if (!success) {
      setStatus('error');
      return;
    }

    if (detectionMode === 'browser') {
      await loadBrowserPoseModel();
      setStatus('active');
    } else {
      // Wait for WebSocket to connect before starting loop
      const connected = await connectWebSocket();
      if (!connected) {
        setStatus('error');
        return;
      }
    }

    // Recording will start automatically when violence is detected
    // (1-minute window system with reset on each trigger)

    setIsActive(true);
    runDetectionLoop();
  };

  // Stop detection
  const stopDetection = async () => {
    setIsActive(false);
    setStatus('idle');

    // Stop recording (discards any current recording)
    stopRecording();

    // Set camera offline
    if (activeCamera?.id) {
      await setCameraStatus(activeCamera.id, 'offline');
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (fightAlertTimeoutRef.current) {
      clearTimeout(fightAlertTimeoutRef.current);
      fightAlertTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }

    // Clear processed frame canvas
    clearProcessedFrame();

    setActiveCamera(null);
    activeCameraRef.current = null;
    defaultLocationRef.current = null;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setSource('upload');
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
      setSource('upload');
    }
  };

  // Sync refs with state for closure-safe access
  useEffect(() => {
    activeCameraRef.current = activeCamera;
  }, [activeCamera]);

  useEffect(() => {
    defaultLocationRef.current = defaultLocation;
  }, [defaultLocation]);

  // Sync isActiveRef with isActive state (prevents stale closure in WS onclose)
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  // Handle video pause/play events to preserve violence meter (GAP-001 fix)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePause = () => {
      if (isActive) {
        setStatus('paused');
        // Preserve current violence reading
        lastViolenceRef.current = currentViolence;
      }
    };

    const handlePlay = () => {
      if (isActive) {
        setStatus('active');
        // Restore violence reading if we had one
        if (lastViolenceRef.current > 0 && currentViolence === 0) {
          setCurrentViolence(lastViolenceRef.current);
        }
      }
    };

    const handleEnded = () => {
      if (uploadedFile) {
        setStatus('paused');
        // Keep violence meter at last value
      }
    };

    video.addEventListener('pause', handlePause);
    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isActive, currentViolence, uploadedFile]);

  useEffect(() => {
    if (isActive) {
      runDetectionLoop();
    }
  }, [isActive, runDetectionLoop]);

  const getViolenceColor = (value: number) => {
    if (value >= 70) return 'text-red-500';
    if (value >= 40) return 'text-orange-500';
    return 'text-green-500';
  };

  const getViolenceBgColor = (value: number) => {
    if (value >= 70) return 'bg-red-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-6', isRTL && 'rtl')}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header - Mobile optimized */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-white">{t.title}</h1>
            <p className="text-slate-400 text-sm sm:text-base mt-0.5 sm:mt-1 hidden sm:block">{t.subtitle}</p>
          </div>

          {/* Status Badge - Compact on mobile */}
          <motion.div
            animate={{
              scale: status === 'detecting' ? [1, 1.05, 1] : 1,
            }}
            transition={{ repeat: status === 'detecting' ? Infinity : 0, duration: 0.5 }}
          >
            <div
              className={cn(
                'px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base',
                status === 'idle' && 'bg-slate-700 text-slate-300',
                status === 'connecting' && 'bg-amber-600/20 text-amber-400',
                status === 'active' && 'bg-emerald-600/20 text-emerald-400',
                status === 'detecting' && 'bg-red-600/30 text-red-400 animate-pulse',
                status === 'error' && 'bg-red-600/20 text-red-400'
              )}
            >
              {status === 'detecting' && <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" />}
              {status === 'active' && <Shield className="w-4 h-4 sm:w-5 sm:h-5" />}
              {status === 'connecting' && <Wifi className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />}
              <span className="hidden sm:inline">{t.status[status]}</span>
            </div>
          </motion.div>
        </div>

        {/* Database Error Banner */}
        {dbError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 sm:p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm truncate">{dbError}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="/debug"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
              >
                Fix Now
              </a>
              <button
                onClick={() => setDbError(null)}
                className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Grid - Video first on mobile for better UX */}
        <div className="grid grid-cols-12 gap-3 sm:gap-6">
          {/* Left Sidebar - Controls (order-2 on mobile, order-1 on lg) */}
          <div className="col-span-12 lg:col-span-3 space-y-3 sm:space-y-4 order-2 lg:order-1">
            {/* Source Selection */}
            <TextureCardStyled>
              <TextureCardHeader className="pb-3">
                <TextureCardTitle className="text-lg flex items-center gap-2">
                  <Video className="w-5 h-5 text-red-400" />
                  {t.sources.title}
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureCardContent className="space-y-2">
                {[
                  { key: 'webcam', icon: Camera, label: t.sources.webcam },
                  { key: 'screen', icon: Monitor, label: t.sources.screen },
                  { key: 'upload', icon: Upload, label: t.sources.upload },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (!isActive) {
                        setSource(key as SourceType);
                        if (key === 'upload') fileInputRef.current?.click();
                      }
                    }}
                    disabled={isActive}
                    className={cn(
                      'w-full p-3 rounded-xl flex items-center gap-3 transition-all min-h-[48px] active:scale-[0.98]',
                      source === key
                        ? 'bg-red-600/20 border border-red-500/50 text-red-400'
                        : 'bg-slate-800/50 border border-transparent text-slate-400 hover:bg-slate-700/50',
                      isActive && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                    {source === key && <ChevronRight className={cn('w-4 h-4 ml-auto', isRTL && 'rotate-180')} />}
                  </button>
                ))}
                <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                {uploadedFile && (
                  <div className="mt-2 p-2 bg-slate-800/50 rounded-lg flex items-center gap-2">
                    <FileVideo className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-slate-400 truncate flex-1">{uploadedFile.name}</span>
                    <button
                      onClick={() => setUploadedFile(null)}
                      className="p-1 hover:bg-slate-700 rounded"
                    >
                      <X className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                )}
              </TextureCardContent>
            </TextureCardStyled>

            {/* Detection Mode */}
            <TextureCardStyled>
              <TextureCardHeader className="pb-3">
                <TextureCardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5 text-orange-400" />
                  {t.detection.title}
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureCardContent className="space-y-2">
                {[
                  { key: 'server', icon: Server, label: t.detection.server, desc: t.detection.serverDesc },
                  { key: 'browser', icon: Smartphone, label: t.detection.browser, desc: t.detection.browserDesc },
                ].map(({ key, icon: Icon, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => !isActive && setDetectionMode(key as DetectionMode)}
                    disabled={isActive}
                    className={cn(
                      'w-full p-3 rounded-xl flex items-start gap-3 transition-all text-left min-h-[56px] active:scale-[0.98]',
                      detectionMode === key
                        ? 'bg-orange-600/20 border border-orange-500/50'
                        : 'bg-slate-800/50 border border-transparent hover:bg-slate-700/50',
                      isActive && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 mt-0.5', detectionMode === key ? 'text-orange-400' : 'text-slate-500')} />
                    <div>
                      <div className={cn('font-medium', detectionMode === key ? 'text-orange-400' : 'text-slate-400')}>{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                  </button>
                ))}
              </TextureCardContent>
            </TextureCardStyled>

            {/* Grid Mode (for Screen Share) */}
            {source === 'screen' && (
              <TextureCardStyled>
                <TextureCardHeader className="pb-3">
                  <TextureCardTitle className="text-lg flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5 text-amber-400" />
                    {t.grid.title}
                  </TextureCardTitle>
                </TextureCardHeader>
                <TextureCardContent className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGridMode}
                      onChange={(e) => setIsGridMode(e.target.checked)}
                      disabled={isActive}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500"
                    />
                    <span className="text-slate-300 text-sm">Enable Multi-Camera Mode</span>
                  </label>

                  {isGridMode && (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useAutoDetection}
                          onChange={(e) => setUseAutoDetection(e.target.checked)}
                          disabled={isActive}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-amber-500"
                        />
                        <span className="text-slate-300 text-sm">{t.grid.autoDetect}</span>
                      </label>

                      {!useAutoDetection && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500">Rows</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={gridRows}
                              onChange={(e) => setGridRows(parseInt(e.target.value))}
                              disabled={isActive}
                              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Cols</label>
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={gridCols}
                              onChange={(e) => setGridCols(parseInt(e.target.value))}
                              disabled={isActive}
                              className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                            />
                          </div>
                        </div>
                      )}

                      {gridCameras.length > 0 && (
                        <div className="text-sm text-amber-400">
                          {gridCameras.length} {t.grid.cameras}
                        </div>
                      )}
                    </>
                  )}
                </TextureCardContent>
              </TextureCardStyled>
            )}

            {/* Start/Stop Button - Touch-friendly with min-height */}
            <TextureButton
              variant="destructive"
              size="lg"
              className={cn(
                "w-full min-h-[48px] sm:min-h-[44px] text-base sm:text-lg",
                !isActive && "bg-red-600 hover:bg-red-500 text-white active:scale-95 transition-transform"
              )}
              onClick={isActive ? stopDetection : startDetection}
              disabled={source === 'upload' && !uploadedFile}
            >
              {isActive ? (
                <>
                  <Square className="w-5 h-5" />
                  {t.controls.stop}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  {t.controls.start}
                </>
              )}
            </TextureButton>
          </div>

          {/* Main Video Area (order-1 on mobile - shows first) */}
          <div className="col-span-12 lg:col-span-6 space-y-3 sm:space-y-4 order-1 lg:order-2">
            {/* Video Container */}
            <TextureCardStyled className="overflow-hidden">
              <div
                className={cn(
                  'relative aspect-video bg-black rounded-lg overflow-hidden',
                  isDragging && 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {/* Video - Real view (not mirrored) for webcam */}
                {/* Hidden when server sends processed frames to prevent double image */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  style={{
                    transform: sourceType === 'webcam' ? 'scaleX(-1)' : 'none',
                    opacity: showProcessedFrame ? 0 : 1  // Hide when server-rendered frame is active
                  }}
                  muted={isMuted}
                  playsInline
                />

                {/* Canvas for frame capture (hidden) */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay for client-side pose drawing - hidden when server sends processed frames */}
                <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: sourceType === 'webcam' ? 'scaleX(-1)' : 'none', opacity: showProcessedFrame ? 0 : 1 }} />

                {/* Server-rendered frame with skeleton (zero-delay, perfectly synced) */}
                <canvas ref={processedFrameCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ transform: sourceType === 'webcam' ? 'scaleX(-1)' : 'none' }} />

                {/* Violence Indicator Overlay */}
                <AnimatePresence>
                  {status === 'detecting' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 border-4 border-red-500 rounded-lg animate-pulse"
                    >
                      <div className="absolute top-4 left-4 bg-red-600/90 px-4 py-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-white animate-bounce" />
                        <span className="text-white font-bold">{t.alerts.fightDetected}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Idle State */}
                {status === 'idle' && !uploadedFile && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                    <div className="text-center">
                      <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">{t.status.idle}</p>
                      <p className="text-xs text-slate-500">{t.upload.drag}</p>
                    </div>
                  </div>
                )}

                {/* Drag Overlay */}
                {isDragging && (
                  <div className="absolute inset-0 bg-red-600/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <Upload className="w-12 h-12 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400 font-medium">Drop video here</p>
                    </div>
                  </div>
                )}

                {/* Controls Overlay */}
                {isActive && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 bg-slate-900/80 rounded-lg hover:bg-slate-800/80 transition"
                        title={isMuted ? t.controls.unmute : t.controls.mute}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-white" />}
                      </button>
                      <button
                        onClick={() => {
                          const videoContainer = videoRef.current?.parentElement;
                          if (videoContainer) {
                            if (document.fullscreenElement) {
                              document.exitFullscreen();
                            } else {
                              videoContainer.requestFullscreen();
                            }
                          }
                        }}
                        className="p-2 bg-slate-900/80 rounded-lg hover:bg-slate-800/80 transition"
                        title={t.controls.fullscreen}
                      >
                        <Maximize2 className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    {/* Recording indicator - only show when actually recording */}
                    {isRecording && (
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 bg-red-600/80 rounded-lg flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-white text-sm font-medium">{t.controls.record}</span>
                          {recordingTimeLeft > 0 && (
                            <span className="text-white/80 text-xs font-mono">
                              ({formatDuration(recordingTimeLeft)})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TextureCardStyled>

            {/* Violence Meter */}
            <TextureCardStyled>
              <TextureCardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-400 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Violence Level
                  </span>
                  <span className={cn('text-2xl font-bold', getViolenceColor(currentViolence))}>
                    {currentViolence.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full transition-colors', getViolenceBgColor(currentViolence))}
                    initial={{ width: 0 }}
                    animate={{ width: `${currentViolence}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                  <span>Safe</span>
                  <span>Moderate</span>
                  <span>Dangerous</span>
                </div>

                {/* VETO Status Indicator */}
                {detectionMode === 'server' && vetoStatus !== 'none' && (
                  <div className={cn(
                    'mt-4 p-3 rounded-lg border flex items-center justify-between',
                    vetoStatus === 'VETO_OVERRIDE'
                      ? 'bg-green-600/20 border-green-500/50'
                      : vetoStatus === 'PRIMARY_FAST'
                      ? 'bg-slate-700/50 border-slate-600/50'
                      : 'bg-orange-600/20 border-orange-500/50'
                  )}>
                    <div className="flex items-center gap-2">
                      <Shield className={cn(
                        'w-5 h-5',
                        vetoStatus === 'VETO_OVERRIDE' ? 'text-green-400' :
                        vetoStatus === 'PRIMARY_FAST' ? 'text-slate-400' : 'text-orange-400'
                      )} />
                      <div>
                        <p className={cn(
                          'text-sm font-medium',
                          vetoStatus === 'VETO_OVERRIDE' ? 'text-green-400' :
                          vetoStatus === 'PRIMARY_FAST' ? 'text-slate-300' : 'text-orange-400'
                        )}>
                          {vetoStatus === 'VETO_OVERRIDE' ? 'VETO Override' :
                           vetoStatus === 'PRIMARY_FAST' ? 'Fast Path' : 'Primary + VETO'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {vetoStatus === 'VETO_OVERRIDE'
                            ? 'False positive filtered by VETO model'
                            : vetoStatus === 'PRIMARY_FAST'
                            ? 'Low confidence - no VETO check needed'
                            : `VETO confirmed: ${((vetoScore ?? 0) * 100).toFixed(1)}%`}
                        </p>
                      </div>
                    </div>
                    {vetoScore !== null && vetoStatus !== 'PRIMARY_FAST' && (
                      <span className={cn(
                        'text-sm font-mono font-bold',
                        vetoStatus === 'VETO_OVERRIDE' ? 'text-green-400' : 'text-orange-400'
                      )}>
                        {(vetoScore * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </TextureCardContent>
            </TextureCardStyled>

            {/* Grid Camera View (if enabled) */}
            {isGridMode && gridCameras.length > 0 && (
              <TextureCardStyled>
                <TextureCardHeader className="pb-2">
                  <TextureCardTitle className="text-sm flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-amber-400" />
                    {gridCameras.length} Cameras Detected
                  </TextureCardTitle>
                </TextureCardHeader>
                <TextureCardContent>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                  >
                    {gridCameras.map((cam, i) => (
                      <div
                        key={i}
                        className={cn(
                          'aspect-video rounded-lg overflow-hidden border-2',
                          cam.violenceProb > 70 ? 'border-red-500' : 'border-slate-700'
                        )}
                      >
                        {cam.imageData ? (
                          <img src={cam.imageData} alt={`Camera ${i + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <Camera className="w-6 h-6 text-slate-600" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </TextureCardContent>
              </TextureCardStyled>
            )}
          </div>

          {/* Right Sidebar - Stats & Alerts (order-3 on all devices) */}
          <div className="col-span-12 lg:col-span-3 space-y-3 sm:space-y-4 order-3">
            {/* Session Stats */}
            <TextureCardStyled>
              <TextureCardHeader className="pb-3">
                <TextureCardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  {t.stats.title}
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureCardContent className="space-y-3">
                {[
                  { icon: Clock, label: t.stats.duration, value: formatDuration(stats?.sessionDuration ?? 0) },
                  { icon: Eye, label: t.stats.frames, value: (stats?.totalFrames ?? 0).toLocaleString() },
                  { icon: AlertTriangle, label: t.stats.violent, value: (stats?.violentFrames ?? 0).toLocaleString(), color: 'text-orange-400' },
                  { icon: Target, label: t.stats.peak, value: `${(stats?.peakViolence ?? 0).toFixed(1)}%`, color: (stats?.peakViolence ?? 0) > 70 ? 'text-red-400' : 'text-green-400' },
                  { icon: Cpu, label: t.stats.latency, value: `${(stats?.avgLatency ?? 0).toFixed(0)}ms` },
                  { icon: Shield, label: t.stats.fights, value: (stats?.fightCount ?? 0).toString(), color: (stats?.fightCount ?? 0) > 0 ? 'text-red-400' : 'text-green-400' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      {label}
                    </span>
                    <span className={cn('font-mono font-medium', color || 'text-white')}>{value}</span>
                  </div>
                ))}
              </TextureCardContent>
            </TextureCardStyled>

            {/* Alert History */}
            <TextureCardStyled>
              <TextureCardHeader className="pb-3">
                <TextureCardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  {t.alerts.title}
                </TextureCardTitle>
              </TextureCardHeader>
              <TextureCardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t.alerts.noAlerts}</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {alerts
                      .slice()
                      .reverse()
                      .map((alert, i) => (
                        <div
                          key={i}
                          className="p-3 bg-red-600/10 border border-red-500/30 rounded-lg flex items-center justify-between"
                        >
                          <div>
                            <div className="text-red-400 font-medium text-sm">{t.alerts.fightDetected}</div>
                            <div className="text-xs text-slate-500">{alert.time.toLocaleTimeString()}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-red-400 font-bold">{alert.confidence.toFixed(0)}%</div>
                            <div className="text-xs text-slate-500">{t.alerts.confidence}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TextureCardContent>
            </TextureCardStyled>

            {/* Model Info */}
            <TextureCardStyled>
              <TextureCardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-600/20">
                    <Zap className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {detectionMode === 'server' ? 'Smart Veto Ensemble' : 'MoveNet Lightning'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {detectionMode === 'server' ? 'STGCNPP 94% + MSG3D 85%' : 'TensorFlow.js WebGL'}
                    </div>
                  </div>
                </div>
                <TextureSeparator className="my-3" />
                {/* Settings source indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    settingsLoading ? 'bg-amber-500 animate-pulse' :
                    settingsAuthenticated ? 'bg-green-500' : 'bg-slate-500'
                  )} />
                  <span className={cn(
                    settingsLoading ? 'text-amber-400' :
                    settingsAuthenticated ? 'text-green-400' : 'text-slate-400'
                  )}>
                    {settingsLoading ? 'Loading settings...' :
                     settingsAuthenticated ? 'Per-user cloud settings' : 'Local settings'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Instant Trigger</span>
                    <span className="text-amber-400">{detectionSettings.instant_trigger_count}× at {detectionSettings.instant_trigger_threshold}%+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sustained Trigger</span>
                    <span className="text-amber-400">{detectionSettings.sustained_duration}s at {detectionSettings.sustained_threshold}%+</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Violence Cutoff</span>
                    <span className="text-red-400">{detectionSettings.primary_threshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VETO Threshold</span>
                    <span className="text-orange-400">&lt;{detectionSettings.veto_threshold}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto-Record</span>
                    <span className={detectionSettings.auto_record ? "text-green-400" : "text-slate-400"}>{detectionSettings.auto_record ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </TextureCardContent>
            </TextureCardStyled>
          </div>
        </div>
      </div>
    </div>
  );
}
