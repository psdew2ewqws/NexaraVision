'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';

// Translations
const translations = {
  en: {
    hero: {
      badge: 'Enterprise AI Security',
      title: 'Smart Veto Detection System',
      subtitle: 'Dual-model AI architecture achieving 89.8% accuracy with minimal false positives. Purpose-built for enterprise security monitoring.',
      cta: 'View Research Paper',
      ctaSecondary: 'Configure Models',
    },
    stats: [
      { value: '89.8%', label: 'Accuracy', color: 'emerald' },
      { value: '<0.5%', label: 'False Positive Rate', color: 'blue' },
      { value: '30 FPS', label: 'Processing Speed', color: 'purple' },
      { value: '9,288', label: 'Training Samples', color: 'amber' },
    ],
    architecture: {
      title: 'System Architecture',
      subtitle: 'Three-stage pipeline for real-time violence detection',
      stages: [
        {
          step: '01',
          title: 'Pose Extraction',
          model: 'YOLO v26 X-Large',
          description: 'Extracts 17 COCO keypoints from video frames at 30 FPS. High-precision pose estimation provides reliable skeleton data for downstream analysis.',
          color: 'orange',
        },
        {
          step: '02',
          title: 'GCN Analysis',
          model: 'MSG3D + ST-GCN++',
          description: 'Graph Convolutional Networks analyze skeleton sequences. Multi-scale temporal convolutions capture motion patterns across different time horizons.',
          color: 'emerald',
        },
        {
          step: '03',
          title: 'Smart Veto',
          model: 'Dual-Model Ensemble',
          description: 'PRIMARY model detects violence, VETO model filters false positives. This ensemble approach optimizes for high sensitivity with low false alarm rate.',
          color: 'red',
        },
      ],
    },
    models: {
      title: 'Active Models',
      subtitle: 'Trained on surveillance camera footage for real-world performance',
      primary: {
        badge: 'PRIMARY',
        name: 'MSG3D',
        fullName: 'Multi-Scale Graph 3D',
        accuracy: '88.2%',
        threshold: 'Threshold: 50%',
        architecture: '6 MSG3D Blocks',
        temporal: 'Multi-scale (3, 5, 7)',
        training: 'SCVD + NTU120',
        samples: '9,288 samples',
        description: 'Trained on surveillance camera footage combined with NTU120 action recognition dataset. More conservative detection for reduced false positives in real-world CCTV scenarios.',
      },
      veto: {
        badge: 'VETO',
        name: 'ST-GCN++',
        fullName: 'Spatial-Temporal GCN++',
        accuracy: '89.8%',
        threshold: 'Threshold: 4%',
        architecture: '6 STGCN++ Blocks',
        temporal: '9×1 Kernel',
        training: 'SCVD + NTU120',
        role: 'False Positive Filter',
        description: 'Conservative model trained to identify non-violence patterns. When VETO score is below threshold, it overrides PRIMARY detection to SAFE, reducing false alarms.',
      },
    },
    logic: {
      title: 'Decision Logic',
      rules: [
        { condition: 'PRIMARY > 50% AND VETO > 4%', result: 'Violence Detected', type: 'detect' },
        { condition: 'VETO < 4%', result: 'Non-Violence (Override)', type: 'safe' },
        { condition: 'Sustained 2s OR 3× at 95%+', result: 'FIGHT DETECTED Alert', type: 'alert' },
      ],
    },
    results: {
      title: 'Training Results',
      subtitle: 'All model combinations evaluated on NTU120 dataset',
      note: 'SCVD+NTU combination selected for deployment: lower raw accuracy but better real-world performance on surveillance footage',
    },
    datasets: {
      title: 'Training Datasets',
      infrastructure: {
        title: 'Training Infrastructure',
        description: 'Models trained on Vast.ai cloud infrastructure with NVIDIA A100 GPU (48GB VRAM). Configuration: 30 epochs, batch size optimized for GPU memory, AdamW optimizer with cosine learning rate scheduling.',
      },
    },
    research: {
      title: 'Research & Publications',
      subtitle: 'Academic foundation and methodology documentation',
      paper: {
        title: 'Smart Veto Ensemble: Dual-Model Violence Detection',
        authors: 'NexaraVision Research Team',
        abstract: 'This paper presents the Smart Veto ensemble approach for real-time violence detection in surveillance footage. By combining aggressive detection with conservative verification, the system achieves high sensitivity while maintaining low false positive rates suitable for enterprise deployment.',
        sections: [
          'Skeleton-based action recognition methodology',
          'Dual-model ensemble architecture',
          'Surveillance-specific training approach',
          'Real-world deployment considerations',
        ],
        download: 'Download Research Paper',
      },
    },
    footer: {
      copyright: '© 2026 NexaraVision. Enterprise-grade AI security monitoring.',
      links: ['Privacy', 'Terms', 'Contact'],
    },
  },
  ar: {
    hero: {
      badge: 'أمان الذكاء الاصطناعي للمؤسسات',
      title: 'نظام كشف الفيتو الذكي',
      subtitle: 'هندسة ذكاء اصطناعي مزدوجة تحقق دقة 89.8% مع أدنى معدل إيجابيات كاذبة. مصمم خصيصاً لمراقبة أمن المؤسسات.',
      cta: 'عرض ورقة البحث',
      ctaSecondary: 'تكوين النماذج',
    },
    stats: [
      { value: '89.8%', label: 'الدقة', color: 'emerald' },
      { value: '<0.5%', label: 'معدل الإيجابيات الكاذبة', color: 'blue' },
      { value: '30 FPS', label: 'سرعة المعالجة', color: 'purple' },
      { value: '9,288', label: 'عينات التدريب', color: 'amber' },
    ],
    architecture: {
      title: 'هندسة النظام',
      subtitle: 'خط أنابيب من ثلاث مراحل للكشف عن العنف في الوقت الفعلي',
      stages: [
        {
          step: '01',
          title: 'استخراج الوضعية',
          model: 'YOLO v26 X-Large',
          description: 'يستخرج 17 نقطة مفصلية من إطارات الفيديو بسرعة 30 إطار/ثانية. تقدير وضعية عالي الدقة يوفر بيانات هيكل عظمي موثوقة.',
          color: 'orange',
        },
        {
          step: '02',
          title: 'تحليل GCN',
          model: 'MSG3D + ST-GCN++',
          description: 'الشبكات التلافيفية للرسم البياني تحلل تسلسلات الهيكل العظمي. التفافات زمنية متعددة المقاييس تلتقط أنماط الحركة.',
          color: 'emerald',
        },
        {
          step: '03',
          title: 'الفيتو الذكي',
          model: 'مجموعة ثنائية النماذج',
          description: 'النموذج الأساسي يكشف العنف، نموذج الفيتو يرشح الإيجابيات الكاذبة. هذا النهج يحسن الحساسية مع معدل إنذارات كاذبة منخفض.',
          color: 'red',
        },
      ],
    },
    models: {
      title: 'النماذج النشطة',
      subtitle: 'مدربة على لقطات كاميرات المراقبة للأداء في العالم الحقيقي',
      primary: {
        badge: 'أساسي',
        name: 'MSG3D',
        fullName: 'رسم بياني ثلاثي الأبعاد متعدد المقاييس',
        accuracy: '88.2%',
        threshold: 'الحد: 50%',
        architecture: '6 كتل MSG3D',
        temporal: 'متعدد المقاييس (3، 5، 7)',
        training: 'SCVD + NTU120',
        samples: '9,288 عينة',
        description: 'مدرب على لقطات كاميرات المراقبة مع مجموعة بيانات NTU120. كشف أكثر تحفظاً لتقليل الإيجابيات الكاذبة.',
      },
      veto: {
        badge: 'فيتو',
        name: 'ST-GCN++',
        fullName: 'شبكة تلافيفية مكانية-زمنية++',
        accuracy: '89.8%',
        threshold: 'الحد: 4%',
        architecture: '6 كتل STGCN++',
        temporal: 'نواة 9×1',
        training: 'SCVD + NTU120',
        role: 'مرشح الإيجابيات الكاذبة',
        description: 'نموذج محافظ مدرب على تحديد أنماط عدم العنف. عندما تكون درجة الفيتو أقل من الحد، يتجاوز الكشف الأساسي إلى آمن.',
      },
    },
    logic: {
      title: 'منطق القرار',
      rules: [
        { condition: 'أساسي > 50% و فيتو > 4%', result: 'تم اكتشاف عنف', type: 'detect' },
        { condition: 'فيتو < 4%', result: 'لا عنف (تجاوز)', type: 'safe' },
        { condition: 'مستمر 2ث أو 3× عند 95%+', result: 'تنبيه مشاجرة', type: 'alert' },
      ],
    },
    results: {
      title: 'نتائج التدريب',
      subtitle: 'جميع مجموعات النماذج تم تقييمها على مجموعة بيانات NTU120',
      note: 'تم اختيار مجموعة SCVD+NTU للنشر: دقة خام أقل لكن أداء أفضل في العالم الحقيقي على لقطات المراقبة',
    },
    datasets: {
      title: 'مجموعات بيانات التدريب',
      infrastructure: {
        title: 'بنية التدريب التحتية',
        description: 'تم تدريب النماذج على بنية Vast.ai السحابية باستخدام NVIDIA A100 GPU (48GB VRAM). التكوين: 30 حقبة، حجم دفعة محسن للذاكرة.',
      },
    },
    research: {
      title: 'البحث والمنشورات',
      subtitle: 'الأساس الأكاديمي وتوثيق المنهجية',
      paper: {
        title: 'مجموعة الفيتو الذكي: كشف العنف ثنائي النموذج',
        authors: 'فريق أبحاث نكسارا فيجن',
        abstract: 'تقدم هذه الورقة نهج مجموعة الفيتو الذكي للكشف عن العنف في الوقت الفعلي في لقطات المراقبة. من خلال الجمع بين الكشف العدواني والتحقق المحافظ، يحقق النظام حساسية عالية مع الحفاظ على معدلات إيجابيات كاذبة منخفضة.',
        sections: [
          'منهجية التعرف على الأفعال القائمة على الهيكل العظمي',
          'هندسة المجموعة ثنائية النموذج',
          'نهج التدريب الخاص بالمراقبة',
          'اعتبارات النشر في العالم الحقيقي',
        ],
        download: 'تحميل ورقة البحث',
      },
    },
    footer: {
      copyright: '© 2026 نكسارا فيجن. مراقبة أمنية بالذكاء الاصطناعي للمؤسسات.',
      links: ['الخصوصية', 'الشروط', 'اتصل بنا'],
    },
  },
};

// Training results data
const trainingResults = [
  { name: 'MSG3D SCVD+NTU', accuracy: 88.2, model: 'MSG3D', primary: true },
  { name: 'STGCNPP SCVD+NTU', accuracy: 89.8, model: 'STGCNPP', veto: true },
  { name: 'STGCNPP RWF+NTU', accuracy: 92.4, model: 'STGCNPP' },
  { name: 'MSG3D RWF+NTU', accuracy: 92.5, model: 'MSG3D' },
  { name: 'STGCNPP Kaggle+NTU', accuracy: 94.6, model: 'STGCNPP' },
  { name: 'MSG3D Kaggle+NTU', accuracy: 95.2, model: 'MSG3D' },
];

const datasets = [
  { name: 'NTU RGB+D 120', samples: 6614, type: 'Action Recognition' },
  { name: 'SCVD', samples: 2674, type: 'Surveillance Violence' },
  { name: 'RWF-2000', samples: 1580, type: 'Real-world Fighting' },
  { name: 'Kaggle Violence', samples: 1560, type: 'Curated Violence' },
];

export default function ModelsPage() {
  const { isRTL, locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const [activeTab, setActiveTab] = useState<'architecture' | 'models' | 'research'>('architecture');

  return (
    <div className={cn('min-h-screen bg-slate-950', isRTL && 'rtl')}>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-800">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              {t.hero.badge}
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t.hero.title}
            </h1>

            <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/docs/RESEARCH_PAPER.md"
                target="_blank"
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t.hero.cta}
              </Link>
              <Link
                href="/settings"
                className="px-6 py-3 border border-slate-700 hover:border-slate-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
          >
            {t.stats.map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
                <div className={cn(
                  'text-3xl md:text-4xl font-bold mb-2',
                  stat.color === 'emerald' && 'text-emerald-400',
                  stat.color === 'blue' && 'text-blue-400',
                  stat.color === 'purple' && 'text-purple-400',
                  stat.color === 'amber' && 'text-amber-400',
                )}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="border-b border-slate-800 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {(['architecture', 'models', 'research'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-4 font-medium text-sm transition-colors relative whitespace-nowrap',
                  activeTab === tab ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                )}
              >
                {tab === 'architecture' && t.architecture.title}
                {tab === 'models' && t.models.title}
                {tab === 'research' && t.research.title}
                {activeTab === tab && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'architecture' && (
          <motion.section
            key="architecture"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 py-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">{t.architecture.title}</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">{t.architecture.subtitle}</p>
            </div>

            {/* Pipeline stages */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {t.architecture.stages.map((stage, i) => (
                <motion.div
                  key={stage.step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'p-6 rounded-2xl border',
                    stage.color === 'orange' && 'bg-orange-500/5 border-orange-500/20',
                    stage.color === 'emerald' && 'bg-emerald-500/5 border-emerald-500/20',
                    stage.color === 'red' && 'bg-red-500/5 border-red-500/20',
                  )}
                >
                  <div className={cn(
                    'text-6xl font-bold mb-4 opacity-20',
                    stage.color === 'orange' && 'text-orange-500',
                    stage.color === 'emerald' && 'text-emerald-500',
                    stage.color === 'red' && 'text-red-500',
                  )}>
                    {stage.step}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{stage.title}</h3>
                  <p className={cn(
                    'text-sm font-medium mb-3',
                    stage.color === 'orange' && 'text-orange-400',
                    stage.color === 'emerald' && 'text-emerald-400',
                    stage.color === 'red' && 'text-red-400',
                  )}>
                    {stage.model}
                  </p>
                  <p className="text-slate-400 text-sm">{stage.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Decision Logic */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6">{t.logic.title}</h3>
              <div className="space-y-4">
                {t.logic.rules.map((rule, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-4 rounded-xl border-l-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4',
                      rule.type === 'detect' && 'bg-emerald-500/10 border-emerald-500',
                      rule.type === 'safe' && 'bg-slate-800/50 border-slate-600',
                      rule.type === 'alert' && 'bg-red-500/10 border-red-500',
                    )}
                  >
                    <code className="text-sm text-slate-300 font-mono">{rule.condition}</code>
                    <span className="text-slate-500">→</span>
                    <span className={cn(
                      'font-medium',
                      rule.type === 'detect' && 'text-emerald-400',
                      rule.type === 'safe' && 'text-slate-400',
                      rule.type === 'alert' && 'text-red-400',
                    )}>
                      {rule.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'models' && (
          <motion.section
            key="models"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 py-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">{t.models.title}</h2>
              <p className="text-slate-400">{t.models.subtitle}</p>
            </div>

            {/* Model Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {/* Primary Model */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded">
                      {t.models.primary.badge}
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-2">{t.models.primary.name}</h3>
                    <p className="text-sm text-slate-400">{t.models.primary.fullName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-400">{t.models.primary.accuracy}</div>
                    <div className="text-xs text-slate-500">{t.models.primary.threshold}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Architecture</p>
                    <p className="font-medium text-white">{t.models.primary.architecture}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Temporal</p>
                    <p className="font-medium text-white">{t.models.primary.temporal}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Training</p>
                    <p className="font-medium text-white">{t.models.primary.training}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Samples</p>
                    <p className="font-medium text-white">{t.models.primary.samples}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-400">{t.models.primary.description}</p>
              </div>

              {/* Veto Model */}
              <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded">
                      {t.models.veto.badge}
                    </span>
                    <h3 className="text-2xl font-bold text-white mt-2">{t.models.veto.name}</h3>
                    <p className="text-sm text-slate-400">{t.models.veto.fullName}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-red-400">{t.models.veto.accuracy}</div>
                    <div className="text-xs text-slate-500">{t.models.veto.threshold}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Architecture</p>
                    <p className="font-medium text-white">{t.models.veto.architecture}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Temporal</p>
                    <p className="font-medium text-white">{t.models.veto.temporal}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Training</p>
                    <p className="font-medium text-white">{t.models.veto.training}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <p className="text-xs text-slate-500">Role</p>
                    <p className="font-medium text-white">{t.models.veto.role}</p>
                  </div>
                </div>

                <p className="text-sm text-slate-400">{t.models.veto.description}</p>
              </div>
            </div>

            {/* Training Results */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8 mb-8">
              <h3 className="text-xl font-bold text-white mb-2">{t.results.title}</h3>
              <p className="text-sm text-slate-400 mb-6">{t.results.subtitle}</p>

              <div className="space-y-4">
                {trainingResults.map((result) => (
                  <div key={result.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{result.name}</span>
                        {result.primary && (
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">PRIMARY</span>
                        )}
                        {result.veto && (
                          <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">VETO</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-white">{result.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          result.primary ? 'bg-emerald-500' : result.veto ? 'bg-red-500' : 'bg-slate-600'
                        )}
                        style={{ width: `${result.accuracy}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                {t.results.note}
              </p>
            </div>

            {/* Datasets */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6">{t.datasets.title}</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {datasets.map((dataset) => (
                  <div key={dataset.name} className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white mb-1">{dataset.samples.toLocaleString()}</div>
                    <div className="text-sm font-medium text-white">{dataset.name}</div>
                    <div className="text-xs text-slate-500">{dataset.type}</div>
                  </div>
                ))}
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
                <h4 className="font-medium text-orange-400 mb-2">{t.datasets.infrastructure.title}</h4>
                <p className="text-sm text-slate-400">{t.datasets.infrastructure.description}</p>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'research' && (
          <motion.section
            key="research"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 py-16"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">{t.research.title}</h2>
              <p className="text-slate-400">{t.research.subtitle}</p>
            </div>

            {/* Research Paper Card */}
            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent border border-blue-500/20 rounded-2xl p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{t.research.paper.title}</h3>
                    <p className="text-sm text-blue-400">{t.research.paper.authors}</p>
                  </div>
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">{t.research.paper.abstract}</p>

                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Key Topics</h4>
                  <div className="space-y-2">
                    {t.research.paper.sections.map((section, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {section}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/docs/RESEARCH_PAPER.docx"
                    download
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t.research.paper.download} (DOCX)
                  </a>
                  <a
                    href="/docs/RESEARCH_PAPER.md"
                    target="_blank"
                    className="px-5 py-2.5 border border-slate-700 hover:border-slate-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Markdown
                  </a>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">{t.footer.copyright}</p>
            <div className="flex gap-6">
              {t.footer.links.map((link) => (
                <a key={link} href="#" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
