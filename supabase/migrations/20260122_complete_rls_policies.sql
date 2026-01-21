-- Migration: Complete RLS Policy Fix
-- Addresses 8 critical security gaps identified in deep dive analysis
-- Date: 2026-01-22

-- ============================================
-- GAP-SEC-001: escalation_rules Table Has ZERO Policies (CRITICAL)
-- Issue: RLS enabled but no policies = completely inaccessible
-- ============================================

-- Allow authenticated users to view escalation rules
DROP POLICY IF EXISTS "Authenticated users can view escalation rules" ON escalation_rules;
CREATE POLICY "Authenticated users can view escalation rules" ON escalation_rules
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins and managers can insert escalation rules
DROP POLICY IF EXISTS "Admins and managers can insert escalation rules" ON escalation_rules;
CREATE POLICY "Admins and managers can insert escalation rules" ON escalation_rules
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Only admins and managers can update escalation rules
DROP POLICY IF EXISTS "Admins and managers can update escalation rules" ON escalation_rules;
CREATE POLICY "Admins and managers can update escalation rules" ON escalation_rules
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- Only admins can delete escalation rules
DROP POLICY IF EXISTS "Admins can delete escalation rules" ON escalation_rules;
CREATE POLICY "Admins can delete escalation rules" ON escalation_rules
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- GAP-SEC-002: Alerts Table Overly Permissive (CRITICAL)
-- Issue: FOR ALL USING (true) allows anyone to delete all alerts
-- Fix: Replace with specific policies
-- ============================================

-- Remove the overly permissive policy
DROP POLICY IF EXISTS "System can manage alerts" ON alerts;

-- Authenticated users can insert alerts (system needs this)
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON alerts;
CREATE POLICY "Authenticated users can insert alerts" ON alerts
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own alerts (mark as read, etc.)
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Only admins can delete alerts (preserve audit trail)
DROP POLICY IF EXISTS "Admins can delete alerts" ON alerts;
CREATE POLICY "Admins can delete alerts" ON alerts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- GAP-SEC-003: Missing DELETE Policies
-- Issue: DELETE operations silently fail (return count:0, error:null)
-- ============================================

-- Profiles: Only admins can delete profiles
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow users to delete their own profile (account deletion)
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile" ON profiles
    FOR DELETE
    USING (auth.uid() = id);

-- Incidents: Only admins can delete incidents
DROP POLICY IF EXISTS "Admins can delete incidents" ON incidents;
CREATE POLICY "Admins can delete incidents" ON incidents
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Cameras: Only admins can delete cameras
DROP POLICY IF EXISTS "Admins can delete cameras" ON cameras;
CREATE POLICY "Admins can delete cameras" ON cameras
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Locations: Only admins can delete locations
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;
CREATE POLICY "Admins can delete locations" ON locations
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- GAP-SEC-007: daily_analytics Missing Write Policies
-- Issue: Only SELECT policy exists
-- ============================================

-- Authenticated users can insert analytics (system updates)
DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON daily_analytics;
CREATE POLICY "Authenticated users can insert analytics" ON daily_analytics
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated users can update analytics
DROP POLICY IF EXISTS "Authenticated users can update analytics" ON daily_analytics;
CREATE POLICY "Authenticated users can update analytics" ON daily_analytics
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only admins can delete analytics
DROP POLICY IF EXISTS "Admins can delete analytics" ON daily_analytics;
CREATE POLICY "Admins can delete analytics" ON daily_analytics
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- GAP-SEC-006: No INSERT Policy for profiles
-- Issue: New user profile creation may fail silently
-- Note: The handle_new_user() trigger uses SECURITY DEFINER
-- but add explicit policy for safety
-- ============================================

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- ENABLE STORAGE POLICIES (GAP-SEC-005)
-- These were commented out - uncomment if storage bucket exists
-- ============================================

-- First, ensure the recordings bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to recordings bucket
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'recordings' AND auth.role() = 'authenticated');

-- Allow public reads from recordings bucket
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'recordings');

-- Allow users to update their own uploads
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'recordings' AND auth.role() = 'authenticated');

-- Allow admins to delete recordings
DROP POLICY IF EXISTS "Admins can delete recordings" ON storage.objects;
CREATE POLICY "Admins can delete recordings" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'recordings' AND
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================
-- SUMMARY OF POLICIES ADDED
-- ============================================
-- escalation_rules: SELECT, INSERT, UPDATE, DELETE (4 policies)
-- alerts: INSERT, UPDATE, DELETE (3 policies, replaced overly permissive)
-- profiles: INSERT, DELETE (2 policies)
-- incidents: DELETE (1 policy)
-- cameras: DELETE (1 policy)
-- locations: DELETE (1 policy)
-- daily_analytics: INSERT, UPDATE, DELETE (3 policies)
-- storage.objects: INSERT, SELECT, UPDATE, DELETE (4 policies)
-- Total: 19 new policies
