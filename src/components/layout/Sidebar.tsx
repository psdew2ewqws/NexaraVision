'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/database';

// Minimal SVG icons
const Icons = {
  dashboard: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  live: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
  ),
  analysis: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-4 4 4 6-6" />
    </svg>
  ),
  cameras: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  ),
  alerts: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  users: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
    </svg>
  ),
  models: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  settings: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  logout: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  globe: (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  menu: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="9,6 15,12 9,18" />
    </svg>
  ),
};

const menuItems = [
  { titleKey: 'nav.dashboard', title: { en: 'Dashboard', ar: 'لوحة التحكم' }, href: '/', icon: 'dashboard', adminOnly: false },
  { titleKey: 'nav.liveDetection', title: { en: 'Live Detection', ar: 'الكشف المباشر' }, href: '/live', icon: 'live', adminOnly: false },
  { titleKey: 'nav.analysis', title: { en: 'Analysis', ar: 'التحليل' }, href: '/analysis', icon: 'analysis', adminOnly: false },
  { titleKey: 'nav.cameras', title: { en: 'Cameras', ar: 'الكاميرات' }, href: '/cameras', icon: 'cameras', adminOnly: false },
  { titleKey: 'nav.alerts', title: { en: 'Alerts', ar: 'التنبيهات' }, href: '/alerts', icon: 'alerts', adminOnly: false },
  { titleKey: 'nav.models', title: { en: 'ML Models', ar: 'نماذج الذكاء' }, href: '/models', icon: 'models', adminOnly: false },
  { titleKey: 'nav.users', title: { en: 'Users', ar: 'المستخدمين' }, href: '/users', icon: 'users', adminOnly: false },
  { titleKey: 'nav.settings', title: { en: 'Settings', ar: 'الإعدادات' }, href: '/settings', icon: 'settings', adminOnly: false },
] as const;

const roleConfig: Record<UserRole, { label: { en: string; ar: string }; color: string }> = {
  admin: { label: { en: 'Admin', ar: 'مدير' }, color: 'text-purple-400' },
  manager: { label: { en: 'Manager', ar: 'مشرف' }, color: 'text-blue-400' },
  guard: { label: { en: 'Guard', ar: 'حارس' }, color: 'text-emerald-400' },
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { locale, setLocale, isRTL } = useLanguage();
  const { signOut, profile, isAdmin, loading: authLoading, user } = useAuth();

  // Handle logout with redirect - use full page reload to properly clear session
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always redirect to login, even if signOut fails
      // Use window.location for full page reload to ensure auth state clears
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) setCollapsed(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu on route change - external system sync
  /* eslint-disable react-hooks/set-state-in-effect -- Route change triggers menu close */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const userRole = profile?.role || 'guard';

  return (
    <>
      {/* Mobile Menu Button - Touch optimized */}
      <AnimatePresence>
        {isMobile && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? (locale === 'ar' ? 'إغلاق القائمة' : 'Close menu') : (locale === 'ar' ? 'فتح القائمة' : 'Open menu')}
            aria-expanded={mobileOpen}
            className={cn(
              "fixed top-3 z-50 p-3 min-h-[48px] min-w-[48px] rounded-2xl md:hidden",
              "bg-slate-900/95 backdrop-blur-xl",
              "border border-white/[0.08]",
              "active:scale-95 transition-transform",
              "flex items-center justify-center",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
              isRTL ? "right-3" : "left-3"
            )}
          >
            {mobileOpen ? Icons.close : Icons.menu}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: isMobile ? 240 : collapsed ? 64 : 240,
          x: isMobile && !mobileOpen ? (isRTL ? 240 : -240) : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className={cn(
          "h-screen z-40 flex flex-col",
          "bg-slate-950",
          "border-white/[0.06]",
          isRTL ? "border-l" : "border-r",
          isMobile && "fixed top-0",
          isMobile && (isRTL ? "right-0" : "left-0")
        )}
      >
        {/* Header - Logo text only */}
        <div className={cn(
          "h-14 flex items-center px-4 shrink-0",
          "border-b border-white/[0.06]",
          collapsed ? "justify-center" : "justify-between",
          isRTL && !collapsed && "flex-row-reverse"
        )}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.span
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-semibold text-white tracking-tight text-[15px]"
              >
                NexaraVision
              </motion.span>
            ) : (
              <motion.span
                key="logo-short"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-bold text-white text-sm"
              >
                NV
              </motion.span>
            )}
          </AnimatePresence>

          {!isMobile && !collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              aria-label={locale === 'ar' ? 'طي الشريط الجانبي' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isRTL ? Icons.chevronRight : Icons.chevronLeft}
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {!isMobile && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label={locale === 'ar' ? 'توسيع الشريط الجانبي' : 'Expand sidebar'}
            className="mx-auto mt-3 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isRTL ? Icons.chevronLeft : Icons.chevronRight}
          </button>
        )}

        {/* Navigation - Touch optimized */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          <div className="space-y-1">
            {menuItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const title = item.title[locale as 'en' | 'ar'] || item.title.en;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? title : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg transition-all duration-150 active:scale-[0.98]",
                      collapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "px-3 py-2.5 min-h-[44px]",
                      isRTL && !collapsed && "flex-row-reverse",
                      isActive
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <span className="shrink-0">{Icons[item.icon as keyof typeof Icons]}</span>
                    {!collapsed && (
                      <span className="text-[13px] font-medium">{title}</span>
                    )}
                  </Link>
                );
              })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-white/[0.06] space-y-0.5">
          {/* User - show loading state or fallback to user email */}
          {(profile || user || authLoading) && (
            <div className={cn(
              "flex items-center gap-2.5 p-2 rounded-lg mb-1",
              collapsed && "justify-center",
              isRTL && !collapsed && "flex-row-reverse"
            )}>
              {authLoading && !profile ? (
                // Loading skeleton
                <>
                  <div className="w-7 h-7 rounded-md bg-slate-700 animate-pulse shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="h-4 bg-slate-700 rounded animate-pulse w-24" />
                      <div className="h-3 bg-slate-700 rounded animate-pulse w-16" />
                    </div>
                  )}
                </>
              ) : (
                // Actual user info - use profile or fallback to user email
                <>
                  <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-white text-xs font-medium shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() ||
                     profile?.email?.[0]?.toUpperCase() ||
                     user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  {!collapsed && (
                    <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                      <p className="text-[13px] text-white truncate">
                        {profile?.full_name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Loading...'}
                      </p>
                      <p className={cn("text-[11px]", roleConfig[userRole].color)}>
                        {roleConfig[userRole].label[locale as 'en' | 'ar'] || roleConfig[userRole].label.en}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Language - Touch optimized */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            aria-label={locale === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg transition-colors active:scale-[0.98]",
              collapsed ? "justify-center p-2.5 h-10" : "px-3 py-2.5 min-h-[44px]",
              isRTL && !collapsed && "flex-row-reverse",
              "text-slate-400 hover:text-white hover:bg-white/[0.04]",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            )}
            title={collapsed ? (locale === 'en' ? 'العربية' : 'English') : undefined}
          >
            {Icons.globe}
            {!collapsed && (
              <span className="text-[13px] font-medium">
                {locale === 'en' ? 'العربية' : 'English'}
              </span>
            )}
          </button>

          {/* Logout - Touch optimized */}
          <button
            onClick={handleLogout}
            aria-label={locale === 'en' ? 'Logout' : 'تسجيل الخروج'}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg transition-colors active:scale-[0.98]",
              collapsed ? "justify-center p-2.5 h-10" : "px-3 py-2.5 min-h-[44px]",
              isRTL && !collapsed && "flex-row-reverse",
              "text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08]",
              "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset"
            )}
            title={collapsed ? (locale === 'en' ? 'Logout' : 'تسجيل الخروج') : undefined}
          >
            {Icons.logout}
            {!collapsed && (
              <span className="text-[13px] font-medium">
                {locale === 'en' ? 'Logout' : 'تسجيل الخروج'}
              </span>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
