/**
 * Supabase Error Handling Utilities
 * Addresses GAP-ERR-001 to GAP-ERR-026 from deep dive analysis
 */

import { supabaseLogger as log } from '@/lib/logger';

// Common Supabase error codes
export const SUPABASE_ERROR_CODES = {
  // Auth errors
  INVALID_CREDENTIALS: 'invalid_credentials',
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  USER_NOT_FOUND: 'user_not_found',
  INVALID_TOKEN: 'invalid_token',
  SESSION_EXPIRED: 'session_expired',

  // RLS/Permission errors
  INSUFFICIENT_PRIVILEGE: '42501',
  ROW_LEVEL_SECURITY_VIOLATION: 'PGRST116',

  // Database errors
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Storage errors
  STORAGE_OBJECT_NOT_FOUND: 'storage/object-not-found',
  STORAGE_UNAUTHORIZED: 'storage/unauthorized',
  STORAGE_QUOTA_EXCEEDED: 'storage/quota-exceeded',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, { en: string; ar: string }> = {
  [SUPABASE_ERROR_CODES.INVALID_CREDENTIALS]: {
    en: 'Invalid email or password',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
  },
  [SUPABASE_ERROR_CODES.EMAIL_NOT_CONFIRMED]: {
    en: 'Please confirm your email address',
    ar: 'يرجى تأكيد بريدك الإلكتروني',
  },
  [SUPABASE_ERROR_CODES.SESSION_EXPIRED]: {
    en: 'Your session has expired. Please log in again',
    ar: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى',
  },
  [SUPABASE_ERROR_CODES.INSUFFICIENT_PRIVILEGE]: {
    en: 'You do not have permission to perform this action',
    ar: 'ليس لديك إذن لتنفيذ هذا الإجراء',
  },
  [SUPABASE_ERROR_CODES.ROW_LEVEL_SECURITY_VIOLATION]: {
    en: 'Access denied due to security policy',
    ar: 'تم رفض الوصول بسبب سياسة الأمان',
  },
  [SUPABASE_ERROR_CODES.UNIQUE_VIOLATION]: {
    en: 'This record already exists',
    ar: 'هذا السجل موجود بالفعل',
  },
  [SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION]: {
    en: 'Cannot complete action: related record not found',
    ar: 'لا يمكن إكمال الإجراء: السجل المرتبط غير موجود',
  },
  [SUPABASE_ERROR_CODES.NETWORK_ERROR]: {
    en: 'Network error. Please check your connection',
    ar: 'خطأ في الشبكة. يرجى التحقق من الاتصال',
  },
  [SUPABASE_ERROR_CODES.TIMEOUT]: {
    en: 'Request timed out. Please try again',
    ar: 'انتهت مهلة الطلب. حاول مرة أخرى',
  },
  [SUPABASE_ERROR_CODES.STORAGE_OBJECT_NOT_FOUND]: {
    en: 'File not found',
    ar: 'الملف غير موجود',
  },
  [SUPABASE_ERROR_CODES.STORAGE_UNAUTHORIZED]: {
    en: 'You do not have permission to access this file',
    ar: 'ليس لديك إذن للوصول إلى هذا الملف',
  },
  [SUPABASE_ERROR_CODES.STORAGE_QUOTA_EXCEEDED]: {
    en: 'Storage quota exceeded',
    ar: 'تم تجاوز حصة التخزين',
  },
};

// Default error message
const DEFAULT_ERROR = {
  en: 'An unexpected error occurred. Please try again',
  ar: 'حدث خطأ غير متوقع. حاول مرة أخرى',
};

/**
 * Structured error type for Supabase operations
 */
export interface SupabaseError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
  isRLSError?: boolean;
  isNetworkError?: boolean;
  isAuthError?: boolean;
  originalError?: unknown;
}

/**
 * Result type for operations that may fail
 */
export type SupabaseResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: SupabaseError };

/**
 * Parse a Supabase error and return a structured error object
 */
export function parseSupabaseError(error: unknown): SupabaseError {
  // Handle null/undefined
  if (!error) {
    return {
      code: 'UNKNOWN',
      message: 'An unknown error occurred',
    };
  }

  // Handle PostgrestError from Supabase
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;

    const code = (e.code as string) || (e.error_code as string) || 'UNKNOWN';
    const message = (e.message as string) || (e.error_description as string) || 'Unknown error';
    const details = e.details as string | undefined;
    const hint = e.hint as string | undefined;

    return {
      code,
      message,
      details,
      hint,
      isRLSError: code === SUPABASE_ERROR_CODES.ROW_LEVEL_SECURITY_VIOLATION ||
                  code === SUPABASE_ERROR_CODES.INSUFFICIENT_PRIVILEGE,
      isNetworkError: message.toLowerCase().includes('network') ||
                      message.toLowerCase().includes('fetch'),
      isAuthError: code.startsWith('auth/') ||
                   ['invalid_credentials', 'email_not_confirmed', 'session_expired'].includes(code),
      originalError: error,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: 'STRING_ERROR',
      message: error,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    return {
      code: error.name,
      message: error.message,
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN',
    message: String(error),
    originalError: error,
  };
}

/**
 * Get a user-friendly error message from an error code
 */
export function getUserFriendlyMessage(
  code: string,
  locale: 'en' | 'ar' = 'en'
): string {
  const messages = ERROR_MESSAGES[code];
  if (messages) {
    return messages[locale];
  }
  return DEFAULT_ERROR[locale];
}

/**
 * Check if an error indicates a silent RLS failure
 * RLS can fail silently by returning 0 rows instead of an error
 */
export function isRLSSilentFailure(
  result: { data: unknown[] | null; error: unknown; count?: number | null }
): boolean {
  // If there's an explicit error, it's not a silent failure
  if (result.error) return false;

  // If count is 0 and we expected data, it might be RLS blocking
  if (result.count === 0 && result.data?.length === 0) return true;

  // If data is empty array with no count, might be RLS
  if (Array.isArray(result.data) && result.data.length === 0 && result.count === null) {
    return true;
  }

  return false;
}

/**
 * Log error with context for debugging
 * (Does NOT swallow errors - addresses GAP-ERR-001 to GAP-ERR-007)
 */
export function logSupabaseError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  const parsed = parseSupabaseError(error);

  log.error(`[Error] ${context}:`, {
    code: parsed.code,
    message: parsed.message,
    details: parsed.details,
    hint: parsed.hint,
    isRLSError: parsed.isRLSError,
    isNetworkError: parsed.isNetworkError,
    isAuthError: parsed.isAuthError,
    ...additionalInfo,
  });
}

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<{ data: T | null; error: unknown }>,
  context: string
): Promise<SupabaseResult<T>> {
  try {
    const { data, error } = await operation();

    if (error) {
      logSupabaseError(context, error);
      return {
        success: false,
        data: null,
        error: parseSupabaseError(error),
      };
    }

    if (data === null) {
      return {
        success: false,
        data: null,
        error: {
          code: 'NO_DATA',
          message: 'Operation succeeded but returned no data',
        },
      };
    }

    return {
      success: true,
      data,
      error: null,
    };
  } catch (err) {
    logSupabaseError(context, err);
    return {
      success: false,
      data: null,
      error: parseSupabaseError(err),
    };
  }
}

/**
 * Retry an operation with exponential backoff
 * Addresses GAP-INC-004 (no retry mechanism)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    context?: string;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, context = 'Operation' } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        log.warn(`[${context}] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Create a safe wrapper for WebSocket error handling
 * Addresses GAP-ERR-008 to GAP-ERR-012
 */
export function createWebSocketErrorHandler(context: string) {
  return {
    onError: (event: Event) => {
      log.error(`[WebSocket Error] ${context}:`, {
        type: event.type,
        timestamp: new Date().toISOString(),
      });
    },
    onClose: (event: CloseEvent) => {
      if (!event.wasClean) {
        log.warn(`[WebSocket Close] ${context}: Unclean close`, {
          code: event.code,
          reason: event.reason,
          timestamp: new Date().toISOString(),
        });
      }
    },
    handleMessageError: (error: unknown, rawMessage: string) => {
      log.error(`[WebSocket Parse Error] ${context}:`, {
        error: parseSupabaseError(error),
        messagePreview: rawMessage.substring(0, 100),
        timestamp: new Date().toISOString(),
      });
    },
  };
}
