-- Migration: Ensure Realtime is enabled for incidents table
-- This is CRITICAL for global notifications to work
-- Date: 2026-01-22

-- ============================================
-- ENABLE REALTIME FOR INCIDENTS TABLE
-- ============================================

-- First, check if the table is already in the publication and handle gracefully
DO $$
BEGIN
    -- Try to add incidents to realtime publication
    -- This will fail silently if already added
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
        RAISE NOTICE 'Added incidents to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'incidents already in supabase_realtime publication';
    END;

    -- Also add alerts table for future notification features
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
        RAISE NOTICE 'Added alerts to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'alerts already in supabase_realtime publication';
    END;

    -- Add cameras table for status updates
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE cameras;
        RAISE NOTICE 'Added cameras to supabase_realtime publication';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE 'cameras already in supabase_realtime publication';
    END;
END $$;

-- ============================================
-- VERIFY REALTIME IS ENABLED
-- ============================================

-- This query can be used to verify which tables have realtime enabled
-- Run this in the SQL editor to check:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================
-- IMPORTANT: SUPABASE DASHBOARD SETTINGS
-- ============================================
-- In addition to this SQL, ensure the following in Supabase Dashboard:
-- 1. Go to Database -> Replication
-- 2. Under "supabase_realtime" publication, verify "incidents" is listed
-- 3. If not visible, toggle the table on
--
-- Also verify in Project Settings -> API:
-- 1. Realtime should be enabled
-- 2. Check the JWT expiry time is reasonable

-- ============================================
-- GRANT SELECT FOR REALTIME
-- ============================================
-- Realtime requires SELECT permission on the tables

GRANT SELECT ON incidents TO authenticated;
GRANT SELECT ON alerts TO authenticated;
GRANT SELECT ON cameras TO authenticated;

-- ============================================
-- TRIGGER FOR MANUAL NOTIFICATION (BACKUP)
-- ============================================
-- This trigger can be used if realtime fails
-- It inserts a record into a notifications table that can be polled

-- Create a notifications table for backup alerting
CREATE TABLE IF NOT EXISTS realtime_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    event_type TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    record_id UUID,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE realtime_notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read notifications
CREATE POLICY IF NOT EXISTS "Authenticated users can view notifications" ON realtime_notifications
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Create trigger function
CREATE OR REPLACE FUNCTION notify_incident_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into backup notifications table
    INSERT INTO realtime_notifications (table_name, event_type, record_id, payload)
    VALUES ('incidents', 'INSERT', NEW.id, row_to_json(NEW)::jsonb);

    -- Also send a NOTIFY for pg_notify based alerting
    PERFORM pg_notify('incident_created', json_build_object(
        'id', NEW.id,
        'camera_id', NEW.camera_id,
        'location_id', NEW.location_id,
        'confidence', NEW.confidence,
        'detected_at', NEW.detected_at
    )::text);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_incident_insert ON incidents;
CREATE TRIGGER on_incident_insert
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION notify_incident_insert();

-- ============================================
-- CLEANUP OLD NOTIFICATIONS (Cron job)
-- ============================================
-- Run this periodically to clean up old notifications:
-- DELETE FROM realtime_notifications WHERE created_at < NOW() - INTERVAL '24 hours';
