# Incident Creation Fix Report

## Ralph Loop Analysis - Iteration 1

### Root Cause Identified

**Error:** `new row violates row-level security policy for table "locations"`

The Supabase RLS (Row Level Security) policies are **blocking INSERT operations** for authenticated users on:
- `locations` table
- `cameras` table
- `incidents` table

### Why This Happens

1. User logs in → Gets authenticated session
2. Detection starts → Tries to create location/camera
3. **INSERT blocked by RLS** → Returns silently in browser
4. `activeCamera` and `defaultLocation` remain `null` in refs
5. Violence detected → `triggerFightAlert` called
6. Condition `camera?.id && location?.id` is `false`
7. Incident NOT created

### The Fix

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- LOCATIONS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
CREATE POLICY "Anyone can read locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert locations" ON locations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update locations" ON locations FOR UPDATE USING (auth.role() = 'authenticated');

-- CAMERAS
ALTER TABLE cameras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert cameras" ON cameras;
CREATE POLICY "Anyone can read cameras" ON cameras FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cameras" ON cameras FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update cameras" ON cameras FOR UPDATE USING (auth.role() = 'authenticated');

-- INCIDENTS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON incidents;
CREATE POLICY "Anyone can read incidents" ON incidents FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert incidents" ON incidents FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update incidents" ON incidents FOR UPDATE USING (auth.role() = 'authenticated');
```

### Files Modified

| File | Change |
|------|--------|
| `src/app/live/page.tsx` | Fixed stale closure bug - using refs instead of state |
| `src/hooks/useSupabase.ts` | Simplified createIncidentWithRecording, added logging |
| `src/app/api/test-db/route.ts` | Created diagnostic endpoint |
| `src/app/debug/page.tsx` | Created browser debug page |
| `FIX_RLS_POLICIES.sql` | Complete RLS policy fix |

### Test Verification

1. **API Test:** `curl http://localhost:3000/api/test-db`
   - Should show all steps passing

2. **Browser Test:** Go to `http://localhost:3000/debug`
   - Login if needed
   - Click "Run Database Tests"
   - All tests should pass

3. **Live Test:** Go to `http://localhost:3000/live`
   - Start detection
   - Play violence video
   - Console should show: `[Incident] Created successfully: <id>`
   - Dashboard/Alerts should show incidents

### Database State After Fix

| Table | Expected Count |
|-------|----------------|
| locations | 1+ (Default Location) |
| cameras | 1+ (Screen Share/Webcam) |
| incidents | Created on violence detection |

### Status: PENDING USER ACTION

**User must run SQL in Supabase to fix RLS policies.**
