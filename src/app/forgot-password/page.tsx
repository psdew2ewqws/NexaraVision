'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import {
  TextureCardStyled,
  TextureCardHeader,
  TextureCardTitle,
  TextureCardDescription,
  TextureCardContent,
  TextureCardFooter,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { TextureButton } from '@/components/ui/texture-button';

const translations = {
  en: {
    title: 'NexaraVision',
    subtitle: 'AI-Powered Security Monitoring',
    forgotPassword: 'Forgot Password?',
    description: "Enter your email and we'll send you a reset link",
    email: 'Email',
    sendLink: 'Send Reset Link',
    sending: 'Sending...',
    rememberPassword: 'Remember your password?',
    signIn: 'Sign In',
    security: 'Enterprise-grade security',
    checkEmail: 'Check Your Email',
    emailSent: "We've sent a password reset link to",
    checkInbox: 'Please check your inbox and follow the instructions to reset your password.',
    backToLogin: 'Back to Login',
  },
  ar: {
    title: 'نكسارا فيجن',
    subtitle: 'مراقبة أمنية بالذكاء الاصطناعي',
    forgotPassword: 'نسيت كلمة المرور؟',
    description: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
    email: 'البريد الإلكتروني',
    sendLink: 'إرسال رابط إعادة التعيين',
    sending: 'جاري الإرسال...',
    rememberPassword: 'تتذكر كلمة المرور؟',
    signIn: 'تسجيل الدخول',
    security: 'أمان مؤسسي',
    checkEmail: 'تحقق من بريدك الإلكتروني',
    emailSent: 'لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى',
    checkInbox: 'يرجى التحقق من صندوق الوارد واتباع التعليمات لإعادة تعيين كلمة المرور.',
    backToLogin: 'العودة لتسجيل الدخول',
  },
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center bg-slate-950 p-4', isRTL && 'rtl')}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
            <p className="text-slate-400 text-sm mt-1">{t.subtitle}</p>
          </div>

          <TextureCardStyled>
            <TextureCardContent className="pt-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">{t.checkEmail}</h2>
              <p className="text-slate-400 text-sm mb-4">
                {t.emailSent} <strong className="text-white">{email}</strong>. {t.checkInbox}
              </p>
              <Link href="/login">
                <TextureButton variant="accent" className="w-full">
                  {t.backToLogin}
                </TextureButton>
              </Link>
            </TextureCardContent>
          </TextureCardStyled>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen flex items-center justify-center bg-slate-950 p-4', isRTL && 'rtl')}>
      <div className="w-full max-w-sm">
        {/* Logo - No icon */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{t.subtitle}</p>
        </div>

        {/* Forgot Password Card */}
        <TextureCardStyled>
          <TextureCardHeader className="pb-4">
            <TextureCardTitle className="text-center text-lg">{t.forgotPassword}</TextureCardTitle>
            <TextureCardDescription className="text-center">{t.description}</TextureCardDescription>
          </TextureCardHeader>

          <TextureCardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">{t.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  dir="ltr"
                />
              </div>

              {/* Submit */}
              <TextureButton
                type="submit"
                variant="accent"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t.sending}
                  </>
                ) : (
                  <>
                    {t.sendLink}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </>
                )}
              </TextureButton>
            </form>
          </TextureCardContent>

          <TextureSeparator className="mx-6" />

          <TextureCardFooter className="justify-center pt-4">
            <p className="text-sm text-slate-400">
              {t.rememberPassword}{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">
                {t.signIn}
              </Link>
            </p>
          </TextureCardFooter>
        </TextureCardStyled>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {t.security}
          </div>
          <span>•</span>
          <Link
            href={`?locale=${locale === 'en' ? 'ar' : 'en'}`}
            className="hover:text-slate-300 transition-colors"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </Link>
        </div>
      </div>
    </div>
  );
}
