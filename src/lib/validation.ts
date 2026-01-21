/**
 * Validation Utilities
 * Addresses GAP-CQ-004: Missing Input Validation
 *
 * Provides validators for common input types used throughout the application.
 */

/**
 * UUID v4 regex pattern
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4 format
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value);
}

/**
 * Validates that a value is a valid confidence score (0-100)
 */
export function isValidConfidence(value: unknown): value is number {
  if (typeof value !== 'number') return false;
  return !isNaN(value) && value >= 0 && value <= 100;
}

/**
 * Validates that a value is a valid violence score (0-1)
 */
export function isValidViolenceScore(value: unknown): value is number {
  if (typeof value !== 'number') return false;
  return !isNaN(value) && value >= 0 && value <= 1;
}

/**
 * Validates that a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates email format
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  // Basic email regex - covers most cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validates URL format
 */
export function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates RTSP URL format
 */
export function isValidRtspUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value.startsWith('rtsp://') || value.startsWith('rtsps://');
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates incident creation data
 */
export function validateIncidentData(data: {
  camera_id?: unknown;
  location_id?: unknown;
  confidence?: unknown;
  violence_score?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  // Validate camera_id if provided
  if (data.camera_id !== undefined && data.camera_id !== null) {
    if (!isValidUUID(data.camera_id)) {
      errors.push('Invalid camera_id: must be a valid UUID');
    }
  }

  // Validate location_id if provided
  if (data.location_id !== undefined && data.location_id !== null) {
    if (!isValidUUID(data.location_id)) {
      errors.push('Invalid location_id: must be a valid UUID');
    }
  }

  // Validate confidence
  if (data.confidence !== undefined) {
    if (!isValidConfidence(data.confidence)) {
      errors.push('Invalid confidence: must be a number between 0 and 100');
    }
  }

  // Validate violence_score if provided
  if (data.violence_score !== undefined) {
    if (!isValidViolenceScore(data.violence_score)) {
      errors.push('Invalid violence_score: must be a number between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates camera data
 */
export function validateCameraData(data: {
  name?: unknown;
  stream_url?: unknown;
  sensitivity?: unknown;
}): ValidationResult {
  const errors: string[] = [];

  // Validate name
  if (data.name !== undefined && !isNonEmptyString(data.name)) {
    errors.push('Invalid name: must be a non-empty string');
  }

  // Validate stream_url if provided
  if (data.stream_url !== undefined && data.stream_url !== null) {
    if (typeof data.stream_url === 'string' && data.stream_url.trim()) {
      if (!isValidUrl(data.stream_url) && !isValidRtspUrl(data.stream_url)) {
        errors.push('Invalid stream_url: must be a valid URL or RTSP URL');
      }
    }
  }

  // Validate sensitivity
  if (data.sensitivity !== undefined) {
    if (typeof data.sensitivity !== 'number' || data.sensitivity < 0 || data.sensitivity > 1) {
      errors.push('Invalid sensitivity: must be a number between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes text input to prevent XSS
 */
export function sanitizeText(value: string): string {
  return value
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Clamps a number to a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
