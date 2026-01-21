-- ============================================
-- CLEANUP TEST DATA
-- Run this in Supabase SQL Editor to remove test data
-- ============================================

-- First, delete all incidents (they reference cameras)
DELETE FROM incidents;

-- Then delete all cameras
DELETE FROM cameras;

-- Keep only the Default Location, delete others
DELETE FROM locations WHERE name != 'Default Location';

-- Verify cleanup
SELECT 'incidents' as table_name, COUNT(*) as count FROM incidents
UNION ALL
SELECT 'cameras' as table_name, COUNT(*) as count FROM cameras
UNION ALL
SELECT 'locations' as table_name, COUNT(*) as count FROM locations;
