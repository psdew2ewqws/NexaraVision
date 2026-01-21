/**
 * Detection Constants
 * Addresses GAP-CQ-003: Magic Numbers
 *
 * Centralized configuration for violence detection thresholds and timing
 */

export const DETECTION = {
  // Incident creation throttle - minimum time between NEW incidents for same camera
  INCIDENT_THROTTLE_MS: 30000, // 30 seconds - prevents spam

  // Incident grouping - detections within this window update the same incident
  INCIDENT_GROUP_WINDOW_MS: 60000, // 60 seconds - group related detections

  // Maximum screenshots per incident
  MAX_SCREENSHOTS_PER_INCIDENT: 10,

  // Screenshot capture interval during active incident
  SCREENSHOT_INTERVAL_MS: 5000, // Capture every 5 seconds during incident

  // Recording settings
  RECORDING_DURATION_SECONDS: 60,
  RECORDING_PRE_BUFFER_SECONDS: 5,
  RECORDING_POST_BUFFER_SECONDS: 10,

  // Alert display settings
  MAX_VISIBLE_ALERTS: 5,
  ALERT_AUTO_DISMISS_MS: 30000, // 30 seconds

  // Violence detection thresholds (defaults)
  DEFAULT_PRIMARY_THRESHOLD: 50,      // Violence detection cutoff (%)
  DEFAULT_VETO_THRESHOLD: 4,          // VETO override threshold (%)
  DEFAULT_INSTANT_TRIGGER: 95,        // Instant alert threshold (%)
  DEFAULT_INSTANT_TRIGGER_COUNT: 3,   // Frames needed at instant threshold
  DEFAULT_SUSTAINED_THRESHOLD: 70,    // Sustained violence threshold (%)
  DEFAULT_SUSTAINED_DURATION_SEC: 2,  // Sustained duration in seconds

  // Model confidence ranges
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
  LOW_CONFIDENCE_THRESHOLD: 50,
  HIGH_CONFIDENCE_THRESHOLD: 85,
  VERY_HIGH_CONFIDENCE_THRESHOLD: 95,

  // Frame processing
  FRAME_PROCESSING_INTERVAL_MS: 100,  // Process frames every 100ms
  FRAME_SKIP_COUNT: 3,                // Skip frames for performance
  MAX_FRAME_QUEUE_SIZE: 10,

  // WebSocket reconnection
  WS_RECONNECT_INITIAL_DELAY_MS: 1000,
  WS_RECONNECT_MAX_DELAY_MS: 30000,
  WS_RECONNECT_MAX_ATTEMPTS: 10,

  // UI refresh rates
  DASHBOARD_REFRESH_INTERVAL_MS: 30000, // 30 seconds
  CAMERA_STATUS_CHECK_INTERVAL_MS: 5000, // 5 seconds
} as const;

/**
 * Status configurations
 */
export const INCIDENT_STATUS = {
  DETECTED: 'detected',
  ACKNOWLEDGED: 'acknowledged',
  RESPONDING: 'responding',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive',
} as const;

export const CAMERA_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
} as const;

/**
 * Alert channel types
 */
export const ALERT_CHANNELS = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  EMAIL: 'email',
  PUSH: 'push',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  GUARD: 'guard',
} as const;

/**
 * Type exports for use in components
 */
export type IncidentStatus = typeof INCIDENT_STATUS[keyof typeof INCIDENT_STATUS];
export type CameraStatus = typeof CAMERA_STATUS[keyof typeof CAMERA_STATUS];
export type AlertChannel = typeof ALERT_CHANNELS[keyof typeof ALERT_CHANNELS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
