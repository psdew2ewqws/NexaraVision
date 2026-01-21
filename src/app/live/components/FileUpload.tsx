'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Brain,
  Activity,
  BarChart3,
  Shield,
  Video,
  Frame,
  X,
  RotateCcw,
} from 'lucide-react';
import { DetectionResult } from '@/components/live/DetectionResult';
import { uploadWithStreamingProgress } from '@/lib/api';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import type { DetectionResult as DetectionResultType } from '@/types/detection';
import {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
} from '@/components/ui/texture-card';
import { TextureButton } from '@/components/ui/texture-button';

interface ProcessingStage {
  stage: string;
  message: string;
  progress: number;
  timestamp: number;
}

interface VideoMetrics {
  filename: string;
  size_mb: number;
  duration?: number;
  fps?: number;
  resolution?: string;
  total_frames?: number;
}

export function FileUpload() {
  const { isRTL, locale } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<ProcessingStage | null>(null);
  const [result, setResult] = useState<DetectionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoMetrics, setVideoMetrics] = useState<VideoMetrics | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [timingInfo, setTimingInfo] = useState<{
    extraction_ms?: number;
    inference_ms?: number;
    total_ms?: number;
  } | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState<
    'idle' | 'upload' | 'validation' | 'extraction' | 'inference' | 'complete'
  >('idle');

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreview && videoRef.current) {
      const video = videoRef.current;
      video.currentTime = 0.5;
    }
  }, [videoPreview]);

  const resetState = () => {
    setUploading(false);
    setProgress(0);
    setCurrentStage(null);
    setResult(null);
    setError(null);
    setVideoPreview(null);
    setVideoMetrics(null);
    setCurrentFrame(0);
    setTimingInfo(null);
    setAnalysisPhase('idle');
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    setVideoMetrics({
      filename: file.name,
      size_mb: file.size / (1024 * 1024),
    });

    setUploading(true);
    setProgress(0);
    setCurrentStage(null);
    setError(null);
    setResult(null);
    setTimingInfo(null);
    setCurrentFrame(0);
    setAnalysisPhase('upload');

    const startTime = Date.now();

    try {
      const data = await uploadWithStreamingProgress(file, (update) => {
        const now = Date.now();

        if (update.type === 'progress') {
          const newStage: ProcessingStage = {
            stage: update.stage || 'processing',
            message: update.message || 'Processing...',
            progress: update.progress || 0,
            timestamp: now - startTime,
          };

          setCurrentStage(newStage);
          setProgress(update.progress || 0);

          if (update.stage?.includes('validation')) {
            setAnalysisPhase('validation');
          } else if (update.stage?.includes('extraction')) {
            setAnalysisPhase('extraction');
            if (update.frame) {
              setCurrentFrame(update.frame);
            }
          } else if (update.stage?.includes('inference')) {
            setAnalysisPhase('inference');
          }

          if (update.video_info) {
            setVideoMetrics((prev) => ({
              ...prev!,
              duration: update.video_info?.duration_seconds,
              fps: update.video_info?.fps,
              resolution: `${update.video_info?.width}x${update.video_info?.height}`,
              total_frames: update.video_info?.total_frames,
            }));
          }

          if (update.extraction_time_ms) {
            setTimingInfo((prev) => ({
              ...prev,
              extraction_ms: update.extraction_time_ms,
            }));
          }
          if (update.inference_time_ms) {
            setTimingInfo((prev) => ({
              ...prev,
              inference_ms: update.inference_time_ms,
            }));
          }
        } else if (update.type === 'start') {
          setCurrentStage({
            stage: 'upload',
            message: `Starting analysis of ${update.filename}`,
            progress: 0,
            timestamp: 0,
          });
        }
      });

      const totalTime = Date.now() - startTime;
      setTimingInfo((prev) => ({
        ...prev,
        total_ms: totalTime,
      }));

      setAnalysisPhase('complete');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setAnalysisPhase('idle');
    } finally {
      setUploading(false);
      setCurrentStage(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv'],
    },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'complete': return 'text-green-400';
      case 'inference': return 'text-purple-400';
      case 'extraction': return 'text-blue-400';
      case 'validation': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  const renderFrameGrid = () => {
    const frames = Array.from({ length: 20 }, (_, i) => i + 1);
    return (
      <div className="grid grid-cols-10 gap-1">
        {frames.map((frame) => (
          <motion.div
            key={frame}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: frame <= currentFrame ? 1 : 0.8,
              opacity: frame <= currentFrame ? 1 : 0.3
            }}
            className={cn(
              "h-3 rounded transition-all duration-300",
              frame <= currentFrame
                ? 'bg-gradient-to-r from-blue-500 to-blue-400 shadow-lg shadow-blue-500/50'
                : 'bg-slate-700',
              frame === currentFrame && 'animate-pulse'
            )}
          />
        ))}
      </div>
    );
  };

  const t = {
    dropHere: locale === 'ar' ? 'أفلت الفيديو هنا' : 'Drop Your Video Here',
    releaseToAnalyze: locale === 'ar' ? 'أفلت للتحليل' : 'Release to Analyze',
    advancedDetection: locale === 'ar' ? 'كشف العنف المتقدم بالتحليل الفوري' : 'Advanced Violence Detection with Real-Time Analysis',
    deepLearning: locale === 'ar' ? 'تعلم عميق' : 'Deep Learning',
    fastInference: locale === 'ar' ? 'استنتاج سريع' : 'Fast Inference',
    accurate: locale === 'ar' ? 'دقيق' : 'Accurate',
    videoPreview: locale === 'ar' ? 'معاينة الفيديو' : 'Video Preview',
    analyzing: locale === 'ar' ? 'جاري التحليل' : 'ANALYZING',
    analysisPipeline: locale === 'ar' ? 'خط أنابيب التحليل' : 'Analysis Pipeline',
    videoValidation: locale === 'ar' ? 'التحقق من الفيديو' : 'Video Validation',
    frameExtraction: locale === 'ar' ? 'استخراج الإطارات' : 'Frame Extraction',
    aiInference: locale === 'ar' ? 'استنتاج الذكاء الاصطناعي' : 'AI Inference',
    extractingFrames: locale === 'ar' ? 'استخراج الإطارات الرئيسية للتحليل الزمني' : 'Extracting key frames for temporal analysis',
    neuralNetwork: locale === 'ar' ? 'معالجة الشبكة العصبية' : 'Neural Network Processing',
    frames: locale === 'ar' ? 'إطار' : 'Frames',
    parameters: locale === 'ar' ? 'معامل' : 'Parameters',
    classes: locale === 'ar' ? 'فئات' : 'Classes',
    overallProgress: locale === 'ar' ? 'التقدم الإجمالي' : 'Overall Progress',
    extraction: locale === 'ar' ? 'استخراج' : 'Extraction',
    inference: locale === 'ar' ? 'استنتاج' : 'Inference',
    elapsed: locale === 'ar' ? 'المنقضي' : 'Elapsed',
    analysisComplete: locale === 'ar' ? 'اكتمل التحليل!' : 'Analysis Complete!',
    analyzeAnother: locale === 'ar' ? 'تحليل فيديو آخر' : 'Analyze Another',
  };

  return (
    <div className={cn("space-y-6", isRTL && "text-right")}>
      {/* Upload Area */}
      <AnimatePresence mode="wait">
        {!uploading && !result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "relative border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden",
                isDragActive
                  ? 'border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/20'
                  : 'border-white/20 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/50'
              )}
            >
              <input {...getInputProps()} />
              <div className="p-12">
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{ scale: isDragActive ? 1.1 : 1 }}
                    className="relative inline-block"
                  >
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Upload className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      AI
                    </div>
                  </motion.div>
                  <div>
                    <p className="text-xl font-bold text-white">
                      {isDragActive ? t.releaseToAnalyze : t.dropHere}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      {t.advancedDetection}
                    </p>
                    <div className={cn("flex justify-center gap-3 mt-4", isRTL && "flex-row-reverse")}>
                      <span className="inline-flex items-center gap-1.5 text-xs bg-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                        <Brain className="h-3 w-3 text-purple-400" /> {t.deepLearning}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs bg-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                        <Zap className="h-3 w-3 text-yellow-400" /> {t.fastInference}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs bg-slate-700/50 px-3 py-1.5 rounded-full text-slate-300">
                        <Shield className="h-3 w-3 text-green-400" /> {t.accurate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Professional Analysis Dashboard */}
      <AnimatePresence>
        {uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Video Preview + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Video Preview Card */}
              <TextureCardStyled className="overflow-hidden">
                <TextureCardHeader className="pb-2">
                  <TextureCardTitle className={cn("text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Video className="h-4 w-4 text-blue-400" />
                    {t.videoPreview}
                  </TextureCardTitle>
                </TextureCardHeader>
                <TextureCardContent className="p-0">
                  {videoPreview && (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={videoPreview}
                        className="w-full h-48 object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className={cn("absolute bottom-2 left-2 right-2", isRTL && "text-right")}>
                        <p className="text-xs text-white font-mono truncate">
                          {videoMetrics?.filename}
                        </p>
                        <div className={cn("flex gap-3 mt-1", isRTL && "flex-row-reverse")}>
                          <span className="text-xs text-slate-300">
                            {videoMetrics?.size_mb.toFixed(1)} MB
                          </span>
                          {videoMetrics?.duration && (
                            <span className="text-xs text-slate-300">
                              {videoMetrics.duration.toFixed(1)}s
                            </span>
                          )}
                          {videoMetrics?.fps && (
                            <span className="text-xs text-slate-300">{videoMetrics.fps} FPS</span>
                          )}
                        </div>
                      </div>
                      <div className={cn("absolute top-2", isRTL ? "left-2" : "right-2")}>
                        <div className="bg-blue-500/90 text-white text-[10px] px-2 py-1 rounded font-mono animate-pulse">
                          {t.analyzing}
                        </div>
                      </div>
                    </div>
                  )}
                </TextureCardContent>
              </TextureCardStyled>

              {/* Analysis Status Card */}
              <TextureCardStyled>
                <TextureCardHeader className="pb-2">
                  <TextureCardTitle className={cn("text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Activity className={`h-4 w-4 ${getPhaseColor(analysisPhase)} animate-pulse`} />
                    {t.analysisPipeline}
                  </TextureCardTitle>
                </TextureCardHeader>
                <TextureCardContent className="space-y-3">
                  <div className="space-y-2">
                    {[
                      { name: t.videoValidation, icon: Shield, phase: 'validation', color: 'text-yellow-400' },
                      { name: t.frameExtraction, icon: Frame, phase: 'extraction', color: 'text-blue-400' },
                      { name: t.aiInference, icon: Brain, phase: 'inference', color: 'text-purple-400' },
                    ].map((step, i) => (
                      <div key={i} className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <step.icon
                          className={cn(
                            "h-4 w-4",
                            analysisPhase === step.phase
                              ? `${step.color} animate-pulse`
                              : analysisPhase === 'complete' ||
                                  ['validation', 'extraction', 'inference'].indexOf(analysisPhase) >
                                    ['validation', 'extraction', 'inference'].indexOf(step.phase)
                                ? 'text-green-400'
                                : 'text-slate-600'
                          )}
                        />
                        <span className={cn(
                          "text-xs",
                          analysisPhase === step.phase ? 'text-white font-semibold' : 'text-slate-400'
                        )}>
                          {step.name}
                        </span>
                        {analysisPhase === step.phase && (
                          <div className={isRTL ? "mr-auto" : "ml-auto"}>
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {currentStage && (
                    <div className="mt-3 p-2 bg-slate-800/50 rounded-lg border border-white/10">
                      <p className="text-xs text-slate-300 truncate">{currentStage.message}</p>
                    </div>
                  )}
                </TextureCardContent>
              </TextureCardStyled>
            </div>

            {/* Frame Extraction Progress */}
            <AnimatePresence>
              {analysisPhase === 'extraction' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TextureCardStyled>
                    <TextureCardHeader className="pb-2">
                      <TextureCardTitle className={cn("text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Frame className="h-4 w-4 text-blue-400" />
                        {t.frameExtraction}
                        <span className={cn("text-xs font-mono text-blue-400", isRTL ? "mr-auto" : "ml-auto")}>
                          {currentFrame}/20 {t.frames.toLowerCase()}
                        </span>
                      </TextureCardTitle>
                    </TextureCardHeader>
                    <TextureCardContent>
                      {renderFrameGrid()}
                      <p className="text-xs text-slate-400 mt-2 text-center">
                        {t.extractingFrames}
                      </p>
                    </TextureCardContent>
                  </TextureCardStyled>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Inference Visualization */}
            <AnimatePresence>
              {analysisPhase === 'inference' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <TextureCardStyled className="border-purple-500/20">
                    <TextureCardHeader className="pb-2">
                      <TextureCardTitle className={cn("text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
                        <Brain className="h-4 w-4 text-purple-400 animate-pulse" />
                        {t.neuralNetwork}
                      </TextureCardTitle>
                    </TextureCardHeader>
                    <TextureCardContent>
                      <div className={cn("grid grid-cols-3 gap-3", isRTL && "text-right")}>
                        <div className="text-center p-3 bg-purple-500/10 rounded-xl">
                          <p className="text-lg font-mono text-purple-400">20</p>
                          <p className="text-[10px] text-slate-400">{t.frames}</p>
                        </div>
                        <div className="text-center p-3 bg-purple-500/10 rounded-xl">
                          <p className="text-lg font-mono text-purple-400">2.3M</p>
                          <p className="text-[10px] text-slate-400">{t.parameters}</p>
                        </div>
                        <div className="text-center p-3 bg-purple-500/10 rounded-xl">
                          <p className="text-lg font-mono text-purple-400">2</p>
                          <p className="text-[10px] text-slate-400">{t.classes}</p>
                        </div>
                      </div>
                    </TextureCardContent>
                  </TextureCardStyled>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Overall Progress */}
            <TextureCardStyled>
              <TextureCardContent className="pt-4">
                <div className={cn("flex justify-between text-sm text-slate-400 mb-2", isRTL && "flex-row-reverse")}>
                  <span>{t.overallProgress}</span>
                  <span className="font-mono">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3 bg-slate-700" />
                {timingInfo && (
                  <div className={cn("grid grid-cols-3 gap-4 mt-4", isRTL && "text-right")}>
                    {timingInfo.extraction_ms && (
                      <div className="text-center p-2 bg-slate-800/50 rounded-xl">
                        <BarChart3 className="h-4 w-4 mx-auto text-blue-400 mb-1" />
                        <p className="text-lg font-mono text-blue-400">
                          {timingInfo.extraction_ms.toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-400">{t.extraction} (ms)</p>
                      </div>
                    )}
                    {timingInfo.inference_ms && (
                      <div className="text-center p-2 bg-slate-800/50 rounded-xl">
                        <Zap className="h-4 w-4 mx-auto text-green-400 mb-1" />
                        <p className="text-lg font-mono text-green-400">
                          {timingInfo.inference_ms.toFixed(0)}
                        </p>
                        <p className="text-[10px] text-slate-400">{t.inference} (ms)</p>
                      </div>
                    )}
                    <div className="text-center p-2 bg-slate-800/50 rounded-xl">
                      <Clock className="h-4 w-4 mx-auto text-yellow-400 mb-1" />
                      <p className="text-lg font-mono text-yellow-400">
                        {currentStage ? (currentStage.timestamp / 1000).toFixed(1) : '0.0'}
                      </p>
                      <p className="text-[10px] text-slate-400">{t.elapsed} (s)</p>
                    </div>
                  </div>
                )}
              </TextureCardContent>
            </TextureCardStyled>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TextureCardStyled className="border-red-500/30 bg-red-500/10">
              <TextureCardContent className={cn("flex items-center gap-3 py-4", isRTL && "flex-row-reverse")}>
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 flex-1">{error}</p>
                <TextureButton variant="ghost" size="sm" onClick={resetState}>
                  <X className="h-4 w-4" />
                </TextureButton>
              </TextureCardContent>
            </TextureCardStyled>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message & Results */}
      <AnimatePresence>
        {result && !uploading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <TextureCardStyled className="border-green-500/30 bg-green-500/10">
              <TextureCardContent className={cn("flex items-center gap-3 py-4", isRTL && "flex-row-reverse")}>
                <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-semibold text-green-400">{t.analysisComplete}</span>
                  {timingInfo?.inference_ms && (
                    <span className={cn("font-mono bg-green-500/20 px-2 py-0.5 rounded text-sm text-green-300", isRTL ? "mr-2" : "ml-2")}>
                      {timingInfo.inference_ms.toFixed(0)}ms
                    </span>
                  )}
                </div>
                <TextureButton variant="ghost" size="sm" onClick={resetState}>
                  <RotateCcw className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
                  {t.analyzeAnother}
                </TextureButton>
              </TextureCardContent>
            </TextureCardStyled>

            <DetectionResult result={result} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
