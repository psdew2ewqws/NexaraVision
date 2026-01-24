'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/i18n/LanguageContext';
import { Profile } from '@/types/database';

const translations = {
  en: {
    greeting: 'Welcome to NexaraVision',
    hello: 'Hello',
    subtitle: 'AI-Powered Violence Detection for Security Teams',
    description: "Let's configure your security monitoring system in just a few steps. You can always change these settings later.",
    features: [
      { title: 'Smart Veto Detection', desc: 'Dual-model AI that minimizes false alarms' },
      { title: 'Instant Alerts', desc: 'Get notified via WhatsApp when incidents occur' },
      { title: 'Real-time Monitoring', desc: 'Live video analysis at 30 FPS' },
      { title: 'Enterprise Security', desc: 'Bank-grade encryption and compliance' },
    ],
    ready: 'Ready to get started?',
  },
  ar: {
    greeting: 'مرحباً بك في نكسارا فيجن',
    hello: 'أهلاً',
    subtitle: 'كشف العنف بالذكاء الاصطناعي لفرق الأمن',
    description: 'دعنا نقوم بإعداد نظام المراقبة الأمنية الخاص بك في بضع خطوات بسيطة. يمكنك دائماً تغيير هذه الإعدادات لاحقاً.',
    features: [
      { title: 'كشف الفيتو الذكي', desc: 'ذكاء اصطناعي مزدوج يقلل الإنذارات الكاذبة' },
      { title: 'تنبيهات فورية', desc: 'احصل على إشعارات واتساب عند وقوع حوادث' },
      { title: 'مراقبة مباشرة', desc: 'تحليل فيديو حي بـ 30 إطار في الثانية' },
      { title: 'أمان مؤسسي', desc: 'تشفير بدرجة البنوك ومطابقة المعايير' },
    ],
    ready: 'هل أنت جاهز للبدء؟',
  },
};

interface WelcomeStepProps {
  profile: Profile;
}

export function WelcomeStep({ profile }: WelcomeStepProps) {
  const { locale } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;
  const userName = profile.full_name || profile.email.split('@')[0];

  return (
    <div className="space-y-8">
      {/* Header - No icon, just clean text */}
      <div className="text-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold text-white mb-3"
        >
          {t.hello}, <span className="text-blue-400">{userName}</span>!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-300 mb-1"
        >
          {t.greeting}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-sm text-blue-400/80"
        >
          {t.subtitle}
        </motion.p>
      </div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center text-slate-400 text-sm"
      >
        {t.description}
      </motion.p>

      {/* Features - Simple list, no icons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        {t.features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.08 }}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/30 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-white text-sm">{feature.title}</h3>
              <p className="text-xs text-slate-500">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Ready prompt */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-center text-slate-500 text-sm pt-2"
      >
        {t.ready}
      </motion.p>
    </div>
  );
}
