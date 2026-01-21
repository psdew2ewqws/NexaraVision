'use client';

import { useLanguage } from '@/i18n/LanguageContext';
import {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardContent,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { cn } from '@/lib/utils';

// Inline SVG Icons
const Icons = {
  brain: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2a5 5 0 00-5 5v1a5 5 0 00-2 4v1a4 4 0 002 3.46V17a5 5 0 0010 0v-.54A4 4 0 0019 13v-1a5 5 0 00-2-4V7a5 5 0 00-5-5z" />
      <path d="M10 8.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm7 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  cpu: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  ),
  database: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  trendingUp: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  layers: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  gitBranch: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 01-9 9" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

// Translations
const translations = {
  en: {
    title: 'AI Models & Training',
    subtitle: 'Skeleton-based violence detection using Graph Convolutional Networks',
    architecture: {
      title: 'System Architecture',
      pose: {
        title: 'Pose Extraction',
        model: 'YOLO v26 X-Large',
        desc: 'Extracts 17 COCO keypoints from video frames for skeleton-based analysis. High accuracy pose detection for reliable skeleton data.',
      },
      gcn: {
        title: 'GCN Models',
        model: 'MSG3D + STGCNPP',
        desc: 'Graph Convolutional Networks analyze skeleton sequences. Multi-scale temporal convolutions capture motion patterns.',
      },
      ensemble: {
        title: 'Smart Veto Ensemble',
        model: 'Dual-model verification',
        desc: 'PRIMARY model detects violence, VETO model filters false positives. Optimized for high sensitivity with low false alarm rate.',
      },
    },
    primary: {
      title: 'MSG3D (Primary Model)',
      accuracy: '88.2% Accuracy',
      architecture: 'Architecture',
      archValue: '6 MSG3D Blocks',
      temporal: 'Temporal Kernels',
      tempValue: '3, 5, 7 (Multi-scale)',
      training: 'Training Data',
      trainValue: 'SCVD + NTU120',
      samples: 'Samples',
      samplesValue: '9,288',
      desc: 'Multi-Scale Graph 3D with multi-scale temporal convolutions. Trained on SCVD (surveillance camera) + NTU120 for real-world CCTV scenarios. More conservative detection for reduced false positives.',
      status: 'Active - Threshold: 90%',
    },
    veto: {
      title: 'STGCNPP (Veto Model)',
      accuracy: '89.8% Accuracy',
      architecture: 'Architecture',
      archValue: '6 STGCN++ Blocks',
      temporal: 'Temporal Conv',
      tempValue: '9×1 Kernel',
      training: 'Training Data',
      trainValue: 'SCVD + NTU120',
      role: 'Role',
      roleValue: 'FP Filter',
      desc: 'Spatial-Temporal Graph Convolutional Network++ with conservative predictions. Trained on surveillance footage for better real-world false positive filtering.',
      status: 'Active - Veto Threshold: 4%',
    },
    logic: {
      title: 'Smart Veto Ensemble Decision Logic',
      high: 'HIGH CONFIDENCE',
      highDesc: 'If PRIMARY > 90% AND VETO > 4%',
      highResult: 'Violence Detected',
      override: 'VETO OVERRIDE',
      overrideDesc: 'If VETO < 4%',
      overrideResult: 'Non-Violence (False Positive Filtered)',
      sustained: 'SUSTAINED DETECTION',
      sustainedDesc: 'Violence confirmed after 2 seconds sustained OR 3× hits at 95%+ confidence',
      sustainedResult: 'FIGHT DETECTED Alert',
    },
    results: {
      title: 'Training Results (NTU120 Combinations)',
      samples: 'samples',
      architecture: 'architecture',
    },
    datasets: {
      title: 'Training Datasets',
      infrastructure: 'Training Infrastructure',
      infraDesc: 'Models trained on Vast.ai with NVIDIA A100 GPU (48GB VRAM). Training configuration: 30 epochs, batch size optimized for GPU memory, AdamW optimizer with learning rate scheduling.',
    },
  },
  ar: {
    title: 'نماذج الذكاء الاصطناعي والتدريب',
    subtitle: 'كشف العنف باستخدام الشبكات التلافيفية للرسم البياني',
    architecture: {
      title: 'هندسة النظام',
      pose: {
        title: 'استخراج الوضعية',
        model: 'YOLO v26 X-Large',
        desc: 'استخراج 17 نقطة مفصلية من إطارات الفيديو للتحليل. دقة عالية في اكتشاف الوضعية.',
      },
      gcn: {
        title: 'نماذج GCN',
        model: 'MSG3D + STGCNPP',
        desc: 'الشبكات التلافيفية للرسم البياني تحلل تسلسلات الهيكل العظمي.',
      },
      ensemble: {
        title: 'مجموعة الفيتو الذكية',
        model: 'التحقق بنموذجين',
        desc: 'النموذج الأساسي يكشف العنف، نموذج الفيتو يصفي الإيجابيات الخاطئة.',
      },
    },
    primary: {
      title: 'MSG3D (النموذج الأساسي)',
      accuracy: '88.2% دقة',
      architecture: 'الهندسة',
      archValue: '6 كتل MSG3D',
      temporal: 'نوى زمنية',
      tempValue: '3، 5، 7 (متعدد المقاييس)',
      training: 'بيانات التدريب',
      trainValue: 'SCVD + NTU120',
      samples: 'العينات',
      samplesValue: '9,288',
      desc: 'رسم بياني ثلاثي الأبعاد متعدد المقاييس. مدرب على كاميرات المراقبة.',
      status: 'نشط - العتبة: 90%',
    },
    veto: {
      title: 'STGCNPP (نموذج الفيتو)',
      accuracy: '89.8% دقة',
      architecture: 'الهندسة',
      archValue: '6 كتل STGCN++',
      temporal: 'التفاف زمني',
      tempValue: 'نواة 9×1',
      training: 'بيانات التدريب',
      trainValue: 'SCVD + NTU120',
      role: 'الدور',
      roleValue: 'مرشح FP',
      desc: 'شبكة تلافيفية مكانية-زمنية للرسم البياني++ مع تنبؤات محافظة.',
      status: 'نشط - عتبة الفيتو: 4%',
    },
    logic: {
      title: 'منطق قرار مجموعة الفيتو الذكية',
      high: 'ثقة عالية',
      highDesc: 'إذا كان PRIMARY > 90% و VETO > 4%',
      highResult: 'تم اكتشاف عنف',
      override: 'تجاوز الفيتو',
      overrideDesc: 'إذا كان VETO < 4%',
      overrideResult: 'لا عنف (إيجابية خاطئة مصفاة)',
      sustained: 'كشف مستمر',
      sustainedDesc: 'تأكيد العنف بعد ثانيتين أو 3 ضربات بنسبة 95%+',
      sustainedResult: 'تنبيه اكتشاف مشاجرة',
    },
    results: {
      title: 'نتائج التدريب (مجموعات NTU120)',
      samples: 'عينات',
      architecture: 'هندسة',
    },
    datasets: {
      title: 'مجموعات بيانات التدريب',
      infrastructure: 'بنية التدريب التحتية',
      infraDesc: 'تم تدريب النماذج على Vast.ai باستخدام NVIDIA A100 GPU (48GB VRAM).',
    },
  },
};

// Training data from memory - sorted by lowest confidence first (user preference)
const trainingResults = [
  { name: 'MSG3D SCVD+NTU', accuracy: 88.2, samples: 9288, model: 'MSG3D', primary: true },
  { name: 'STGCNPP SCVD+NTU', accuracy: 89.8, samples: 9288, model: 'STGCNPP', veto: true },
  { name: 'STGCNPP RWF+NTU', accuracy: 92.4, samples: 8194, model: 'STGCNPP', primary: false },
  { name: 'MSG3D RWF+NTU', accuracy: 92.5, samples: 8194, model: 'MSG3D', primary: false },
  { name: 'STGCNPP Kaggle+NTU', accuracy: 94.6, samples: 8174, model: 'STGCNPP', primary: false },
  { name: 'MSG3D Kaggle+NTU', accuracy: 95.2, samples: 8174, model: 'MSG3D', primary: false },
];

const datasets = [
  { name: 'NTU RGB+D 120', samples: 6614, description: { en: 'Large-scale action recognition dataset', ar: 'مجموعة بيانات التعرف على الأفعال واسعة النطاق' } },
  { name: 'Kaggle Violence', samples: 1560, description: { en: 'Curated violence detection dataset', ar: 'مجموعة بيانات كشف العنف المنتقاة' } },
  { name: 'RWF-2000', samples: 1580, description: { en: 'Real-world fighting dataset', ar: 'مجموعة بيانات القتال في العالم الحقيقي' } },
  { name: 'SCVD', samples: 2674, description: { en: 'Surveillance camera violence detection', ar: 'كشف العنف بكاميرات المراقبة' } },
];

export default function ModelsPage() {
  const { isRTL, locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6', isRTL && 'rtl')}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>

        {/* Architecture Overview */}
        <TextureCardStyled className="mb-6">
          <TextureCardHeader>
            <TextureCardTitle className="flex items-center gap-2">
              <span className="text-orange-400">{Icons.layers}</span>
              {t.architecture.title}
            </TextureCardTitle>
          </TextureCardHeader>
          <TextureCardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pose Extraction */}
              <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <span className="text-orange-400">{Icons.target}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t.architecture.pose.title}</h3>
                    <p className="text-sm text-slate-400">{t.architecture.pose.model}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{t.architecture.pose.desc}</p>
              </div>

              {/* GCN Models */}
              <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <span className="text-emerald-400">{Icons.brain}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t.architecture.gcn.title}</h3>
                    <p className="text-sm text-slate-400">{t.architecture.gcn.model}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{t.architecture.gcn.desc}</p>
              </div>

              {/* Smart Ensemble */}
              <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <span className="text-red-400">{Icons.gitBranch}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{t.architecture.ensemble.title}</h3>
                    <p className="text-sm text-slate-400">{t.architecture.ensemble.model}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{t.architecture.ensemble.desc}</p>
              </div>
            </div>
          </TextureCardContent>
        </TextureCardStyled>

        {/* Active Models - Using lowest confidence models (SCVD+NTU) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* MSG3D Primary Model */}
          <TextureCardStyled className="border-emerald-500/30">
            <TextureCardHeader>
              <TextureCardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-emerald-400">{Icons.brain}</span>
                  {t.primary.title}
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  {t.primary.accuracy}
                </span>
              </TextureCardTitle>
            </TextureCardHeader>
            <TextureCardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.primary.architecture}</p>
                  <p className="font-semibold text-white">{t.primary.archValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.primary.temporal}</p>
                  <p className="font-semibold text-white">{t.primary.tempValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.primary.training}</p>
                  <p className="font-semibold text-white">{t.primary.trainValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.primary.samples}</p>
                  <p className="font-semibold text-white">{t.primary.samplesValue}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400">{t.primary.desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">{Icons.checkCircle}</span>
                <span className="text-sm text-emerald-400">{t.primary.status}</span>
              </div>
            </TextureCardContent>
          </TextureCardStyled>

          {/* STGCNPP Veto Model */}
          <TextureCardStyled className="border-red-500/30">
            <TextureCardHeader>
              <TextureCardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-red-400">{Icons.shield}</span>
                  {t.veto.title}
                </span>
                <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium">
                  {t.veto.accuracy}
                </span>
              </TextureCardTitle>
            </TextureCardHeader>
            <TextureCardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.veto.architecture}</p>
                  <p className="font-semibold text-white">{t.veto.archValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.veto.temporal}</p>
                  <p className="font-semibold text-white">{t.veto.tempValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.veto.training}</p>
                  <p className="font-semibold text-white">{t.veto.trainValue}</p>
                </div>
                <div className="bg-slate-900/50 border border-white/[0.06] rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t.veto.role}</p>
                  <p className="font-semibold text-white">{t.veto.roleValue}</p>
                </div>
              </div>
              <p className="text-sm text-slate-400">{t.veto.desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-red-400">{Icons.checkCircle}</span>
                <span className="text-sm text-red-400">{t.veto.status}</span>
              </div>
            </TextureCardContent>
          </TextureCardStyled>
        </div>

        {/* Smart Veto Ensemble Logic */}
        <TextureCardStyled className="mb-6">
          <TextureCardHeader>
            <TextureCardTitle className="flex items-center gap-2">
              <span className="text-amber-400">{Icons.zap}</span>
              {t.logic.title}
            </TextureCardTitle>
          </TextureCardHeader>
          <TextureCardContent className="space-y-3">
            <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {t.logic.high}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {t.logic.highDesc} → <strong className="text-emerald-400">{t.logic.highResult}</strong>
              </p>
            </div>
            <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 border-l-4 border-l-red-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium">
                  {t.logic.override}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {t.logic.overrideDesc} → <strong className="text-red-400">{t.logic.overrideResult}</strong>
              </p>
            </div>
            <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                  {t.logic.sustained}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                {t.logic.sustainedDesc} → <strong className="text-amber-400">{t.logic.sustainedResult}</strong>
              </p>
            </div>
          </TextureCardContent>
        </TextureCardStyled>

        {/* Training Results */}
        <TextureCardStyled className="mb-6">
          <TextureCardHeader>
            <TextureCardTitle className="flex items-center gap-2">
              <span className="text-orange-400">{Icons.trendingUp}</span>
              {t.results.title}
            </TextureCardTitle>
          </TextureCardHeader>
          <TextureCardContent className="space-y-4">
            {trainingResults.map((result, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{result.name}</span>
                    {result.primary && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs">
                        PRIMARY
                      </span>
                    )}
                    {result.veto && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs">
                        VETO
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-white">{result.accuracy}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      result.accuracy >= 94 ? 'bg-emerald-500' :
                      result.accuracy >= 92 ? 'bg-amber-500' :
                      result.accuracy >= 90 ? 'bg-orange-500' : 'bg-red-500'
                    )}
                    style={{ width: `${result.accuracy}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  {result.samples.toLocaleString()} {t.results.samples} • {result.model} {t.results.architecture}
                </p>
              </div>
            ))}
          </TextureCardContent>
        </TextureCardStyled>

        {/* Training Datasets */}
        <TextureCardStyled>
          <TextureCardHeader>
            <TextureCardTitle className="flex items-center gap-2">
              <span className="text-red-400">{Icons.database}</span>
              {t.datasets.title}
            </TextureCardTitle>
          </TextureCardHeader>
          <TextureCardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {datasets.map((dataset, index) => (
                <div
                  key={index}
                  className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-white">{dataset.name}</h4>
                    <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-xs border border-white/[0.06]">
                      {dataset.samples.toLocaleString()} samples
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {dataset.description[locale as 'en' | 'ar'] || dataset.description.en}
                  </p>
                </div>
              ))}
            </div>
            <TextureSeparator className="my-4" />
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400">{Icons.cpu}</span>
                <span className="font-semibold text-orange-400">{t.datasets.infrastructure}</span>
              </div>
              <p className="text-sm text-slate-400">{t.datasets.infraDesc}</p>
            </div>
          </TextureCardContent>
        </TextureCardStyled>
      </div>
    </div>
  );
}
