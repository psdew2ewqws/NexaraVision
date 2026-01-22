'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import { getOrCreateDefaultLocation, findOrCreateCamera, createIncidentWithRecording } from '@/hooks/useSupabase';

// RLS Fix SQL - run in Supabase Dashboard → SQL Editor
const RLS_FIX_SQL = `-- Fix RLS policies for NexaraVision
-- Run this in Supabase Dashboard → SQL Editor

-- CAMERAS: Allow authenticated users to insert/update
DROP POLICY IF EXISTS "Authenticated users can insert cameras" ON cameras;
CREATE POLICY "Authenticated users can insert cameras" ON cameras
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update cameras" ON cameras;
CREATE POLICY "Authenticated users can update cameras" ON cameras
    FOR UPDATE USING (auth.role() = 'authenticated');

-- LOCATIONS: Allow authenticated users to insert
DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
CREATE POLICY "Authenticated users can insert locations" ON locations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- INCIDENTS: Allow authenticated users to insert
DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON incidents;
CREATE POLICY "Authenticated users can insert incidents" ON incidents
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- STORAGE: Create recordings bucket and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'recordings' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
CREATE POLICY "Allow public reads" ON storage.objects
    FOR SELECT USING (bucket_id = 'recordings');

-- Done! Now test: curl http://localhost:3000/api/test-db`;

// Type for debug test results
interface DebugResult {
  step: string;
  success: boolean;
  data?: Record<string, unknown>;
  time: string;
}

export default function DebugPage() {
  const { user, session, profile, loading: authLoading } = useAuth();
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const addResult = (step: string, success: boolean, data?: Record<string, unknown>) => {
    setResults(prev => [...prev, { step, success, data, time: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setResults([]);
    setTesting(true);

    const supabase = getSupabase();

    // Test 1: Auth status
    addResult('Auth Check', !!user, {
      userId: user?.id,
      email: user?.email,
      role: session?.user?.role,
      hasSession: !!session,
    });

    // Test 2: Check session token
    const { data: sessionData } = await supabase.auth.getSession();
    addResult('Session Token', !!sessionData?.session, {
      hasAccessToken: !!sessionData?.session?.access_token,
      expiresAt: sessionData?.session?.expires_at,
    });

    // Test 3: Query locations
    const { data: locations, error: locErr } = await supabase
      .from('locations')
      .select('*')
      .limit(5);
    addResult('Query Locations', !locErr, { count: locations?.length, error: locErr?.message });

    // Test 4: Query cameras
    const { data: cameras, error: camErr } = await supabase
      .from('cameras')
      .select('*')
      .limit(5);
    addResult('Query Cameras', !camErr, { count: cameras?.length, error: camErr?.message });

    // Test 5: Query incidents
    const { data: incidents, error: incErr } = await supabase
      .from('incidents')
      .select('*')
      .limit(5);
    addResult('Query Incidents', !incErr, { count: incidents?.length, error: incErr?.message });

    // Test 6: Create location using helper
    const { location, error: createLocErr } = await getOrCreateDefaultLocation();
    addResult('Create Location', !!location, {
      locationId: location?.id,
      error: createLocErr?.message,
    });

    // Test 7: Create camera using helper
    if (location) {
      const { camera, error: createCamErr } = await findOrCreateCamera('webcam');
      addResult('Create Camera', !!camera, {
        cameraId: camera?.id,
        error: createCamErr?.message,
      });

      // Test 8: Create incident
      if (camera) {
        const { incident, error: createIncErr } = await createIncidentWithRecording({
          camera_id: camera.id,
          location_id: location.id,
          confidence: 95,
          model_used: 'DEBUG TEST',
        });
        addResult('Create Incident', !!incident, {
          incidentId: incident?.id,
          error: (createIncErr as Error | { message: string } | null)?.message,
        });

        // Test 9: Verify incident was created
        if (incident) {
          const { data: verifyInc, error: verifyErr } = await supabase
            .from('incidents')
            .select('*')
            .eq('id', incident.id)
            .single();
          addResult('Verify Incident', !!verifyInc, {
            found: !!verifyInc,
            error: verifyErr?.message,
          });
        }
      }
    }

    setTesting(false);
  };

  const cleanupTestData = async () => {
    setCleaning(true);
    setResults([]);
    const supabase = getSupabase();

    // Delete incidents first (foreign key)
    const { error: incErr } = await supabase
      .from('incidents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    addResult('Delete Incidents', !incErr, { error: incErr?.message });

    // Delete cameras
    const { error: camErr } = await supabase
      .from('cameras')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    addResult('Delete Cameras', !camErr, { error: camErr?.message });

    // Delete locations except Default
    const { error: locErr } = await supabase
      .from('locations')
      .delete()
      .neq('name', 'Default Location');
    addResult('Delete Extra Locations', !locErr, { error: locErr?.message });

    // Verify cleanup
    const { data: remaining } = await supabase.from('cameras').select('*');
    const { data: incRemaining } = await supabase.from('incidents').select('*');
    addResult('Verify Cleanup', true, {
      camerasRemaining: remaining?.length || 0,
      incidentsRemaining: incRemaining?.length || 0
    });

    setCleaning(false);
  };

  if (authLoading) {
    return <div className="p-8 text-white">Loading auth...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-4">Database Debug</h1>

        {/* Auth Status */}
        <div className="bg-slate-900 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium text-white mb-2">Authentication Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">User:</span>{' '}
              <span className={user ? 'text-green-400' : 'text-red-400'}>
                {user ? user.email : 'NOT LOGGED IN'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Session:</span>{' '}
              <span className={session ? 'text-green-400' : 'text-red-400'}>
                {session ? 'Active' : 'None'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Profile:</span>{' '}
              <span className={profile ? 'text-green-400' : 'text-yellow-400'}>
                {profile ? `${profile.full_name} (${profile.role})` : 'Not loaded'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">User ID:</span>{' '}
              <span className="text-slate-300 font-mono text-xs">
                {user?.id || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={runTests}
            disabled={testing || cleaning || !user}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-lg font-medium"
          >
            {testing ? 'Running Tests...' : !user ? 'Login Required' : 'Run Database Tests'}
          </button>

          <button
            onClick={cleanupTestData}
            disabled={testing || cleaning || !user}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white rounded-lg font-medium"
          >
            {cleaning ? 'Cleaning Up...' : 'Clean Up Test Data'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-slate-900 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-medium text-white">Test Results</h2>
            </div>
            <div className="divide-y divide-slate-800">
              {results.map((r, i) => (
                <div key={i} className="p-4 flex items-start gap-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${r.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {r.success ? '✓' : '✗'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{r.step}</p>
                    <pre className="text-xs text-slate-400 mt-1 overflow-x-auto">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RLS Fix SQL */}
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-400 font-medium">⚠️ RLS Policy Fix Required</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(RLS_FIX_SQL);
                alert('SQL copied to clipboard! Paste it in Supabase Dashboard → SQL Editor');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg"
            >
              📋 Copy SQL to Clipboard
            </button>
          </div>
          <p className="text-sm text-slate-300 mb-3">
            If &quot;Create Location&quot; or &quot;Create Incident&quot; fails, run this SQL in{' '}
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-blue-400 underline">
              Supabase Dashboard
            </a>{' '}
            → SQL Editor:
          </p>
          <pre className="bg-slate-950 p-3 rounded text-xs text-green-400 overflow-x-auto max-h-48 overflow-y-auto">
            {RLS_FIX_SQL}
          </pre>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <h3 className="text-yellow-400 font-medium mb-2">Steps to Fix:</h3>
          <ol className="text-sm text-slate-300 space-y-2 list-decimal list-inside">
            <li>Click &quot;Copy SQL to Clipboard&quot; above</li>
            <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-blue-400 underline">Supabase Dashboard</a> → SQL Editor</li>
            <li>Paste the SQL and click &quot;Run&quot;</li>
            <li>Come back here and click &quot;Run Database Tests&quot; - all should pass</li>
            <li>Then go to Live Detection - incidents will now save correctly!</li>
          </ol>
        </div>

        {/* Camera Status Explanation */}
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">What is Camera Status 6/6?</h3>
          <p className="text-sm text-slate-300">
            This shows database records, NOT physical cameras. Each time you start detection,
            a camera record is created. These are test records from debugging sessions.
            Use &quot;Clean Up Test Data&quot; to remove them (requires RLS policies to be configured).
          </p>
        </div>
      </div>
    </div>
  );
}
