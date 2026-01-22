'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Locale, defaultLocale, localeDirection } from './config';
import { i18nLogger as log } from '@/lib/logger';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: 'ltr' | 'rtl';
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'nexara-language';

// Get initial locale from localStorage (client-side only)
function getInitialLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === 'en' || saved === 'ar')) {
      return saved;
    }
  } catch {
    // localStorage might not be available (private browsing, etc.)
  }
  return defaultLocale;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      // Update document attributes
      document.documentElement.lang = locale;
      document.documentElement.dir = localeDirection[locale];

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch (e) {
        log.warn('Unable to save to localStorage:', e);
      }
    }
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
  };

  const direction = localeDirection[locale];
  const isRTL = direction === 'rtl';

  // Always render children - use default values during SSR/initial hydration
  // This prevents the loading spinner from blocking the entire app
  return (
    <LanguageContext.Provider value={{ locale, setLocale, direction, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
