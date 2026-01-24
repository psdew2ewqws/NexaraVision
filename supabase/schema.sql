-- NexaraVision Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'guard');
CREATE TYPE incident_status AS ENUM ('detected', 'acknowledged', 'responding', 'resolved', 'false_positive');
CREATE TYPE alert_channel AS ENUM ('whatsapp', 'telegram', 'discord', 'email', 'push');
CREATE TYPE camera_status AS ENUM ('online', 'offline', 'maintenance');

-- ============================================
-- USERS & PROFILES
-- ============================================

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    full_name_ar TEXT,  -- Arabic name
    role user_role DEFAULT 'guard',
    phone TEXT,  -- For WhatsApp alerts
    telegram_id TEXT,  -- For Telegram alerts
    language TEXT DEFAULT 'en',  -- 'en' or 'ar'
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT false,  -- Whether user completed initial setup wizard
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOCATIONS (Multi-location support)
-- ============================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_ar TEXT,  -- Arabic name
    address TEXT,
    address_ar TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAMERAS
-- ============================================

CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_ar TEXT,
    stream_url TEXT,
    grid_position INT,  -- Position in multi-camera grid (1-16)
    status camera_status DEFAULT 'online',
    sensitivity DECIMAL(3,2) DEFAULT 0.90,  -- Violence detection threshold
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INCIDENTS (Violence detections)
-- ============================================

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

    -- Detection details
    confidence DECIMAL(5,2) NOT NULL,  -- e.g., 95.20
    violence_score DECIMAL(5,2),
    model_used TEXT,  -- 'msg3d_trained', 'smart_veto', etc.
    decision_source TEXT,  -- 'PRIMARY', 'VETO_OVERRIDE', etc.

    -- Status tracking
    status incident_status DEFAULT 'detected',
    acknowledged_by UUID REFERENCES profiles(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Recording
    video_url TEXT,  -- URL to recorded clip in Supabase Storage
    thumbnail_url TEXT,
    recording_start TIMESTAMPTZ,
    recording_end TIMESTAMPTZ,

    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERTS (Notifications sent)
-- ============================================

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    channel alert_channel NOT NULL,

    -- Delivery status
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,

    -- Message content
    message_preview TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ALERT SETTINGS (Per-user notification preferences)
-- ============================================

CREATE TABLE alert_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Channel settings
    whatsapp_enabled BOOLEAN DEFAULT true,
    whatsapp_number TEXT,
    telegram_enabled BOOLEAN DEFAULT false,
    telegram_chat_id TEXT,
    discord_enabled BOOLEAN DEFAULT false,
    discord_webhook_url TEXT,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,

    -- Notification preferences
    min_confidence INT DEFAULT 85,  -- Only alert if confidence >= this
    quiet_hours_start TIME,  -- Don't alert during quiet hours
    quiet_hours_end TIME,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================
-- DETECTION SETTINGS (Per-user violence detection thresholds)
-- ============================================

CREATE TABLE detection_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

    -- Smart Veto thresholds
    primary_threshold INT DEFAULT 50,      -- Violence detection cutoff (%)
    veto_threshold INT DEFAULT 4,          -- VETO override threshold (%)

    -- Fight alert triggers
    instant_trigger_threshold INT DEFAULT 95,  -- Instant alert threshold (%)
    instant_trigger_count INT DEFAULT 3,       -- Frames needed at instant threshold
    sustained_threshold INT DEFAULT 70,        -- Sustained violence threshold (%)
    sustained_duration INT DEFAULT 2,          -- Sustained duration in seconds

    -- Preferences
    sound_enabled BOOLEAN DEFAULT true,
    auto_record BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================
-- ESCALATION RULES
-- ============================================

CREATE TABLE escalation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,

    -- Rule settings
    escalate_after_minutes INT DEFAULT 5,  -- Escalate if not acknowledged
    escalate_to_role user_role DEFAULT 'manager',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS (Daily aggregates for dashboard)
-- ============================================

CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,

    -- Counts
    total_incidents INT DEFAULT 0,
    resolved_incidents INT DEFAULT 0,
    false_positives INT DEFAULT 0,
    avg_response_time_seconds INT,

    -- Peak hours (JSON array of {hour, count})
    hourly_breakdown JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(date, location_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Locations: All authenticated users can read
CREATE POLICY "Authenticated users can view locations" ON locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage locations" ON locations FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Cameras: All authenticated users can read
CREATE POLICY "Authenticated users can view cameras" ON cameras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage cameras" ON cameras FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Incidents: All authenticated users can read and update
CREATE POLICY "Authenticated users can view incidents" ON incidents FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update incidents" ON incidents FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "System can insert incidents" ON incidents FOR INSERT WITH CHECK (true);

-- Alerts: Users can view own alerts
CREATE POLICY "Users can view own alerts" ON alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage alerts" ON alerts FOR ALL USING (true);

-- Alert Settings: Users can manage own settings
CREATE POLICY "Users can manage own alert settings" ON alert_settings FOR ALL USING (auth.uid() = user_id);

-- Detection Settings: Users can manage own settings
CREATE POLICY "Users can view own detection settings" ON detection_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own detection settings" ON detection_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own detection settings" ON detection_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own detection settings" ON detection_settings FOR DELETE USING (auth.uid() = user_id);

-- Analytics: All authenticated users can read
CREATE POLICY "Authenticated users can view analytics" ON daily_analytics FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cameras_updated_at BEFORE UPDATE ON cameras FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER alert_settings_updated_at BEFORE UPDATE ON alert_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER detection_settings_updated_at BEFORE UPDATE ON detection_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for incidents (live alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_incidents_camera ON incidents(camera_id);
CREATE INDEX idx_incidents_location ON incidents(location_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_detected_at ON incidents(detected_at DESC);
CREATE INDEX idx_alerts_incident ON alerts(incident_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_cameras_location ON cameras(location_id);
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);

-- ============================================
-- SAMPLE DATA (Optional - Remove in production)
-- ============================================

-- Insert a default location
INSERT INTO locations (name, name_ar, address, address_ar) VALUES
('Main Building', 'المبنى الرئيسي', '123 Main Street', 'شارع الرئيسي 123');

-- Insert sample cameras
INSERT INTO cameras (location_id, name, name_ar, grid_position) VALUES
((SELECT id FROM locations LIMIT 1), 'Entrance Camera', 'كاميرا المدخل', 1),
((SELECT id FROM locations LIMIT 1), 'Parking Lot', 'موقف السيارات', 2),
((SELECT id FROM locations LIMIT 1), 'Lobby', 'الردهة', 3),
((SELECT id FROM locations LIMIT 1), 'Hallway A', 'الممر أ', 4);
