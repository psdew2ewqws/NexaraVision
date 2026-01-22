'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useModelConfiguration } from '@/hooks/useModelConfiguration';
import {
  MODEL_PRESETS,
  THRESHOLD_EXPLANATIONS,
  getAvailableModels,
  getModelById,
  type ModelSpec,
  type ModelPreset,
} from '@/config/model-registry';

// Icons
const Icons = {
  cpu: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  ),
  chevronDown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  ),
  loader: (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
};

const translations = {
  en: {
    title: 'Smart Veto Model Configuration',
    subtitle: 'Select AI models and configure thresholds for violence detection',
    presets: 'Configuration Presets',
    presetsDesc: 'Choose a pre-configured setup or customize your own',
    custom: 'Custom Configuration',
    primaryModel: 'PRIMARY Model',
    primaryModelDesc: 'First-stage detection model',
    vetoModel: 'VETO Model',
    vetoModelDesc: 'Second-stage confirmation model',
    threshold: 'Threshold',
    accuracy: 'Accuracy',
    architecture: 'Architecture',
    datasets: 'Training Data',
    parameters: 'Parameters',
    strengths: 'Strengths',
    useCase: 'Best For',
    detectionLogic: 'Detection Logic',
    logicExplained: 'VIOLENCE = (PRIMARY ≥ {primary}%) AND (VETO ≥ {veto}%)',
    thresholdGuide: 'Threshold Use Cases',
    apply: 'Apply Configuration',
    applied: 'Applied',
    modelSpecs: 'Model Specifications',
    recommended: 'Recommended',
    highAccuracy: 'High Accuracy',
    production: 'Production',
  },
  ar: {
    title: 'تكوين نموذج الفيتو الذكي',
    subtitle: 'اختر نماذج الذكاء الاصطناعي وتكوين الحدود للكشف عن العنف',
    presets: 'إعدادات مسبقة',
    presetsDesc: 'اختر إعداداً مسبقاً أو خصص إعدادك',
    custom: 'تكوين مخصص',
    primaryModel: 'النموذج الأساسي',
    primaryModelDesc: 'نموذج الكشف المرحلة الأولى',
    vetoModel: 'نموذج الفيتو',
    vetoModelDesc: 'نموذج التأكيد المرحلة الثانية',
    threshold: 'الحد',
    accuracy: 'الدقة',
    architecture: 'البنية',
    datasets: 'بيانات التدريب',
    parameters: 'المعاملات',
    strengths: 'نقاط القوة',
    useCase: 'الأفضل لـ',
    detectionLogic: 'منطق الكشف',
    logicExplained: 'العنف = (الأساسي ≥ {primary}%) و (الفيتو ≥ {veto}%)',
    thresholdGuide: 'حالات استخدام الحد',
    apply: 'تطبيق التكوين',
    applied: 'تم التطبيق',
    modelSpecs: 'مواصفات النموذج',
    recommended: 'موصى به',
    highAccuracy: 'دقة عالية',
    production: 'الإنتاج',
  },
};

interface SmartVetoConfigProps {
  locale: 'en' | 'ar';
  isRTL?: boolean;
}

export function SmartVetoConfig({ locale, isRTL = false }: SmartVetoConfigProps) {
  const t = translations[locale];
  const [expandedModel, setExpandedModel] = useState<'primary' | 'veto' | null>(null);
  const [showThresholdGuide, setShowThresholdGuide] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const {
    config,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    primaryModelSpec,
    vetoModelSpec,
    availableModels,
    presets,
    updateConfig,
    applyPreset,
    saveConfig,
    isValidCombination,
    validationErrors,
  } = useModelConfiguration();

  const handlePresetSelect = (presetId: string) => {
    applyPreset(presetId);
  };

  const handleModelSelect = (role: 'primary' | 'veto', modelId: string) => {
    if (role === 'primary') {
      updateConfig('primary_model', modelId);
    } else {
      updateConfig('veto_model', modelId);
    }
    setExpandedModel(null);
  };

  const handleThresholdChange = (role: 'primary' | 'veto', value: number) => {
    if (role === 'primary') {
      updateConfig('primary_threshold', value);
    } else {
      updateConfig('veto_threshold', value);
    }
  };

  const handleSave = async () => {
    await saveConfig();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        {Icons.loader}
        <span className="ml-2 text-zinc-400">Loading model configuration...</span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', isRTL && 'rtl')}>
      {/* Header with Help Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            {Icons.cpu}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t.title}</h3>
            <p className="text-sm text-zinc-500">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setShowHelpModal(true)}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          title={locale === 'ar' ? 'كيف يعمل نظام الفيتو الذكي؟' : 'How does Smart Veto work?'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </button>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHelpModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    {Icons.sparkles}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {locale === 'ar' ? 'كيف يعمل نظام الفيتو الذكي؟' : 'How Smart Veto Works'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-6 py-5 space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {locale === 'ar' ? 'نظرة عامة' : 'Overview'}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {locale === 'ar'
                      ? 'نظام الفيتو الذكي هو نهج مبتكر للكشف عن العنف يستخدم نموذجين للذكاء الاصطناعي يعملان معًا للتحقق من النتائج. هذا يقلل بشكل كبير من الإنذارات الكاذبة مع الحفاظ على دقة عالية في الكشف.'
                      : 'Smart Veto is an innovative approach to violence detection that uses two AI models working together to verify results. This significantly reduces false alarms while maintaining high detection accuracy.'}
                  </p>
                </div>

                {/* How it works - Visual */}
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-sm font-semibold text-white mb-4">
                    {locale === 'ar' ? 'آلية العمل' : 'Detection Flow'}
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
                    <div className="flex-1 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <div className="text-blue-400 font-bold text-sm mb-1">PRIMARY</div>
                      <div className="text-xs text-zinc-400">
                        {locale === 'ar' ? 'الكشف الأولي' : 'Initial Detection'}
                      </div>
                    </div>
                    <div className="text-zinc-600">→</div>
                    <div className="flex-1 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                      <div className="text-orange-400 font-bold text-sm mb-1">VETO</div>
                      <div className="text-xs text-zinc-400">
                        {locale === 'ar' ? 'التأكيد الثاني' : 'Confirmation'}
                      </div>
                    </div>
                    <div className="text-zinc-600">→</div>
                    <div className="flex-1 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <div className="text-green-400 font-bold text-sm mb-1">
                        {locale === 'ar' ? 'النتيجة' : 'RESULT'}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {locale === 'ar' ? 'موافقة مزدوجة' : 'Dual Agreement'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* The Logic */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {locale === 'ar' ? 'المنطق' : 'The Logic'}
                  </h3>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                    <code className="text-amber-400 text-sm font-mono">
                      {locale === 'ar'
                        ? 'العنف = (الأساسي ≥ الحد%) و (الفيتو ≥ الحد%)'
                        : 'VIOLENCE = (PRIMARY ≥ threshold%) AND (VETO ≥ threshold%)'}
                    </code>
                    <p className="text-zinc-400 text-xs mt-2">
                      {locale === 'ar'
                        ? 'يجب أن يتفق كلا النموذجين على وجود عنف لتفعيل التنبيه'
                        : 'Both models must agree that violence is present to trigger an alert'}
                    </p>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {locale === 'ar' ? 'المزايا' : 'Benefits'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        icon: '🎯',
                        title: locale === 'ar' ? 'تقليل الإنذارات الكاذبة' : 'Reduced False Alarms',
                        desc: locale === 'ar' ? 'النموذج الثاني يرفض الإيجابيات الكاذبة' : 'Second model vetoes false positives',
                      },
                      {
                        icon: '🔒',
                        title: locale === 'ar' ? 'موثوقية أعلى' : 'Higher Reliability',
                        desc: locale === 'ar' ? 'التحقق المزدوج يضمن دقة أفضل' : 'Dual verification ensures better accuracy',
                      },
                      {
                        icon: '⚡',
                        title: locale === 'ar' ? 'نماذج مختلفة' : 'Different Architectures',
                        desc: locale === 'ar' ? 'نموذجان مختلفان يكملان بعضهما' : 'Two different models complement each other',
                      },
                      {
                        icon: '🎛️',
                        title: locale === 'ar' ? 'قابل للتخصيص' : 'Customizable',
                        desc: locale === 'ar' ? 'حدود قابلة للتعديل حسب الاحتياج' : 'Adjustable thresholds per use case',
                      },
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                        <span className="text-lg">{benefit.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-white">{benefit.title}</p>
                          <p className="text-xs text-zinc-500">{benefit.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Threshold Guide */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {locale === 'ar' ? 'دليل الحدود' : 'Threshold Guide'}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <span className="text-green-400 font-bold text-sm w-16">90-99%</span>
                      <span className="text-zinc-300 text-sm">
                        {locale === 'ar' ? 'حد صارم - تنبيهات أقل، موثوقية عالية' : 'Strict - Fewer alerts, high confidence'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <span className="text-blue-400 font-bold text-sm w-16">70-89%</span>
                      <span className="text-zinc-300 text-sm">
                        {locale === 'ar' ? 'متوازن - توازن بين الحساسية والدقة' : 'Balanced - Good sensitivity and accuracy'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <span className="text-amber-400 font-bold text-sm w-16">50-69%</span>
                      <span className="text-zinc-300 text-sm">
                        {locale === 'ar' ? 'حساس - المزيد من التنبيهات، قد تشمل إيجابيات كاذبة' : 'Sensitive - More alerts, may include false positives'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-4">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                >
                  {locale === 'ar' ? 'فهمت!' : 'Got it!'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation Errors */}
      {!isValidCombination && validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <ul className="text-sm text-red-400 space-y-1">
            {validationErrors.map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Presets Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-white">{t.presets}</h4>
            <p className="text-xs text-zinc-500">{t.presetsDesc}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {presets.slice(0, 6).map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              locale={locale}
              isSelected={config.preset_id === preset.id}
              onSelect={() => handlePresetSelect(preset.id)}
            />
          ))}
        </div>
      </div>

      {/* Detection Logic Display */}
      <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
        <div className="flex items-center gap-2 mb-2">
          {Icons.sparkles}
          <span className="text-sm font-medium text-white">{t.detectionLogic}</span>
        </div>
        <div className="font-mono text-sm text-amber-400 bg-zinc-900/50 rounded px-3 py-2">
          VIOLENCE = (PRIMARY ≥ {config.primary_threshold}%) AND (VETO ≥ {config.veto_threshold}%)
        </div>
      </div>

      {/* Model Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PRIMARY Model */}
        <ModelSelectionCard
          role="primary"
          label={t.primaryModel}
          description={t.primaryModelDesc}
          selectedModel={primaryModelSpec}
          threshold={config.primary_threshold}
          availableModels={availableModels.filter(m => m.architecture === 'STGCNPP' && m.trainingAccuracy >= 80)}
          locale={locale}
          isExpanded={expandedModel === 'primary'}
          onToggle={() => setExpandedModel(expandedModel === 'primary' ? null : 'primary')}
          onSelectModel={(id) => handleModelSelect('primary', id)}
          onThresholdChange={(v) => handleThresholdChange('primary', v)}
          t={t}
        />

        {/* VETO Model */}
        <ModelSelectionCard
          role="veto"
          label={t.vetoModel}
          description={t.vetoModelDesc}
          selectedModel={vetoModelSpec}
          threshold={config.veto_threshold}
          availableModels={availableModels}
          locale={locale}
          isExpanded={expandedModel === 'veto'}
          onToggle={() => setExpandedModel(expandedModel === 'veto' ? null : 'veto')}
          onSelectModel={(id) => handleModelSelect('veto', id)}
          onThresholdChange={(v) => handleThresholdChange('veto', v)}
          t={t}
        />
      </div>

      {/* Threshold Guide */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          {Icons.info}
          {t.thresholdGuide}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ThresholdGuideCard
            thresholdKey="primary_threshold"
            locale={locale}
            isExpanded={showThresholdGuide === 'primary_threshold'}
            onToggle={() => setShowThresholdGuide(showThresholdGuide === 'primary_threshold' ? null : 'primary_threshold')}
          />
          <ThresholdGuideCard
            thresholdKey="veto_threshold"
            locale={locale}
            isExpanded={showThresholdGuide === 'veto_threshold'}
            onToggle={() => setShowThresholdGuide(showThresholdGuide === 'veto_threshold' ? null : 'veto_threshold')}
          />
        </div>
      </div>

      {/* Save Button with Success/Error Feedback */}
      <div className="space-y-3 pt-4">
        {/* Success Message */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-lg"
            >
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-green-400">
                {locale === 'ar' ? 'تم حفظ التكوين بنجاح!' : 'Configuration saved successfully!'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg"
            >
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span className="text-sm font-medium text-red-400">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !isValidCombination || saveSuccess}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all",
              saveSuccess
                ? "bg-green-600 text-white"
                : isSaving
                  ? "bg-purple-500/20 text-purple-400"
                  : "bg-purple-600 text-white hover:bg-purple-500",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {saveSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {locale === 'ar' ? 'تم الحفظ!' : 'Saved!'}
              </>
            ) : isSaving ? (
              <>
                {Icons.loader}
                {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                {Icons.check}
                {t.apply}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Preset Card Component
function PresetCard({
  preset,
  locale,
  isSelected,
  onSelect,
}: {
  preset: ModelPreset;
  locale: 'en' | 'ar';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const name = locale === 'ar' ? preset.nameAr : preset.name;
  const description = locale === 'ar' ? preset.descriptionAr : preset.description;
  const useCase = locale === 'ar' ? preset.useCaseAr : preset.useCase;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "p-3 rounded-lg border text-left transition-all",
        isSelected
          ? "bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500/30"
          : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", isSelected ? "text-purple-400" : "text-white")}>
            {name}
          </p>
          <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{description}</p>
        </div>
        {isSelected && (
          <div className="text-purple-400 shrink-0">{Icons.check}</div>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-zinc-700/50">
        <p className="text-xs text-zinc-400">{useCase}</p>
      </div>
    </button>
  );
}

// Model Selection Card Component
function ModelSelectionCard({
  role,
  label,
  description,
  selectedModel,
  threshold,
  availableModels,
  locale,
  isExpanded,
  onToggle,
  onSelectModel,
  onThresholdChange,
  t,
}: {
  role: 'primary' | 'veto';
  label: string;
  description: string;
  selectedModel: ModelSpec | undefined;
  threshold: number;
  availableModels: ModelSpec[];
  locale: 'en' | 'ar';
  isExpanded: boolean;
  onToggle: () => void;
  onSelectModel: (id: string) => void;
  onThresholdChange: (value: number) => void;
  t: typeof translations.en;
}) {
  const color = role === 'primary' ? 'red' : 'orange';
  const bgColor = role === 'primary' ? 'bg-red-500/20' : 'bg-orange-500/20';
  const textColor = role === 'primary' ? 'text-red-400' : 'text-orange-400';
  const borderColor = role === 'primary' ? 'border-red-500/30' : 'border-orange-500/30';

  return (
    <div className={cn("rounded-lg border", bgColor, borderColor)}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className={cn("text-xs font-bold uppercase tracking-wide", textColor)}>
              {role.toUpperCase()}
            </span>
            <h4 className="text-sm font-medium text-white">{label}</h4>
          </div>
          <div className={cn("text-2xl font-bold", textColor)}>
            {threshold}%
          </div>
        </div>

        {/* Selected Model Info */}
        {selectedModel && (
          <div className="bg-zinc-900/50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">{selectedModel.displayName}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded",
                selectedModel.trainingAccuracy >= 95 ? "bg-green-500/20 text-green-400" :
                selectedModel.trainingAccuracy >= 90 ? "bg-blue-500/20 text-blue-400" :
                "bg-zinc-700 text-zinc-300"
              )}>
                {selectedModel.trainingAccuracy.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2">
              {locale === 'ar' ? selectedModel.descriptionAr : selectedModel.description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedModel.datasets.map(ds => (
                <span key={ds} className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  {ds}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Threshold Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">{t.threshold}</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => onThresholdChange(Math.max(50, Math.min(99, parseInt(e.target.value) || 50)))}
              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-right text-white text-xs"
              min={50}
              max={99}
            />
          </div>
          <input
            type="range"
            value={threshold}
            onChange={(e) => onThresholdChange(parseInt(e.target.value))}
            min={50}
            max={99}
            className={cn(
              "w-full h-2 rounded-lg appearance-none cursor-pointer",
              role === 'primary' ? "accent-red-500" : "accent-orange-500"
            )}
            style={{
              background: `linear-gradient(to right, ${role === 'primary' ? '#ef4444' : '#f97316'} 0%, ${role === 'primary' ? '#ef4444' : '#f97316'} ${((threshold - 50) / 49) * 100}%, #3f3f46 ${((threshold - 50) / 49) * 100}%, #3f3f46 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-zinc-500">
            <span>50%</span>
            <span>99%</span>
          </div>
        </div>

        {/* Toggle Model List */}
        <button
          onClick={onToggle}
          className="w-full mt-3 flex items-center justify-center gap-1 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <span>{isExpanded ? 'Hide models' : 'Change model'}</span>
          <motion.span animate={{ rotate: isExpanded ? 180 : 0 }}>
            {Icons.chevronDown}
          </motion.span>
        </button>
      </div>

      {/* Model List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-700/50 p-3 space-y-1 max-h-64 overflow-y-auto">
              {availableModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onSelectModel(model.id)}
                  className={cn(
                    "w-full p-2 rounded text-left transition-colors",
                    selectedModel?.id === model.id
                      ? cn(bgColor, "ring-1", borderColor)
                      : "hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{model.displayName}</span>
                    <span className={cn(
                      "text-xs",
                      model.trainingAccuracy >= 95 ? "text-green-400" :
                      model.trainingAccuracy >= 90 ? "text-blue-400" : "text-zinc-400"
                    )}>
                      {model.trainingAccuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500">{model.architecture}</span>
                    <span className="text-xs text-zinc-600">•</span>
                    <span className="text-xs text-zinc-500">{model.datasets.join(' + ')}</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Threshold Guide Card Component
function ThresholdGuideCard({
  thresholdKey,
  locale,
  isExpanded,
  onToggle,
}: {
  thresholdKey: string;
  locale: 'en' | 'ar';
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const explanation = THRESHOLD_EXPLANATIONS[thresholdKey];
  if (!explanation) return null;

  const name = locale === 'ar' ? explanation.nameAr : explanation.name;
  const description = locale === 'ar' ? explanation.descriptionAr : explanation.description;

  return (
    <div className="bg-zinc-800/50 rounded-lg border border-zinc-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-zinc-500 line-clamp-1">{description}</p>
        </div>
        <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} className="text-zinc-400">
          {Icons.chevronDown}
        </motion.span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-700/50 p-3 space-y-2">
              {explanation.useCases.map((useCase, i) => {
                const title = locale === 'ar' ? useCase.titleAr : useCase.title;
                const desc = locale === 'ar' ? useCase.descriptionAr : useCase.description;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn(
                      "shrink-0 w-10 h-6 rounded flex items-center justify-center text-xs font-bold",
                      useCase.value >= 90 ? "bg-green-500/20 text-green-400" :
                      useCase.value >= 80 ? "bg-blue-500/20 text-blue-400" :
                      "bg-amber-500/20 text-amber-400"
                    )}>
                      {useCase.value}%
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{title}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SmartVetoConfig;
