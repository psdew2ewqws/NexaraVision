'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { MODEL_PRESETS, getAvailableModels, getModelById } from '@/config/model-registry';
import type { OnboardingData } from '@/app/onboarding/page';

const translations = {
  en: {
    title: 'AI Model Configuration',
    subtitle: 'Choose your detection models and sensitivity',
    presets: {
      title: 'Recommended Configurations',
      custom: 'Custom',
    },
    models: {
      title: 'Selected Models',
      primary: 'PRIMARY',
      veto: 'VETO',
      accuracy: 'Accuracy',
      change: 'Change',
    },
    advanced: {
      show: 'Show Advanced Options',
      hide: 'Hide Advanced Options',
      primaryModel: 'Primary Model',
      primaryDesc: 'Detects violence - first line of detection',
      vetoModel: 'VETO Model',
      vetoDesc: 'Confirms violence - filters false positives',
    },
    thresholds: {
      title: 'Sensitivity Settings',
      primary: 'Primary Threshold',
      primaryDesc: 'Higher = fewer alerts, lower = more sensitive',
      veto: 'VETO Threshold',
      vetoDesc: 'Higher = stricter confirmation needed',
    },
    summary: {
      title: 'Configuration Summary',
      combinations: 'possible combinations',
    },
  },
  ar: {
    title: 'إعداد نماذج الذكاء الاصطناعي',
    subtitle: 'اختر نماذج الكشف والحساسية',
    presets: {
      title: 'الإعدادات الموصى بها',
      custom: 'مخصص',
    },
    models: {
      title: 'النماذج المختارة',
      primary: 'الأساسي',
      veto: 'الفيتو',
      accuracy: 'الدقة',
      change: 'تغيير',
    },
    advanced: {
      show: 'إظهار الخيارات المتقدمة',
      hide: 'إخفاء الخيارات المتقدمة',
      primaryModel: 'النموذج الأساسي',
      primaryDesc: 'يكشف العنف - خط الكشف الأول',
      vetoModel: 'نموذج الفيتو',
      vetoDesc: 'يؤكد العنف - يرشح الإيجابيات الكاذبة',
    },
    thresholds: {
      title: 'إعدادات الحساسية',
      primary: 'حد الأساسي',
      primaryDesc: 'أعلى = تنبيهات أقل، أقل = أكثر حساسية',
      veto: 'حد الفيتو',
      vetoDesc: 'أعلى = تأكيد أصرم مطلوب',
    },
    summary: {
      title: 'ملخص الإعداد',
      combinations: 'تركيبة ممكنة',
    },
  },
};

// Preset translations
const presetTranslations: Record<string, { name: string; nameAr: string; desc: string; descAr: string }> = {
  production: {
    name: 'Production',
    nameAr: 'الإنتاج',
    desc: 'Recommended - 0.1% false positive rate',
    descAr: 'موصى به - 0.1% إيجابيات كاذبة',
  },
  high_security: {
    name: 'High Security',
    nameAr: 'أمان عالي',
    desc: 'Banks, government - catches more threats',
    descAr: 'البنوك والحكومة - يلتقط المزيد',
  },
  surveillance_cctv: {
    name: 'CCTV Optimized',
    nameAr: 'محسن لـ CCTV',
    desc: 'Parking lots, warehouses',
    descAr: 'مواقف السيارات والمستودعات',
  },
  low_false_positive: {
    name: 'Low False Positive',
    nameAr: 'إيجابيات كاذبة منخفضة',
    desc: 'Busy public spaces, malls',
    descAr: 'الأماكن العامة المزدحمة',
  },
  max_accuracy: {
    name: 'Max Accuracy',
    nameAr: 'أقصى دقة',
    desc: 'Uses 98%+ accuracy models',
    descAr: 'يستخدم نماذج 98%+ دقة',
  },
  real_world_fighting: {
    name: 'Real-World Fighting',
    nameAr: 'قتال العالم الحقيقي',
    desc: 'Street environments, mobile footage',
    descAr: 'بيئات الشوارع، لقطات المحمول',
  },
};

interface SmartVetoStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function SmartVetoStep({ data, updateData }: SmartVetoStepProps) {
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const isAr = locale === 'ar';
  const [showAdvanced, setShowAdvanced] = useState(false);

  const availableModels = getAvailableModels();
  const primaryModel = getModelById(data.primaryModel);
  const vetoModel = getModelById(data.vetoModel);
  const totalCombinations = availableModels.length * availableModels.length;

  const applyPreset = (presetId: string) => {
    const preset = MODEL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      updateData({
        presetId: presetId,
        primaryModel: preset.primaryModel,
        vetoModel: preset.vetoModel,
        primaryThreshold: preset.primaryThreshold,
        vetoThreshold: preset.vetoThreshold,
      });
    }
  };

  const isPresetActive = (presetId: string) => {
    const preset = MODEL_PRESETS.find(p => p.id === presetId);
    if (!preset) return false;
    return (
      data.primaryModel === preset.primaryModel &&
      data.vetoModel === preset.vetoModel &&
      data.primaryThreshold === preset.primaryThreshold &&
      data.vetoThreshold === preset.vetoThreshold
    );
  };

  const handleModelChange = (role: 'primary' | 'veto', modelId: string) => {
    const model = getModelById(modelId);
    if (!model) return;

    if (role === 'primary') {
      updateData({
        primaryModel: modelId,
        primaryThreshold: model.recommendedThreshold,
        presetId: null, // Clear preset when manually changing
      });
    } else {
      updateData({
        vetoModel: modelId,
        vetoThreshold: model.recommendedThreshold,
        presetId: null,
      });
    }
  };

  // Get presets to display (top 6)
  const displayPresets = MODEL_PRESETS.slice(0, 6);

  return (
    <div className="space-y-4 sm:space-y-5">
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

      {/* Presets Grid - Mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2 sm:space-y-3"
      >
        <h3 className="text-xs sm:text-sm font-medium text-slate-300">{t.presets.title}</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          {displayPresets.map((preset) => {
            const pt = presetTranslations[preset.id];
            const isActive = isPresetActive(preset.id);
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl border text-left transition-all min-h-[56px] active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-500/20 border-blue-500 text-white'
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 active:bg-slate-700/50'
                }`}
              >
                <span className="block font-medium text-xs sm:text-sm leading-tight">
                  {isAr ? pt?.nameAr : pt?.name}
                </span>
                <span className="block text-[10px] sm:text-xs mt-0.5 opacity-70 leading-tight line-clamp-2">
                  {isAr ? pt?.descAr : pt?.desc}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Selected Models Display - Mobile optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-3 sm:p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg sm:rounded-xl"
      >
        <h3 className="text-xs sm:text-sm font-medium text-slate-300 mb-2 sm:mb-3">{t.models.title}</h3>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Primary Model */}
          <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
              <span className="text-[10px] sm:text-xs font-medium text-blue-400">{t.models.primary}</span>
              <span className="text-[10px] sm:text-xs text-blue-400">{primaryModel?.trainingAccuracy.toFixed(1)}%</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white truncate">
              {primaryModel?.displayName || data.primaryModel}
            </p>
          </div>

          {/* VETO Model */}
          <div className="p-2 sm:p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-0.5 sm:mb-1">
              <span className="text-[10px] sm:text-xs font-medium text-purple-400">{t.models.veto}</span>
              <span className="text-[10px] sm:text-xs text-purple-400">{vetoModel?.trainingAccuracy.toFixed(1)}%</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white truncate">
              {vetoModel?.displayName || data.vetoModel}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Advanced Options Toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showAdvanced ? t.advanced.hide : t.advanced.show}
        </button>
      </motion.div>

      {/* Advanced Options */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Primary Model Selection */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-white">{t.advanced.primaryModel}</p>
                <p className="text-xs text-slate-500">{t.advanced.primaryDesc}</p>
              </div>
              <select
                value={data.primaryModel}
                onChange={(e) => handleModelChange('primary', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName} ({model.trainingAccuracy.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            {/* VETO Model Selection */}
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-white">{t.advanced.vetoModel}</p>
                <p className="text-xs text-slate-500">{t.advanced.vetoDesc}</p>
              </div>
              <select
                value={data.vetoModel}
                onChange={(e) => handleModelChange('veto', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName} ({model.trainingAccuracy.toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold Sliders */}
            <div className="pt-2 space-y-4">
              <h4 className="text-sm font-medium text-slate-300">{t.thresholds.title}</h4>

              {/* Primary Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-slate-300">{t.thresholds.primary}</span>
                    <p className="text-xs text-slate-500">{t.thresholds.primaryDesc}</p>
                  </div>
                  <span className="text-sm font-mono text-blue-400">{data.primaryThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={1}
                  value={data.primaryThreshold}
                  onChange={(e) => updateData({ primaryThreshold: Number(e.target.value), presetId: null })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* VETO Threshold */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-slate-300">{t.thresholds.veto}</span>
                    <p className="text-xs text-slate-500">{t.thresholds.vetoDesc}</p>
                  </div>
                  <span className="text-sm font-mono text-purple-400">{data.vetoThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={99}
                  step={1}
                  value={data.vetoThreshold}
                  onChange={(e) => updateData({ vetoThreshold: Number(e.target.value), presetId: null })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{t.summary.title}</span>
          <span className="text-slate-500">
            {totalCombinations} {t.summary.combinations}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">{t.models.primary}:</span>
            <span className="font-mono text-blue-400">{data.primaryThreshold}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">{t.models.veto}:</span>
            <span className="font-mono text-purple-400">{data.vetoThreshold}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
