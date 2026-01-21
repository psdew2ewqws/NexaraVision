import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface CleanupAction {
  action: string;
  count?: number;
  error?: string;
  cameras?: { id: string; name: string; status: string }[];
  locations?: { id: string; name: string }[];
  incidents?: { id: string; confidence: number; model: string }[];
}

interface CleanupResults {
  timestamp: string;
  actions: CleanupAction[];
  deleted?: { table: string; success: boolean; error?: string }[];
  error?: string;
}

export async function GET() {
  const results: CleanupResults = {
    timestamp: new Date().toISOString(),
    actions: [],
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    // Get all cameras
    const { data: cameras, error: camErr } = await supabase
      .from('cameras')
      .select('*');

    results.actions.push({
      action: 'List cameras',
      count: cameras?.length || 0,
      cameras: cameras?.map(c => ({ id: c.id, name: c.name, status: c.status })),
      error: camErr?.message,
    });

    // Get all locations
    const { data: locations, error: locErr } = await supabase
      .from('locations')
      .select('*');

    results.actions.push({
      action: 'List locations',
      count: locations?.length || 0,
      locations: locations?.map(l => ({ id: l.id, name: l.name })),
      error: locErr?.message,
    });

    // Get all incidents
    const { data: incidents, error: incErr } = await supabase
      .from('incidents')
      .select('*');

    results.actions.push({
      action: 'List incidents',
      count: incidents?.length || 0,
      incidents: incidents?.map(i => ({ id: i.id, confidence: i.confidence, model: i.model_used })),
      error: incErr?.message,
    });

  } catch (err: unknown) {
    results.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(results);
}

interface DeleteResults {
  timestamp: string;
  deleted: { table: string; success: boolean; error?: string }[];
  message?: string;
  error?: string;
}

export async function DELETE() {
  const results: DeleteResults = {
    timestamp: new Date().toISOString(),
    deleted: [],
  };

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    // Delete all test incidents first (foreign key constraint)
    const { error: incErr } = await supabase
      .from('incidents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    results.deleted.push({
      table: 'incidents',
      success: !incErr,
      error: incErr?.message,
    });

    // Delete all cameras
    const { error: camErr } = await supabase
      .from('cameras')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    results.deleted.push({
      table: 'cameras',
      success: !camErr,
      error: camErr?.message,
    });

    // Keep the default location, delete others
    const { error: locErr } = await supabase
      .from('locations')
      .delete()
      .neq('name', 'Default Location');

    results.deleted.push({
      table: 'locations (except Default)',
      success: !locErr,
      error: locErr?.message,
    });

    results.message = 'Cleanup complete. Test data deleted.';

  } catch (err: unknown) {
    results.error = err instanceof Error ? err.message : 'Unknown error';
  }

  return NextResponse.json(results);
}
