'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { validatePhone, checkWhatsAppDuplicate } from '@/lib/validation';
import type { OnboardingData } from '@/app/onboarding/page';

const translations = {
  en: {
    title: 'WhatsApp Alerts',
    subtitle: 'Get instant notifications when violence is detected',
    enableLabel: 'Enable WhatsApp Notifications',
    enableDesc: 'Receive real-time alerts directly on WhatsApp',
    phoneLabel: 'Phone Number',
    phonePlaceholder: '+962791234567',
    phoneHint: 'Include country code (e.g., +962 for Jordan)',
    example: 'Example: You will receive alerts like:',
    sampleAlert: '🚨 FIGHT DETECTED\nLocation: Main Entrance\nConfidence: 94.2%\nTime: 2:34 PM',
    skip: 'You can set this up later in Settings',
    checking: 'Checking availability...',
    validation: {
      invalid: 'Please enter a valid phone number with country code',
      duplicate: 'This phone number is already registered by another user',
      example: 'Format: +[country code][number]',
    },
  },
  ar: {
    title: 'تنبيهات واتساب',
    subtitle: 'احصل على إشعارات فورية عند اكتشاف العنف',
    enableLabel: 'تفعيل إشعارات واتساب',
    enableDesc: 'استلم تنبيهات مباشرة على واتساب',
    phoneLabel: 'رقم الهاتف',
    phonePlaceholder: '+962791234567',
    phoneHint: 'أضف رمز الدولة (مثال: +962 للأردن)',
    example: 'مثال: ستتلقى تنبيهات مثل:',
    sampleAlert: '🚨 تم اكتشاف مشاجرة\nالموقع: المدخل الرئيسي\nالثقة: 94.2%\nالوقت: 2:34 م',
    skip: 'يمكنك إعداد هذا لاحقاً من الإعدادات',
    checking: 'جاري التحقق من التوفر...',
    validation: {
      invalid: 'الرجاء إدخال رقم هاتف صحيح مع رمز الدولة',
      duplicate: 'رقم الهاتف هذا مسجل بالفعل لمستخدم آخر',
      example: 'الصيغة: +[رمز الدولة][الرقم]',
    },
  },
};

interface WhatsAppStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function WhatsAppStep({ data, updateData }: WhatsAppStepProps) {
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Check for duplicate phone number with debouncing
  const checkDuplicate = useCallback(async (phone: string) => {
    if (!phone || phone.length < 10) return;

    const validation = validatePhone(phone);
    if (!validation.isValid) return;

    setIsChecking(true);
    try {
      const result = await checkWhatsAppDuplicate(phone);
      if (result.isDuplicate) {
        setError(t.validation.duplicate);
      }
    } finally {
      setIsChecking(false);
    }
  }, [t.validation.duplicate]);

  const handlePhoneChange = (value: string) => {
    updateData({ whatsappNumber: value });

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value && data.whatsappEnabled) {
      const validation = validatePhone(value);
      if (!validation.isValid) {
        setError(t.validation.invalid);
        return;
      }
      setError(null);

      // Debounce the duplicate check
      debounceRef.current = setTimeout(() => {
        checkDuplicate(value);
      }, 500);
    } else {
      setError(null);
    }
  };

  // Check on blur for immediate feedback
  const handlePhoneBlur = () => {
    if (data.whatsappNumber && data.whatsappEnabled) {
      const validation = validatePhone(data.whatsappNumber);
      if (validation.isValid && !error) {
        checkDuplicate(data.whatsappNumber);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4"
        >
          <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold text-white mb-2"
        >
          {t.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-400"
        >
          {t.subtitle}
        </motion.p>
      </div>

      {/* Enable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <p className="font-medium text-white">{t.enableLabel}</p>
            <p className="text-sm text-slate-400">{t.enableDesc}</p>
          </div>
          <button
            onClick={() => updateData({ whatsappEnabled: !data.whatsappEnabled })}
            className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
              data.whatsappEnabled ? 'bg-green-500' : 'bg-slate-700'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm"
              animate={{ x: data.whatsappEnabled ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </motion.div>

      {/* Phone Input */}
      {data.whatsappEnabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t.phoneLabel}
            </label>
            <div className="relative">
              <input
                type="tel"
                value={data.whatsappNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder={t.phonePlaceholder}
                className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors ${
                  error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:ring-green-500/50'
                }`}
                dir="ltr"
              />
              {isChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            {isChecking ? (
              <p className="mt-2 text-sm text-slate-400">{t.checking}</p>
            ) : error ? (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{t.phoneHint}</p>
            )}
          </div>

          {/* Sample Alert Preview */}
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-sm text-green-400 mb-2">{t.example}</p>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
              {t.sampleAlert}
            </pre>
          </div>
        </motion.div>
      )}

      {!data.whatsappEnabled && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-slate-500"
        >
          {t.skip}
        </motion.p>
      )}
    </div>
  );
}
