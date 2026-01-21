'use client';

import { useLanguage } from './LanguageContext';
import en from './locales/en.json';
import ar from './locales/ar.json';

type TranslationKeys = typeof en;

const translations: Record<string, TranslationKeys> = {
  en,
  ar,
};

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

type TranslationKey = NestedKeyOf<TranslationKeys>;

export function useTranslations() {
  const { locale } = useLanguage();
  const t = translations[locale] || translations.en;

  const translate = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: unknown = t;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        // Fallback to English if key not found
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters
    if (params) {
      let result = value;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(`{${paramKey}}`, String(paramValue));
      }
      return result;
    }

    return value;
  };

  return { t: translate, locale };
}
