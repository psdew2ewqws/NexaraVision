import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface TestStep {
  step: number;
  name: string;
  success: boolean;
  url?: string;
  key?: string;
  data?: unknown;
  error?: string;
  errorCode?: string;
  errorHint?: string;
  errorDetails?: string;
  count?: number;
  locationId?: string;
  cameraId?: string;
  incidentId?: string;
  camera_id?: string;
  location_id?: string;
}

interface TestResults {
  timestamp: string;
  steps: TestStep[];
  overall?: boolean;
  error?: string;
  exception?: string;
}

export async function GET() {
  const results: TestResults = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 1: Check env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    results.steps.push({
      step: 1,
      name: 'Check env vars',
      url: url ? `${url.substring(0, 30)}...` : 'MISSING',
      key: key ? `${key.substring(0, 20)}...` : 'MISSING',
      success: !!(url && key),
    });

    if (!url || !key) {
      return NextResponse.json(results);
    }

    // Step 2: Create Supabase client
    const supabase = createClient(url, key);
    results.steps.push({
      step: 2,
      name: 'Create Supabase client',
      success: true,
    });

    // Step 3: Test connection - list locations
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('*')
      .limit(5);

    results.steps.push({
      step: 3,
      name: 'Query locations table',
      success: !locError,
      error: locError?.message,
      count: locations?.length || 0,
    });

    // Step 4: Test connection - list cameras
    const { data: cameras, error: camError } = await supabase
      .from('cameras')
      .select('*')
      .limit(5);

    results.steps.push({
      step: 4,
      name: 'Query cameras table',
      success: !camError,
      error: camError?.message,
      count: cameras?.length || 0,
    });

    // Step 5: Test connection - list incidents
    const { data: incidents, error: incError } = await supabase
      .from('incidents')
      .select('*')
      .limit(5);

    results.steps.push({
      step: 5,
      name: 'Query incidents table',
      success: !incError,
      error: incError?.message,
      count: incidents?.length || 0,
    });

    // Step 6: Create a test location if none exists
    let testLocationId = locations?.[0]?.id;
    if (!testLocationId) {
      const { data: newLoc, error: locInsertError } = await supabase
        .from('locations')
        .insert([{ name: 'Test Location', name_ar: 'موقع تجريبي', address: 'Test' }])
        .select()
        .single();

      results.steps.push({
        step: 6,
        name: 'Create test location',
        success: !locInsertError,
        error: locInsertError?.message,
        errorCode: locInsertError?.code,
        errorHint: locInsertError?.hint,
        locationId: newLoc?.id,
      });

      testLocationId = newLoc?.id;
    } else {
      results.steps.push({ step: 6, name: 'Location exists', success: true, locationId: testLocationId });
    }

    // Step 7: Create a test camera if none exists
    let testCameraId = cameras?.[0]?.id;
    if (!testCameraId && testLocationId) {
      const { data: newCam, error: camInsertError } = await supabase
        .from('cameras')
        .insert([{ name: 'Test Camera', name_ar: 'كاميرا تجريبية', status: 'online', grid_position: 0 }])
        .select()
        .single();

      results.steps.push({
        step: 7,
        name: 'Create test camera',
        success: !camInsertError,
        error: camInsertError?.message,
        errorCode: camInsertError?.code,
        errorHint: camInsertError?.hint,
        cameraId: newCam?.id,
      });

      testCameraId = newCam?.id;
    } else {
      results.steps.push({ step: 7, name: 'Camera exists', success: true, cameraId: testCameraId });
    }

    // Step 8: Test INSERT into incidents
    if (!testCameraId || !testLocationId) {
      results.steps.push({
        step: 8,
        name: 'Test INSERT incidents',
        success: false,
        error: 'No camera or location available for test',
        camera_id: testCameraId,
        location_id: testLocationId,
      });
    } else {
      const testIncident = {
        camera_id: testCameraId,
        location_id: testLocationId,
        confidence: 99,
        model_used: 'TEST - DELETE ME',
        status: 'detected',
        detected_at: new Date().toISOString(),
      };

      const { data: newIncident, error: insertError } = await supabase
        .from('incidents')
        .insert([testIncident])
        .select()
        .single();

      results.steps.push({
        step: 8,
        name: 'Test INSERT into incidents',
        success: !insertError,
        error: insertError?.message,
        errorCode: insertError?.code,
        errorDetails: insertError?.details,
        incidentId: newIncident?.id,
      });

      // Step 9: Delete test incident (keep camera and location for future use)
      if (newIncident?.id) {
        const { error: deleteError } = await supabase
          .from('incidents')
          .delete()
          .eq('id', newIncident.id);

        results.steps.push({
          step: 9,
          name: 'Delete test incident',
          success: !deleteError,
          error: deleteError?.message,
        });
      }
    }

    results.overall = results.steps.every((s) => s.success);

  } catch (err: unknown) {
    results.exception = err instanceof Error ? err.message : 'Unknown error';
    results.overall = false;
  }

  return NextResponse.json(results, { status: results.overall ? 200 : 500 });
}
