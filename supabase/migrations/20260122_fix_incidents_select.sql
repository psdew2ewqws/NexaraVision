-- Migration: Fix incidents SELECT policy
-- Date: 2026-01-22
-- Issue: 406 error on incidents SELECT query blocking throttling/grouping

-- ============================================
-- CRITICAL: Add SELECT policy for incidents
-- Without this, getActiveIncidentForCamera() fails with 406
-- This breaks incident grouping/throttling
-- ============================================

-- Drop any existing SELECT policy (idempotent)
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can select incidents" ON incidents;
DROP POLICY IF EXISTS "Users can view incidents" ON incidents;

-- Create SELECT policy for authenticated users
-- This allows the throttling check to query recent incidents
CREATE POLICY "Authenticated users can view incidents" ON incidents
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Verify RLS is enabled (should already be)
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Grant usage to authenticated role (belt and suspenders)
GRANT SELECT ON incidents TO authenticated;
GRANT SELECT ON incidents TO anon;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Also fix detection_settings SELECT policy
-- ============================================

DROP POLICY IF EXISTS "Users can view own detection settings" ON detection_settings;
DROP POLICY IF EXISTS "Users can view detection settings" ON detection_settings;

CREATE POLICY "Users can view own detection settings" ON detection_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Verify RLS is enabled
ALTER TABLE detection_settings ENABLE ROW LEVEL SECURITY;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON detection_settings TO authenticated;

-- Force reload again
NOTIFY pgrst, 'reload schema';

-- ============================================
-- VERIFICATION QUERIES (run in Supabase SQL Editor)
-- ============================================
--
-- Check incidents policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'incidents';
--
-- Check detection_settings policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'detection_settings';
--
-- Test incident select (should return data, not 406):
-- SELECT id, camera_id, confidence, detected_at
-- FROM incidents
-- ORDER BY detected_at DESC
-- LIMIT 5;
