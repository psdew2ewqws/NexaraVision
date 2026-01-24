'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import type { OnboardingData } from '@/app/onboarding/page';

const translations = {
  en: {
    title: 'Fight Alert Triggers',
    subtitle: 'Configure when and how alerts are triggered',
    howItWorks: {
      title: 'How Fight Alerts Work',
      description: 'The system analyzes video at 30 frames per second. Two types of alerts help catch different scenarios:',
      instant: 'Instant Alert - For obvious, high-confidence fights (e.g., clear punches)',
      sustained: 'Sustained Alert - For developing situations (e.g., escalating confrontation)',
    },
    instant: {
      title: 'Instant Alert',
      badge: 'FAST',
      description: 'Triggers immediately when the AI detects obvious violence with very high confidence.',
      example: 'Example: If 3 consecutive frames show 95%+ violence confidence, alert fires instantly.',
      threshold: 'Confidence Threshold',
      thresholdDesc: 'Minimum AI confidence to consider it violence',
      count: 'Required Frames',
      countDesc: 'How many frames in a row must exceed the threshold',
      tip: 'Higher threshold = fewer false alarms, but may miss subtle violence',
    },
    sustained: {
      title: 'Sustained Alert',
      badge: 'CONTINUOUS',
      description: 'Triggers when violence is detected continuously over a period of time.',
      example: 'Example: If violence stays above 70% for 2 seconds straight, alert fires.',
      threshold: 'Violence Threshold',
      thresholdDesc: 'The minimum confidence level that must be maintained',
      duration: 'Duration Required',
      durationDesc: 'How long violence must persist to trigger alert',
      tip: 'Good for catching developing situations and prolonged incidents',
    },
    preferences: {
      title: 'When Alert Triggers...',
      sound: 'Play Alert Sound',
      soundDesc: 'Audible alarm when fight is detected',
      autoRecord: 'Auto-Save Recording',
      autoRecordDesc: 'Automatically save video clip of the incident',
    },
    summary: {
      title: 'Your Alert Configuration',
      instant: 'Instant:',
      instantDesc: 'consecutive frames at',
      sustained: 'Sustained:',
      sustainedDesc: 'seconds at',
      confidence: 'confidence',
    },
  },
  ar: {
    title: 'محفزات تنبيه القتال',
    subtitle: 'إعداد متى وكيف يتم تفعيل التنبيهات',
    howItWorks: {
      title: 'كيف تعمل تنبيهات القتال',
      description: 'يحلل النظام الفيديو بمعدل 30 إطار في الثانية. نوعان من التنبيهات يساعدان في التقاط سيناريوهات مختلفة:',
      instant: 'تنبيه فوري - للقتال الواضح عالي الثقة (مثل اللكمات الواضحة)',
      sustained: 'تنبيه مستمر - للمواقف المتطورة (مثل المواجهة المتصاعدة)',
    },
    instant: {
      title: 'تنبيه فوري',
      badge: 'سريع',
      description: 'يتم تفعيله فوراً عندما يكتشف الذكاء الاصطناعي عنفاً واضحاً بثقة عالية جداً.',
      example: 'مثال: إذا أظهرت 3 إطارات متتالية ثقة عنف 95%+، يتم التنبيه فوراً.',
      threshold: 'حد الثقة',
      thresholdDesc: 'الحد الأدنى لثقة الذكاء الاصطناعي لاعتباره عنفاً',
      count: 'الإطارات المطلوبة',
      countDesc: 'كم إطار متتالي يجب أن يتجاوز الحد',
      tip: 'حد أعلى = إنذارات كاذبة أقل، لكن قد يفوت العنف الخفي',
    },
    sustained: {
      title: 'تنبيه مستمر',
      badge: 'متواصل',
      description: 'يتم تفعيله عندما يُكتشف العنف بشكل مستمر لفترة من الوقت.',
      example: 'مثال: إذا بقي العنف فوق 70% لمدة ثانيتين متواصلتين، يتم التنبيه.',
      threshold: 'حد العنف',
      thresholdDesc: 'الحد الأدنى لمستوى الثقة الذي يجب الحفاظ عليه',
      duration: 'المدة المطلوبة',
      durationDesc: 'كم يجب أن يستمر العنف لتفعيل التنبيه',
      tip: 'جيد لالتقاط المواقف المتطورة والحوادث المطولة',
    },
    preferences: {
      title: 'عند تفعيل التنبيه...',
      sound: 'تشغيل صوت التنبيه',
      soundDesc: 'إنذار صوتي عند اكتشاف قتال',
      autoRecord: 'حفظ التسجيل تلقائياً',
      autoRecordDesc: 'حفظ مقطع فيديو للحادث تلقائياً',
    },
    summary: {
      title: 'إعداد التنبيهات الخاص بك',
      instant: 'فوري:',
      instantDesc: 'إطارات متتالية عند',
      sustained: 'مستمر:',
      sustainedDesc: 'ثوان عند',
      confidence: 'ثقة',
    },
  },
};

interface AlertTriggersStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function AlertTriggersStep({ data, updateData }: AlertTriggersStepProps) {
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2"
        >
          {t.title}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm sm:text-base text-slate-400"
        >
          {t.subtitle}
        </motion.p>
      </div>

      {/* How It Works Explanation - Collapsible on mobile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg sm:rounded-xl"
      >
        <h3 className="font-medium text-blue-400 text-sm sm:text-base mb-1 sm:mb-2">{t.howItWorks.title}</h3>
        <p className="text-xs sm:text-sm text-slate-300 mb-2 sm:mb-3">{t.howItWorks.description}</p>
        <div className="space-y-1 sm:space-y-1.5 text-[11px] sm:text-xs text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-red-400 font-bold mt-0.5">1.</span>
            <span>{t.howItWorks.instant}</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-400 font-bold mt-0.5">2.</span>
            <span>{t.howItWorks.sustained}</span>
          </div>
        </div>
      </motion.div>

      {/* Instant Alert Section - Mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="p-3 sm:p-4 bg-slate-800/50 border border-red-500/30 rounded-lg sm:rounded-xl space-y-3 sm:space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-red-400 text-sm sm:text-base">{t.instant.title}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-2">{t.instant.description}</p>
          </div>
          <span className="px-1.5 sm:px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] sm:text-xs font-medium rounded flex-shrink-0">
            {t.instant.badge}
          </span>
        </div>

        {/* Example - Hidden on very small screens */}
        <div className="hidden sm:block p-2 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400 italic">{t.instant.example}</p>
        </div>

        {/* Instant Threshold */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm text-slate-300">{t.instant.threshold}</span>
            </div>
            <span className="text-xs sm:text-sm font-mono text-red-400 bg-red-500/10 px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
              {data.instantTriggerThreshold}%
            </span>
          </div>
          <input
            type="range"
            min={85}
            max={99}
            step={1}
            value={data.instantTriggerThreshold}
            onChange={(e) => updateData({ instantTriggerThreshold: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 touch-pan-y"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-500">
            <span>85%</span>
            <span>99%</span>
          </div>
        </div>

        {/* Instant Count */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm text-slate-300">{t.instant.count}</span>
            </div>
            <span className="text-xs sm:text-sm font-mono text-red-400 bg-red-500/10 px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
              {data.instantTriggerCount}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={data.instantTriggerCount}
            onChange={(e) => updateData({ instantTriggerCount: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500 touch-pan-y"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-500">
            <span>1</span>
            <span>5</span>
          </div>
        </div>
      </motion.div>

      {/* Sustained Alert Section - Mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="p-3 sm:p-4 bg-slate-800/50 border border-amber-500/30 rounded-lg sm:rounded-xl space-y-3 sm:space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-amber-400 text-sm sm:text-base">{t.sustained.title}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 line-clamp-2">{t.sustained.description}</p>
          </div>
          <span className="px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] sm:text-xs font-medium rounded flex-shrink-0">
            {t.sustained.badge}
          </span>
        </div>

        {/* Example - Hidden on very small screens */}
        <div className="hidden sm:block p-2 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400 italic">{t.sustained.example}</p>
        </div>

        {/* Sustained Threshold */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm text-slate-300">{t.sustained.threshold}</span>
            </div>
            <span className="text-xs sm:text-sm font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
              {data.sustainedThreshold}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={90}
            step={5}
            value={data.sustainedThreshold}
            onChange={(e) => updateData({ sustainedThreshold: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 touch-pan-y"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-500">
            <span>50%</span>
            <span>90%</span>
          </div>
        </div>

        {/* Sustained Duration */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex-1 min-w-0">
              <span className="text-xs sm:text-sm text-slate-300">{t.sustained.duration}</span>
            </div>
            <span className="text-xs sm:text-sm font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 sm:py-1 rounded flex-shrink-0">
              {data.sustainedDuration}s
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={data.sustainedDuration}
            onChange={(e) => updateData({ sustainedDuration: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500 touch-pan-y"
          />
          <div className="flex justify-between text-[10px] sm:text-xs text-slate-500">
            <span>1s</span>
            <span>5s</span>
          </div>
        </div>
      </motion.div>

      {/* Preferences - Mobile optimized toggles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="p-3 sm:p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl space-y-3 sm:space-y-4"
      >
        <h3 className="font-medium text-slate-300 text-sm sm:text-base">{t.preferences.title}</h3>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-white">{t.preferences.sound}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">{t.preferences.soundDesc}</p>
          </div>
          <button
            onClick={() => updateData({ soundEnabled: !data.soundEnabled })}
            className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 active:scale-95 ${
              data.soundEnabled ? 'bg-blue-500' : 'bg-slate-700'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm"
              animate={{ x: data.soundEnabled ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Auto Record Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-white">{t.preferences.autoRecord}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">{t.preferences.autoRecordDesc}</p>
          </div>
          <button
            onClick={() => updateData({ autoRecord: !data.autoRecord })}
            className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 active:scale-95 ${
              data.autoRecord ? 'bg-blue-500' : 'bg-slate-700'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm"
              animate={{ x: data.autoRecord ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Summary - Mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="p-2.5 sm:p-3 bg-slate-800/30 rounded-lg sm:rounded-xl border border-slate-700/30"
      >
        <p className="text-[11px] sm:text-xs font-medium text-slate-400 mb-1.5 sm:mb-2">{t.summary.title}</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div className="p-1.5 sm:p-2 bg-red-500/10 rounded-lg">
            <span className="text-red-400 font-medium text-xs sm:text-sm">{t.summary.instant}</span>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {data.instantTriggerCount}x @ {data.instantTriggerThreshold}%
            </p>
          </div>
          <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
            <span className="text-amber-400 font-medium text-xs sm:text-sm">{t.summary.sustained}</span>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              {data.sustainedDuration}s @ {data.sustainedThreshold}%
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
