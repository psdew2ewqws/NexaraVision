// NexaraVision Database Types
// Generated from supabase/schema.sql

export type UserRole = 'admin' | 'manager' | 'guard';
export type IncidentStatus = 'detected' | 'acknowledged' | 'responding' | 'resolved' | 'false_positive';
export type AlertChannel = 'whatsapp' | 'telegram' | 'discord' | 'email' | 'push';
export type CameraStatus = 'online' | 'offline' | 'maintenance';
export type Language = 'en' | 'ar';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  full_name_ar: string | null;
  role: UserRole;
  phone: string | null;
  telegram_id: string | null;
  language: Language;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  name_ar: string | null;
  address: string | null;
  address_ar: string | null;
  created_at: string;
  updated_at: string;
}

export interface Camera {
  id: string;
  location_id: string | null;
  name: string;
  name_ar: string | null;
  stream_url: string | null;
  grid_position: number | null;
  status: CameraStatus;
  sensitivity: number;
  created_at: string;
  updated_at: string;
  // Joined
  location?: Location;
}

export interface Incident {
  id: string;
  camera_id: string | null;
  location_id: string | null;
  confidence: number;
  violence_score: number | null;
  model_used: string | null;
  decision_source: string | null;
  status: IncidentStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  recording_start: string | null;
  recording_end: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  camera?: Camera;
  location?: Location;
  acknowledged_by_profile?: Profile;
  resolved_by_profile?: Profile;
}

export interface Alert {
  id: string;
  incident_id: string;
  user_id: string;
  channel: AlertChannel;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_message: string | null;
  message_preview: string | null;
  created_at: string;
  // Joined
  incident?: Incident;
  user?: Profile;
}

export interface AlertSettings {
  id: string;
  user_id: string;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  discord_enabled: boolean;
  discord_webhook_url: string | null;
  email_enabled: boolean;
  push_enabled: boolean;
  min_confidence: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  alert_cooldown_seconds: number;
  last_alert_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AlertCooldownOption = 30 | 60 | 300 | 600;

export interface EscalationRule {
  id: string;
  location_id: string;
  escalate_after_minutes: number;
  escalate_to_role: UserRole;
  created_at: string;
  updated_at: string;
  // Joined
  location?: Location;
}

export interface DailyAnalytics {
  id: string;
  date: string;
  location_id: string | null;
  total_incidents: number;
  resolved_incidents: number;
  false_positives: number;
  avg_response_time_seconds: number | null;
  hourly_breakdown: { hour: number; count: number }[] | null;
  created_at: string;
  // Joined
  location?: Location;
}

// Database type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      locations: {
        Row: Location;
        Insert: Partial<Location> & { name: string };
        Update: Partial<Location>;
      };
      cameras: {
        Row: Camera;
        Insert: Partial<Camera> & { name: string };
        Update: Partial<Camera>;
      };
      incidents: {
        Row: Incident;
        Insert: Partial<Incident> & { confidence: number };
        Update: Partial<Incident>;
      };
      alerts: {
        Row: Alert;
        Insert: Partial<Alert> & { incident_id: string; user_id: string; channel: AlertChannel };
        Update: Partial<Alert>;
      };
      alert_settings: {
        Row: AlertSettings;
        Insert: Partial<AlertSettings> & { user_id: string };
        Update: Partial<AlertSettings>;
      };
      escalation_rules: {
        Row: EscalationRule;
        Insert: Partial<EscalationRule> & { location_id: string };
        Update: Partial<EscalationRule>;
      };
      daily_analytics: {
        Row: DailyAnalytics;
        Insert: Partial<DailyAnalytics> & { date: string };
        Update: Partial<DailyAnalytics>;
      };
    };
    Enums: {
      user_role: UserRole;
      incident_status: IncidentStatus;
      alert_channel: AlertChannel;
      camera_status: CameraStatus;
    };
  };
}
