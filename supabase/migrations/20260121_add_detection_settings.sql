-- Migration: Add detection_settings table for per-user violence detection thresholds
-- Run this in Supabase SQL Editor if you already have the base schema

-- Create the detection_settings table
CREATE TABLE IF NOT EXISTS detection_settings (
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

-- Enable RLS
ALTER TABLE detection_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own settings
CREATE POLICY "Users can view own detection settings"
    ON detection_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own detection settings"
    ON detection_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own detection settings"
    ON detection_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own detection settings"
    ON detection_settings FOR DELETE
    USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER detection_settings_updated_at
    BEFORE UPDATE ON detection_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON detection_settings TO authenticated;
GRANT ALL ON detection_settings TO service_role;
