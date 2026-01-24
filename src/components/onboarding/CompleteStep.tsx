'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Profile } from '@/types/database';
import { getModelById } from '@/config/model-registry';
import type { OnboardingData } from '@/app/onboarding/page';

const translations = {
  en: {
    title: "You're All Set!",
    titleComplete: 'Setup Complete!',
    subtitle: 'Review your configuration and finish setup',
    subtitleComplete: 'Your security monitoring system is now configured',
    summary: 'Configuration Summary',
    whatsapp: {
      title: 'WhatsApp Alerts',
      enabled: 'Enabled',
      disabled: 'Disabled',
      number: 'Number:',
    },
    detection: {
      title: 'AI Models',
      primary: 'PRIMARY:',
      veto: 'VETO:',
      threshold: 'Threshold:',
    },
    alerts: {
      title: 'Alert Triggers',
      instant: 'Instant:',
      sustained: 'Sustained:',
      sound: 'Sound:',
      record: 'Auto Record:',
      frames: 'frames at',
      sec: 'sec at',
      on: 'On',
      off: 'Off',
    },
    ready: "Click 'Finish Setup' to start monitoring",
    redirecting: 'Redirecting to dashboard...',
  },
  ar: {
    title: 'تم الإعداد!',
    titleComplete: 'اكتمل الإعداد!',
    subtitle: 'راجع الإعدادات وأنهِ الإعداد',
    subtitleComplete: 'تم إعداد نظام المراقبة الأمنية',
    summary: 'ملخص الإعدادات',
    whatsapp: {
      title: 'تنبيهات واتساب',
      enabled: 'مفعل',
      disabled: 'معطل',
      number: 'الرقم:',
    },
    detection: {
      title: 'نماذج الذكاء الاصطناعي',
      primary: 'الأساسي:',
      veto: 'الفيتو:',
      threshold: 'الحد:',
    },
    alerts: {
      title: 'محفزات التنبيهات',
      instant: 'فوري:',
      sustained: 'مستمر:',
      sound: 'الصوت:',
      record: 'تسجيل تلقائي:',
      frames: 'إطارات عند',
      sec: 'ث عند',
      on: 'مفعل',
      off: 'معطل',
    },
    ready: "انقر 'إنهاء الإعداد' لبدء المراقبة",
    redirecting: 'جاري التوجيه للوحة التحكم...',
  },
};

interface CompleteStepProps {
  data: OnboardingData;
  profile: Profile;
  completed: boolean;
}

export function CompleteStep({ data, profile, completed }: CompleteStepProps) {
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const userName = profile.full_name || profile.email.split('@')[0];
  const primaryModel = getModelById(data.primaryModel);
  const vetoModel = getModelById(data.vetoModel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold text-white mb-2"
        >
          {completed ? t.titleComplete : t.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-slate-400"
        >
          {completed ? t.subtitleComplete : t.subtitle}
        </motion.p>
      </div>

      {/* Configuration Summary */}
      {!completed && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-medium text-slate-400">{t.summary}</h3>

            {/* WhatsApp */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <h4 className="font-medium text-green-400 mb-3">{t.whatsapp.title}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-400">
                  Status:{' '}
                  <span className={data.whatsappEnabled ? 'text-green-400' : 'text-slate-500'}>
                    {data.whatsappEnabled ? t.whatsapp.enabled : t.whatsapp.disabled}
                  </span>
                </div>
                {data.whatsappEnabled && data.whatsappNumber && (
                  <div className="text-slate-400">
                    {t.whatsapp.number} <span className="text-white">{data.whatsappNumber}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Detection Models */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <h4 className="font-medium text-purple-400 mb-3">{t.detection.title}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>{t.detection.primary}</span>
                  <span className="text-blue-400">
                    {primaryModel?.displayName || data.primaryModel} ({data.primaryThreshold}%)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>{t.detection.veto}</span>
                  <span className="text-purple-400">
                    {vetoModel?.displayName || data.vetoModel} ({data.vetoThreshold}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <h4 className="font-medium text-amber-400 mb-3">{t.alerts.title}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-slate-400">
                  {t.alerts.instant} <span className="text-red-400">{data.instantTriggerCount} {t.alerts.frames} {data.instantTriggerThreshold}%</span>
                </div>
                <div className="text-slate-400">
                  {t.alerts.sustained} <span className="text-amber-400">{data.sustainedDuration}{t.alerts.sec} {data.sustainedThreshold}%</span>
                </div>
                <div className="text-slate-400">
                  {t.alerts.sound} <span className={data.soundEnabled ? 'text-green-400' : 'text-slate-500'}>{data.soundEnabled ? t.alerts.on : t.alerts.off}</span>
                </div>
                <div className="text-slate-400">
                  {t.alerts.record} <span className={data.autoRecord ? 'text-green-400' : 'text-slate-500'}>{data.autoRecord ? t.alerts.on : t.alerts.off}</span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-sm text-slate-500"
          >
            {t.ready}
          </motion.p>
        </>
      )}

      {/* Completed State */}
      {completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-8"
        >
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            {t.redirecting}
          </div>
        </motion.div>
      )}
    </div>
  );
}
