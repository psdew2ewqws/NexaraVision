'use client';

// Build: 2026-01-23T18:00:00Z - Force Vercel cache invalidation v3
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { useDetectionSettings, DEFAULT_DETECTION_SETTINGS } from '@/hooks/useDetectionSettings';
import { useAlertSettings } from '@/hooks/useAlertSettings';
import { useModelConfiguration } from '@/hooks/useModelConfiguration';
import { useAuth } from '@/contexts/AuthContext';
import { validatePhone, getLocalizedError } from '@/lib/validation';
import {
  SettingsSection,
  SliderSetting,
  NumberSetting,
  ToggleSetting,
  SummaryBox,
} from '@/components/ui/toolbar-expandable';
import { SmartVetoConfig } from '@/components/settings/SmartVetoConfig';
import { SmartVetoHelp } from '@/components/settings/SmartVetoHelp';

// Re-export for backward compatibility
export { DEFAULT_DETECTION_SETTINGS };
export type DetectionSettings = typeof DEFAULT_DETECTION_SETTINGS;

// Icons as minimal SVG components
const Icons = {
  brain: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  globe: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  zap: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  clock: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  volume: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  loader: (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  cloud: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    </svg>
  ),
  whatsapp: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  ),
  send: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
};

const translations = {
  en: {
    title: 'Settings',
    subtitle: 'Configure detection thresholds and preferences',
    detection: {
      title: 'Smart Veto Detection',
      description: 'AI-powered violence detection with intelligent override system',
      primary: 'Violence Detection Cutoff',
      primaryDesc: 'Primary model threshold for violence classification',
      veto: 'VETO Override Threshold',
      vetoDesc: 'If VETO score is below this, override to SAFE',
    },
    alerts: {
      title: 'Fight Alert Triggers',
      description: 'Configure when alerts are triggered',
      instant: 'Instant Fight Alert',
      instantDesc: 'Trigger immediately on high confidence',
      sustained: 'Sustained Fight Alert',
      sustainedDesc: 'Trigger after continuous detection',
      threshold: 'Threshold',
      count: 'Frame Count',
      duration: 'Duration',
      frames: 'frames',
      seconds: 'sec',
    },
    preferences: {
      title: 'Preferences',
      description: 'Sound, recording, and notification settings',
      sound: 'Alert Sound',
      soundDesc: 'Play sound when fight is detected',
      autoRecord: 'Auto Record',
      autoRecordDesc: 'Automatically record when violence detected',
    },
    language: {
      title: 'Language & Region',
      description: 'Change interface language',
      current: 'Current',
    },
    whatsapp: {
      title: 'WhatsApp Notifications',
      description: 'Receive violence alerts on WhatsApp',
      enable: 'Enable WhatsApp Alerts',
      enableDesc: 'Get instant notifications when violence is detected',
      phone: 'Phone Number',
      phoneDesc: 'Include country code (e.g., +966501234567)',
      phonePlaceholder: '+966501234567',
      test: 'Send Test',
      testing: 'Sending...',
      testSuccess: 'Test message sent!',
      testFailed: 'Failed to send',
      save: 'Save Number',
      saved: 'Number saved',
      minConfidence: 'Minimum Confidence',
      minConfidenceDesc: 'Only alert when confidence exceeds this threshold',
      cooldown: 'Alert Cooldown',
      cooldownDesc: 'Minimum time between WhatsApp alerts',
      cooldownOptions: {
        '30': '30 seconds',
        '60': '1 minute',
        '300': '5 minutes',
        '600': '10 minutes',
      },
    },
    summary: 'Configuration Summary',
    violenceCutoff: 'Violence Cutoff',
    vetoOverride: 'VETO Override',
    instantAlert: 'Instant Alert',
    sustainedAlert: 'Sustained Alert',
    saveChanges: 'Save Changes',
    saved: 'Saved',
    saving: 'Saving...',
    resetDefaults: 'Reset',
    cloudSync: 'Synced to cloud',
    localOnly: 'Stored locally',
    signInToSync: 'Sign in to sync settings across devices',
    helpTitle: 'Detection Settings Help',
    helpContent: 'These settings control how the Smart Veto Ensemble detects violence. The primary threshold determines when the main model flags content as violent. The VETO threshold allows a secondary model to override false positives.',
  },
  ar: {
    title: 'الإعدادات',
    subtitle: 'تكوين حدود الكشف والتفضيلات',
    detection: {
      title: 'كشف الفيتو الذكي',
      description: 'كشف العنف بالذكاء الاصطناعي مع نظام تجاوز ذكي',
      primary: 'حد كشف العنف',
      primaryDesc: 'حد النموذج الأساسي لتصنيف العنف',
      veto: 'حد تجاوز الفيتو',
      vetoDesc: 'إذا كانت درجة الفيتو أقل من هذا، تجاوز إلى آمن',
    },
    alerts: {
      title: 'محفزات تنبيه القتال',
      description: 'تكوين متى يتم تفعيل التنبيهات',
      instant: 'تنبيه قتال فوري',
      instantDesc: 'تفعيل فوري عند ثقة عالية',
      sustained: 'تنبيه قتال مستمر',
      sustainedDesc: 'تفعيل بعد كشف مستمر',
      threshold: 'الحد',
      count: 'عدد الإطارات',
      duration: 'المدة',
      frames: 'إطارات',
      seconds: 'ثانية',
    },
    preferences: {
      title: 'التفضيلات',
      description: 'إعدادات الصوت والتسجيل والإشعارات',
      sound: 'صوت التنبيه',
      soundDesc: 'تشغيل الصوت عند اكتشاف قتال',
      autoRecord: 'تسجيل تلقائي',
      autoRecordDesc: 'تسجيل تلقائي عند اكتشاف العنف',
    },
    language: {
      title: 'اللغة والمنطقة',
      description: 'تغيير لغة الواجهة',
      current: 'الحالية',
    },
    whatsapp: {
      title: 'إشعارات واتساب',
      description: 'تلقي تنبيهات العنف على واتساب',
      enable: 'تفعيل تنبيهات واتساب',
      enableDesc: 'احصل على إشعارات فورية عند اكتشاف العنف',
      phone: 'رقم الهاتف',
      phoneDesc: 'أدخل رمز الدولة (مثال: 966501234567+)',
      phonePlaceholder: '+966501234567',
      test: 'إرسال تجربة',
      testing: 'جاري الإرسال...',
      testSuccess: 'تم إرسال الرسالة التجريبية!',
      testFailed: 'فشل الإرسال',
      save: 'حفظ الرقم',
      saved: 'تم حفظ الرقم',
      minConfidence: 'الحد الأدنى للثقة',
      minConfidenceDesc: 'التنبيه فقط عندما تتجاوز الثقة هذا الحد',
      cooldown: 'فترة الانتظار بين التنبيهات',
      cooldownDesc: 'الحد الأدنى للوقت بين تنبيهات واتساب',
      cooldownOptions: {
        '30': '30 ثانية',
        '60': 'دقيقة واحدة',
        '300': '5 دقائق',
        '600': '10 دقائق',
      },
    },
    summary: 'ملخص التكوين',
    violenceCutoff: 'حد العنف',
    vetoOverride: 'تجاوز الفيتو',
    instantAlert: 'تنبيه فوري',
    sustainedAlert: 'تنبيه مستمر',
    saveChanges: 'حفظ التغييرات',
    saved: 'تم الحفظ',
    saving: 'جاري الحفظ...',
    resetDefaults: 'إعادة تعيين',
    cloudSync: 'متزامن مع السحابة',
    localOnly: 'مخزن محليًا',
    signInToSync: 'سجل دخول لمزامنة الإعدادات',
    helpTitle: 'مساعدة إعدادات الكشف',
    helpContent: 'تتحكم هذه الإعدادات في كيفية كشف مجموعة الفيتو الذكية عن العنف.',
  },
};

export default function SettingsPage() {
  const { locale, isRTL, setLocale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();

  const {
    settings,
    isLoading,
    isSaving,
    updateSetting,
    saveSettings,
    resetToDefaults,
    isAuthenticated,
  } = useDetectionSettings();

  // WhatsApp settings
  const {
    settings: alertSettings,
    loading: alertLoading,
    saving: alertSaving,
    error: alertError,
    updateSettings: updateAlertSettings,
    testWhatsApp,
  } = useAlertSettings(user?.id);

  // Smart Veto model configuration
  const {
    config: modelConfig,
    primaryModelSpec,
    vetoModelSpec,
  } = useModelConfiguration();

  // Use null to indicate "not yet edited by user" - falls back to alertSettings value
  // This avoids setState in useEffect (cascading render) while still syncing with server
  const [whatsappPhoneEdited, setWhatsappPhoneEdited] = useState<string | null>(null);
  const whatsappPhone = whatsappPhoneEdited ?? alertSettings?.whatsapp_number ?? '';
  const setWhatsappPhone = setWhatsappPhoneEdited;
  const [whatsappPhoneError, setWhatsappPhoneError] = useState<string | null>(null);
  const [whatsappTesting, setWhatsappTesting] = useState(false);
  const [whatsappTestResult, setWhatsappTestResult] = useState<'success' | 'failed' | null>(null);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  // Validate phone number on change
  const handlePhoneChange = (value: string) => {
    setWhatsappPhone(value);
    // Only show error if user has typed something
    if (value.trim()) {
      const validation = validatePhone(value);
      setWhatsappPhoneError(validation.isValid ? null : (getLocalizedError(validation.error, locale) || validation.error || null));
    } else {
      setWhatsappPhoneError(null);
    }
  };

  const handleWhatsAppToggle = async (enabled: boolean) => {
    if (!user) return;
    if (enabled && !whatsappPhone) return; // Don't enable without a phone number
    await updateAlertSettings({
      whatsapp_enabled: enabled,
      whatsapp_number: enabled ? whatsappPhone : alertSettings?.whatsapp_number,
    });
  };

  const handleWhatsAppSave = async () => {
    if (!whatsappPhone) return;
    // Validate before saving
    const validation = validatePhone(whatsappPhone, true);
    if (!validation.isValid) {
      setWhatsappPhoneError(getLocalizedError(validation.error, locale) || validation.error || null);
      return;
    }
    await updateAlertSettings({
      whatsapp_number: whatsappPhone,
    });
    setWhatsappPhoneError(null);
    setWhatsappTestResult('success');
    setTimeout(() => setWhatsappTestResult(null), 2000);
  };

  const handleWhatsAppTest = async () => {
    if (!whatsappPhone) return;
    // Validate before testing
    const validation = validatePhone(whatsappPhone, true);
    if (!validation.isValid) {
      setWhatsappPhoneError(getLocalizedError(validation.error, locale) || validation.error || null);
      return;
    }
    setWhatsappPhoneError(null);
    setWhatsappTesting(true);
    setWhatsappTestResult(null);
    setWhatsappError(null);
    const result = await testWhatsApp(whatsappPhone);
    setWhatsappTesting(false);
    setWhatsappTestResult(result.success ? 'success' : 'failed');
    if (!result.success && result.error) {
      setWhatsappError(result.error);
    }
    setTimeout(() => {
      setWhatsappTestResult(null);
      setWhatsappError(null);
    }, 5000);
  };

  const handleMinConfidenceChange = async (value: number) => {
    if (!user) return;
    await updateAlertSettings({ min_confidence: value / 100 });
  };

  const handleCooldownChange = async (value: number) => {
    if (!user) return;
    await updateAlertSettings({ alert_cooldown_seconds: value });
  };

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = () => {
    resetToDefaults();
  };

  if (isLoading || alertLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-zinc-400"
        >
          {Icons.loader}
          <span>Loading settings...</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen bg-zinc-950 p-3 sm:p-6', isRTL && 'rtl')}>
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-white">{t.title}</h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">{t.subtitle}</p>
          </div>

          {/* Smart Veto Help */}
          <SmartVetoHelp locale={locale as 'en' | 'ar'} isRTL={isRTL} />
        </div>

        {/* Sync Status */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
          isAuthenticated
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50"
        )}>
          {isAuthenticated ? Icons.cloud : Icons.user}
          <span>{isAuthenticated ? t.cloudSync : t.localOnly}</span>
          {!isAuthenticated && (
            <span className="text-zinc-600 ml-1">• {t.signInToSync}</span>
          )}
        </div>

        {/* Smart Veto Model Configuration */}
        <SettingsSection
          icon={Icons.brain}
          title={t.detection.title}
          description={t.detection.description}
          defaultOpen={true}
        >
          <SmartVetoConfig locale={locale as 'en' | 'ar'} isRTL={isRTL} />
        </SettingsSection>

        {/* Fight Alert Triggers */}
        <SettingsSection
          icon={Icons.zap}
          title={t.alerts.title}
          description={t.alerts.description}
        >
          <div className="space-y-6">
            {/* Instant Trigger */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-amber-400">{Icons.zap}</div>
                <div>
                  <p className="text-sm font-medium text-white">{t.alerts.instant}</p>
                  <p className="text-xs text-zinc-500">{t.alerts.instantDesc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberSetting
                  label={t.alerts.threshold}
                  value={settings.instant_trigger_threshold}
                  onChange={(v) => updateSetting('instant_trigger_threshold', v)}
                  min={50}
                  max={100}
                  unit="%"
                />
                <NumberSetting
                  label={t.alerts.count}
                  value={settings.instant_trigger_count}
                  onChange={(v) => updateSetting('instant_trigger_count', v)}
                  min={1}
                  max={10}
                  unit={t.alerts.frames}
                />
              </div>
              <p className="text-xs text-amber-400/70 mt-2">
                {settings.instant_trigger_count}× frames at {settings.instant_trigger_threshold}%+
              </p>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Sustained Trigger */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-amber-400">{Icons.clock}</div>
                <div>
                  <p className="text-sm font-medium text-white">{t.alerts.sustained}</p>
                  <p className="text-xs text-zinc-500">{t.alerts.sustainedDesc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberSetting
                  label={t.alerts.threshold}
                  value={settings.sustained_threshold}
                  onChange={(v) => updateSetting('sustained_threshold', v)}
                  min={30}
                  max={95}
                  unit="%"
                />
                <NumberSetting
                  label={t.alerts.duration}
                  value={settings.sustained_duration}
                  onChange={(v) => updateSetting('sustained_duration', v)}
                  min={1}
                  max={10}
                  unit={t.alerts.seconds}
                />
              </div>
              <p className="text-xs text-amber-400/70 mt-2">
                {settings.sustained_duration}s sustained at {settings.sustained_threshold}%+
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection
          icon={Icons.bell}
          title={t.preferences.title}
          description={t.preferences.description}
        >
          <div className="space-y-2">
            <ToggleSetting
              label={t.preferences.sound}
              description={t.preferences.soundDesc}
              checked={settings.sound_enabled}
              onChange={(v) => updateSetting('sound_enabled', v)}
            />
            <div className="h-px bg-zinc-800" />
            <ToggleSetting
              label={t.preferences.autoRecord}
              description={t.preferences.autoRecordDesc}
              checked={settings.auto_record}
              onChange={(v) => updateSetting('auto_record', v)}
            />
          </div>
        </SettingsSection>

        {/* WhatsApp Notifications */}
        <SettingsSection
          icon={Icons.whatsapp}
          title={t.whatsapp.title}
          description={t.whatsapp.description}
        >
          <div className="space-y-4">
            {/* Show login requirement */}
            {!user && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                <p className="text-sm text-amber-400">
                  {locale === 'ar' ? 'يرجى تسجيل الدخول لاستخدام إشعارات واتساب' : 'Please sign in to use WhatsApp notifications'}
                </p>
              </div>
            )}

            {/* Show error if any */}
            {alertError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{alertError}</p>
              </div>
            )}

            <ToggleSetting
              label={t.whatsapp.enable}
              description={t.whatsapp.enableDesc + (!whatsappPhone ? ' (Enter phone number first)' : '')}
              checked={alertSettings?.whatsapp_enabled || false}
              onChange={handleWhatsAppToggle}
            />

            <div className="h-px bg-zinc-800" />

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                {t.whatsapp.phone}
              </label>
              <p className="text-xs text-zinc-500">{t.whatsapp.phoneDesc}</p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={t.whatsapp.phonePlaceholder}
                  className={cn(
                    "flex-1 px-3 py-2 min-h-[44px] rounded-lg text-sm",
                    "bg-zinc-800 text-white",
                    "placeholder:text-zinc-500",
                    "focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                    whatsappPhoneError
                      ? "border-2 border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border border-zinc-700 focus:border-emerald-500/50",
                    isRTL && "text-right"
                  )}
                  dir="ltr"
                />
                <button
                  onClick={handleWhatsAppSave}
                  disabled={alertSaving || !whatsappPhone || !!whatsappPhoneError}
                  className={cn(
                    "px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all active:scale-95",
                    "bg-zinc-700 text-white hover:bg-zinc-600 active:bg-zinc-500",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {alertSaving ? Icons.loader : t.whatsapp.save}
                </button>
              </div>
              {whatsappPhoneError && (
                <p className="text-xs text-red-400 mt-1">{whatsappPhoneError}</p>
              )}
            </div>

            {/* Test Message Button */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleWhatsAppTest}
                  disabled={whatsappTesting || !whatsappPhone || !!whatsappPhoneError}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all active:scale-95",
                    whatsappTestResult === 'success'
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : whatsappTestResult === 'failed'
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-400",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {whatsappTesting ? (
                    <>
                      {Icons.loader}
                      {t.whatsapp.testing}
                    </>
                  ) : whatsappTestResult === 'success' ? (
                    <>
                      {Icons.check}
                      {t.whatsapp.testSuccess}
                    </>
                  ) : whatsappTestResult === 'failed' ? (
                    t.whatsapp.testFailed
                  ) : (
                    <>
                      {Icons.send}
                      {t.whatsapp.test}
                    </>
                  )}
                </button>
              </div>
              {/* Error message display */}
              {whatsappError && (
                <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                  Error: {whatsappError}
                </p>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Min Confidence Slider */}
            <SliderSetting
              label={t.whatsapp.minConfidence}
              description={t.whatsapp.minConfidenceDesc}
              value={Math.round((alertSettings?.min_confidence || 0.7) * 100)}
              onChange={handleMinConfidenceChange}
              min={30}
              max={95}
              color="green"
              marks={[
                { value: 30, label: '30%' },
                { value: 70, label: '70%' },
                { value: 95, label: '95%' },
              ]}
            />

            <div className="h-px bg-zinc-800" />

            {/* Alert Cooldown Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                {t.whatsapp.cooldown}
              </label>
              <p className="text-xs text-zinc-500">{t.whatsapp.cooldownDesc}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[30, 60, 300, 600].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => handleCooldownChange(seconds)}
                    disabled={!user}
                    className={cn(
                      "px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-all active:scale-95",
                      (alertSettings?.alert_cooldown_seconds || 60) === seconds
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-500/50"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white active:bg-zinc-600",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {t.whatsapp.cooldownOptions[seconds.toString() as keyof typeof t.whatsapp.cooldownOptions]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Language */}
        <SettingsSection
          icon={Icons.globe}
          title={t.language.title}
          description={t.language.description}
        >
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-white">{t.language.current}</p>
              <p className="text-xs text-zinc-500">{locale === 'en' ? 'English' : 'العربية'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setLocale('en')}
                className={cn(
                  "px-4 py-2 min-h-[44px] rounded-lg text-sm transition-colors active:scale-95",
                  locale === 'en'
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700"
                )}
              >
                English
              </button>
              <button
                onClick={() => setLocale('ar')}
                className={cn(
                  "px-4 py-2 min-h-[44px] rounded-lg text-sm transition-colors active:scale-95",
                  locale === 'ar'
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800 active:bg-zinc-700"
                )}
              >
                العربية
              </button>
            </div>
          </div>
        </SettingsSection>

        {/* Summary - Dynamic from Smart Veto Config */}
        <SummaryBox
          title={t.summary}
          items={[
            {
              label: locale === 'ar' ? 'النموذج الأساسي' : 'PRIMARY Model',
              value: primaryModelSpec?.displayName || modelConfig.primary_model,
              color: 'text-blue-400'
            },
            {
              label: locale === 'ar' ? 'حد الأساسي' : 'PRIMARY Threshold',
              value: `≥${modelConfig.primary_threshold}%`,
              color: 'text-red-400'
            },
            {
              label: locale === 'ar' ? 'نموذج الفيتو' : 'VETO Model',
              value: vetoModelSpec?.displayName || modelConfig.veto_model,
              color: 'text-purple-400'
            },
            {
              label: locale === 'ar' ? 'حد الفيتو' : 'VETO Threshold',
              value: `≥${modelConfig.veto_threshold}%`,
              color: 'text-orange-400'
            },
          ]}
        />

        {/* Actions - Mobile optimized */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
          <button
            onClick={handleReset}
            className="px-4 py-3 min-h-[48px] text-sm text-zinc-400 hover:text-white transition-colors active:scale-95 order-2 sm:order-1"
          >
            {t.resetDefaults}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-lg text-sm font-medium transition-all active:scale-95 order-1 sm:order-2",
              saved
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
            )}
          >
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  {Icons.loader}
                  {t.saving}
                </motion.span>
              ) : saved ? (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  {Icons.check}
                  {t.saved}
                </motion.span>
              ) : (
                <motion.span
                  key="save"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {t.saveChanges}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
}
