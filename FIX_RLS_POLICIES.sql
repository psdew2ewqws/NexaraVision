-- ============================================
-- NEXARAVISION RLS POLICY FIX
-- Run this in Supabase SQL Editor
-- ============================================

-- First, let's see what policies exist
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- ============================================
-- LOCATIONS TABLE
-- ============================================

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can select locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can delete locations" ON locations;
DROP POLICY IF EXISTS "Public read access to locations" ON locations;
DROP POLICY IF EXISTS "Enable read access for all users" ON locations;

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read locations
CREATE POLICY "Anyone can read locations" ON locations
  FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can insert locations" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update locations" ON locations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete locations" ON locations
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- CAMERAS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert cameras" ON cameras;
DROP POLICY IF EXISTS "Authenticated users can select cameras" ON cameras;
DROP POLICY IF EXISTS "Authenticated users can update cameras" ON cameras;
DROP POLICY IF EXISTS "Authenticated users can delete cameras" ON cameras;
DROP POLICY IF EXISTS "Public read access to cameras" ON cameras;
DROP POLICY IF EXISTS "Enable read access for all users" ON cameras;

ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cameras" ON cameras
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert cameras" ON cameras
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update cameras" ON cameras
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete cameras" ON cameras
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- INCIDENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can select incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can update incidents" ON incidents;
DROP POLICY IF EXISTS "Authenticated users can delete incidents" ON incidents;
DROP POLICY IF EXISTS "Public read access to incidents" ON incidents;
DROP POLICY IF EXISTS "Enable read access for all users" ON incidents;

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read incidents" ON incidents
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert incidents" ON incidents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update incidents" ON incidents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete incidents" ON incidents
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- PROFILES TABLE (already has user-specific policies)
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed for team display)
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- VERIFY POLICIES WERE CREATED
-- ============================================

SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
