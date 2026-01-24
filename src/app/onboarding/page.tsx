'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/contexts/AuthContext';
import { useDetectionSettings } from '@/hooks/useDetectionSettings';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useModelConfiguration } from '@/hooks/useModelConfiguration';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { validatePhone } from '@/lib/validation';

// Step components
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { WhatsAppStep } from '@/components/onboarding/WhatsAppStep';
import { SmartVetoStep } from '@/components/onboarding/SmartVetoStep';
import { AlertTriggersStep } from '@/components/onboarding/AlertTriggersStep';
import { CompleteStep } from '@/components/onboarding/CompleteStep';

const translations = {
  en: {
    steps: ['Welcome', 'WhatsApp', 'AI Models', 'Alerts', 'Complete'],
    loading: 'Loading...',
    skipText: 'Skip for now',
    backText: 'Back',
    nextText: 'Continue',
    finishText: 'Finish Setup',
  },
  ar: {
    steps: ['مرحبا', 'واتساب', 'نماذج الذكاء', 'التنبيهات', 'اكتمل'],
    loading: 'جاري التحميل...',
    skipText: 'تخطي الآن',
    backText: 'رجوع',
    nextText: 'استمرار',
    finishText: 'إنهاء الإعداد',
  },
};

// Step data types
export interface OnboardingData {
  // WhatsApp
  whatsappEnabled: boolean;
  whatsappNumber: string;
  // Smart Veto - Models
  primaryModel: string;
  vetoModel: string;
  presetId: string | null;
  // Smart Veto - Thresholds
  primaryThreshold: number;
  vetoThreshold: number;
  // Alert Triggers
  instantTriggerThreshold: number;
  instantTriggerCount: number;
  sustainedThreshold: number;
  sustainedDuration: number;
  soundEnabled: boolean;
  autoRecord: boolean;
}

const defaultData: OnboardingData = {
  whatsappEnabled: true,
  whatsappNumber: '',
  // Default to Production preset
  primaryModel: 'STGCNPP_Kaggle_NTU',
  vetoModel: 'MSG3D_Kaggle_NTU',
  presetId: 'production',
  primaryThreshold: 94,
  vetoThreshold: 85,
  instantTriggerThreshold: 95,
  instantTriggerCount: 3,
  sustainedThreshold: 70,
  sustainedDuration: 2,
  soundEnabled: true,
  autoRecord: true,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { settings: detectionSettings, updateSettings: updateDetection, loading: detectionLoading } = useDetectionSettings();
  const { settings: alertSettings, updateSettings: updateAlert, loading: alertLoading } = useAlertSettings(user?.id);
  const { config: modelConfig, updateConfig: updateModelConfig, saveConfig: saveModelConfig, isLoading: modelLoading } = useModelConfiguration();
  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Redirect if not logged in or already completed onboarding
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && profile?.onboarding_completed) {
      router.push('/');
    }
  }, [authLoading, user, profile, router]);

  // Load existing settings into form
  useEffect(() => {
    if (detectionSettings && alertSettings && modelConfig) {
      setData({
        whatsappEnabled: alertSettings.whatsapp_enabled,
        whatsappNumber: alertSettings.whatsapp_number || '',
        // Model configuration
        primaryModel: modelConfig.primary_model,
        vetoModel: modelConfig.veto_model,
        presetId: modelConfig.preset_id,
        primaryThreshold: modelConfig.primary_threshold,
        vetoThreshold: modelConfig.veto_threshold,
        // Alert triggers
        instantTriggerThreshold: detectionSettings.instant_trigger_threshold,
        instantTriggerCount: detectionSettings.instant_trigger_count,
        sustainedThreshold: detectionSettings.sustained_threshold,
        sustainedDuration: detectionSettings.sustained_duration,
        soundEnabled: detectionSettings.sound_enabled,
        autoRecord: detectionSettings.auto_record,
      });
    }
  }, [detectionSettings, alertSettings, modelConfig]);

  // Update data handler
  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  }, []);

  // Save all settings and complete onboarding
  const completeOnboarding = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      // Save model configuration
      updateModelConfig('primary_model', data.primaryModel);
      updateModelConfig('veto_model', data.vetoModel);
      updateModelConfig('primary_threshold', data.primaryThreshold);
      updateModelConfig('veto_threshold', data.vetoThreshold);
      updateModelConfig('preset_id', data.presetId);
      await saveModelConfig();

      // Save detection settings (alert triggers)
      await updateDetection({
        primary_threshold: data.primaryThreshold,
        veto_threshold: data.vetoThreshold,
        instant_trigger_threshold: data.instantTriggerThreshold,
        instant_trigger_count: data.instantTriggerCount,
        sustained_threshold: data.sustainedThreshold,
        sustained_duration: data.sustainedDuration,
        sound_enabled: data.soundEnabled,
        auto_record: data.autoRecord,
      });

      // Save alert settings (WhatsApp)
      await updateAlert({
        whatsapp_enabled: data.whatsappEnabled,
        whatsapp_number: data.whatsappNumber || null,
      });

      // Mark onboarding as completed
      await updateProfile({ onboarding_completed: true });

      // Show confetti celebration
      setCompleted(true);

      // Fire confetti
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      // Redirect after celebration
      setTimeout(() => {
        router.push('/');
      }, 4000);

    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setSaving(false);
    }
  }, [data, saving, updateDetection, updateAlert, updateProfile, updateModelConfig, saveModelConfig, router]);

  // Check if user can proceed from current step
  const canProceed = useCallback(() => {
    // WhatsApp step validation
    if (currentStep === 1 && data.whatsappEnabled) {
      const phoneValidation = validatePhone(data.whatsappNumber, true);
      return phoneValidation.isValid;
    }
    return true;
  }, [currentStep, data.whatsappEnabled, data.whatsappNumber]);

  // Navigate steps
  const goNext = () => {
    if (!canProceed()) return;

    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipOnboarding = async () => {
    await updateProfile({ onboarding_completed: true });
    router.push('/');
  };

  // Loading state
  if (authLoading || detectionLoading || alertLoading || modelLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Don't render if user is not ready
  if (!user || !profile) {
    return null;
  }

  const steps = [
    <WelcomeStep key="welcome" profile={profile} />,
    <WhatsAppStep key="whatsapp" data={data} updateData={updateData} />,
    <SmartVetoStep key="smartveto" data={data} updateData={updateData} />,
    <AlertTriggersStep key="alerts" data={data} updateData={updateData} />,
    <CompleteStep key="complete" data={data} profile={profile} completed={completed} />,
  ];

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-4 md:p-8 pb-24 sm:pb-8', isRTL && 'rtl')}>
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps - Mobile optimized */}
        <div className="mb-4 sm:mb-8">
          {/* Mobile: Compact step indicator */}
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            {t.steps.map((step, index) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <motion.div
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-all flex-shrink-0',
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-800 text-slate-400'
                  )}
                  animate={{
                    scale: index === currentStep ? 1.1 : 1,
                  }}
                >
                  {index < currentStep ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </motion.div>
                {index < 4 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 sm:h-1 mx-1 sm:mx-2 rounded transition-colors',
                      index < currentStep ? 'bg-green-500' : 'bg-slate-800'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          {/* Mobile: Show current step name */}
          <div className="sm:hidden text-center">
            <span className="text-sm font-medium text-white">
              {t.steps[currentStep]}
            </span>
            <span className="text-xs text-slate-500 ml-2">
              {currentStep + 1}/{t.steps.length}
            </span>
          </div>
          {/* Desktop: Step labels */}
          <div className="hidden sm:flex justify-between">
            {t.steps.map((step, index) => (
              <span
                key={step}
                className={cn(
                  'text-xs transition-colors text-center',
                  index === currentStep ? 'text-white font-medium' : 'text-slate-500'
                )}
                style={{ width: '20%' }}
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content - Mobile optimized with max height */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
            transition={{ duration: 0.3 }}
            className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-h-[60vh] sm:max-h-none overflow-y-auto"
          >
            {steps[currentStep]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Fixed on mobile */}
        {!completed && (
          <div className="fixed bottom-0 left-0 right-0 sm:relative sm:mt-6 bg-slate-950/95 sm:bg-transparent backdrop-blur-lg sm:backdrop-blur-none border-t border-slate-800 sm:border-0 p-3 sm:p-0 z-50">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              <div>
                {currentStep > 0 ? (
                  <button
                    onClick={goBack}
                    className="px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] text-slate-400 hover:text-white active:text-white transition-colors flex items-center gap-2 text-sm sm:text-base"
                  >
                    <svg className={cn('w-4 h-4', isRTL && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">{t.backText}</span>
                  </button>
                ) : (
                  <button
                    onClick={skipOnboarding}
                    className="px-3 sm:px-4 py-2.5 sm:py-2 min-h-[44px] text-slate-500 hover:text-slate-300 active:text-slate-300 transition-colors text-sm"
                  >
                    {t.skipText}
                  </button>
                )}
              </div>

              <motion.button
                onClick={goNext}
                disabled={saving || !canProceed()}
                whileTap={{ scale: canProceed() ? 0.98 : 1 }}
                className={cn(
                  'px-5 sm:px-6 py-3 min-h-[44px] rounded-xl font-medium flex items-center gap-2 transition-all text-sm sm:text-base',
                  !canProceed()
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : currentStep === 4
                    ? 'bg-green-500 hover:bg-green-600 active:bg-green-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
                )}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    {currentStep === 4 ? t.finishText : t.nextText}
                    <svg className={cn('w-4 h-4', isRTL && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
