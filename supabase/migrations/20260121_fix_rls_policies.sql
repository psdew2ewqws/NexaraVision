-- Migration: Fix RLS policies to allow authenticated users to create cameras/locations
-- The original schema only allowed admins to manage these tables, but the live page
-- needs to auto-register cameras for any authenticated user.

-- ============================================
-- FIX CAMERAS RLS
-- ============================================

-- Allow authenticated users to insert cameras (for auto-registration from live page)
DROP POLICY IF EXISTS "Authenticated users can insert cameras" ON cameras;
CREATE POLICY "Authenticated users can insert cameras" ON cameras
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update cameras they created or that have no creator
DROP POLICY IF EXISTS "Authenticated users can update cameras" ON cameras;
CREATE POLICY "Authenticated users can update cameras" ON cameras
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================
-- FIX LOCATIONS RLS
-- ============================================

-- Allow authenticated users to insert locations (for creating default location)
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
CREATE POLICY "Authenticated users can insert locations" ON locations
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- FIX INCIDENTS RLS (ensure insert works)
-- ============================================

-- Drop the old insert policy and create a proper one
DROP POLICY IF EXISTS "System can insert incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON incidents;
CREATE POLICY "Authenticated users can insert incidents" ON incidents
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- CREATE STORAGE BUCKET FOR RECORDINGS
-- ============================================

-- Note: Run this in Supabase Dashboard -> Storage -> Create bucket
-- Bucket name: recordings
-- Public: true (for video playback)

-- Or use SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policies for recordings bucket:
-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
-- CREATE POLICY "Allow authenticated uploads" ON storage.objects
--     FOR INSERT
--     WITH CHECK (bucket_id = 'recordings' AND auth.role() = 'authenticated');
--
-- DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
-- CREATE POLICY "Allow public reads" ON storage.objects
--     FOR SELECT
--     USING (bucket_id = 'recordings');
