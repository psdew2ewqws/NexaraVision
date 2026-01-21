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
  TextureCardContent,
  TextureCardFooter,
  TextureSeparator,
} from '@/components/ui/texture-card';
import { TextureButton } from '@/components/ui/texture-button';

const translations = {
  en: {
    title: 'NexaraVision',
    subtitle: 'AI-Powered Security Monitoring',
    createAccount: 'Create Account',
    creating: 'Creating account...',
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    haveAccount: 'Already have an account?',
    signIn: 'Sign In',
    security: 'Enterprise-grade security',
    checkEmail: 'Check Your Email',
    emailSent: "We've sent a confirmation link to",
    checkInbox: 'Please check your inbox and click the link to activate your account.',
    backToLogin: 'Back to Login',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
  },
  ar: {
    title: 'نكسارا فيجن',
    subtitle: 'مراقبة أمنية بالذكاء الاصطناعي',
    createAccount: 'إنشاء حساب',
    creating: 'جاري إنشاء الحساب...',
    fullName: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    haveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    security: 'أمان مؤسسي',
    checkEmail: 'تحقق من بريدك الإلكتروني',
    emailSent: 'لقد أرسلنا رابط التأكيد إلى',
    checkInbox: 'يرجى التحقق من صندوق الوارد الخاص بك والنقر على الرابط لتفعيل حسابك.',
    backToLogin: 'العودة لتسجيل الدخول',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    passwordTooShort: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
  },
};

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { locale, isRTL } = useLanguage();
  const t = translations[locale as 'en' | 'ar'] || translations.en;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(t.passwordTooShort);
      setLoading(false);
      return;
    }

    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
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

        {/* Signup Card */}
        <TextureCardStyled>
          <TextureCardHeader className="pb-4">
            <TextureCardTitle className="text-center text-lg">{t.createAccount}</TextureCardTitle>
          </TextureCardHeader>

          <TextureCardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">{t.fullName}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>

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

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.574 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.574-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">{t.confirmPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-white/10 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="••••••••"
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
                    {t.creating}
                  </>
                ) : (
                  <>
                    {t.createAccount}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </>
                )}
              </TextureButton>
            </form>
          </TextureCardContent>

          <TextureSeparator className="mx-6" />

          <TextureCardFooter className="justify-center pt-4">
            <p className="text-sm text-slate-400">
              {t.haveAccount}{' '}
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
