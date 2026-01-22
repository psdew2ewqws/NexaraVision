import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_MODEL_CONFIG, MODEL_REGISTRY } from '@/config/model-registry';

// Create Supabase client with service role for API access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/model-config
 *
 * Fetches all active model configurations for the ML service.
 * Used for multi-tenant support - allows the ML server to cache
 * all user configurations and serve requests efficiently.
 *
 * Query params:
 * - limit: Max number of configs to return (default: 100)
 *
 * Returns array of user configurations with defaults for new users.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get all active configurations
    const { data, error } = await supabase
      .from('user_model_configurations')
      .select('*')
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      console.error('[Model Config API] Fetch all error:', error);
      // Return empty array with defaults
      return NextResponse.json({
        configs: [],
        defaults: DEFAULT_MODEL_CONFIG,
        available_models: MODEL_REGISTRY.map(m => ({
          id: m.id,
          displayName: m.displayName,
          architecture: m.architecture,
          trainingAccuracy: m.trainingAccuracy,
          datasets: m.datasets,
          recommendedRole: m.recommendedRole,
          recommendedThreshold: m.recommendedThreshold,
          filePath: m.filePath,
        })),
      });
    }

    return NextResponse.json({
      configs: data || [],
      defaults: DEFAULT_MODEL_CONFIG,
      available_models: MODEL_REGISTRY.map(m => ({
        id: m.id,
        displayName: m.displayName,
        architecture: m.architecture,
        trainingAccuracy: m.trainingAccuracy,
        datasets: m.datasets,
        recommendedRole: m.recommendedRole,
        recommendedThreshold: m.recommendedThreshold,
        filePath: m.filePath,
      })),
      total: data?.length || 0,
    });

  } catch (err) {
    console.error('[Model Config API] Error:', err);
    return NextResponse.json({
      configs: [],
      defaults: DEFAULT_MODEL_CONFIG,
      error: 'Failed to fetch configurations',
    }, { status: 200 }); // Return 200 with empty configs so ML service can use defaults
  }
}

/**
 * GET /api/model-config?action=registry
 *
 * Returns the full model registry with all specifications.
 * Used by ML service to validate model selections.
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    registry: MODEL_REGISTRY,
    defaults: DEFAULT_MODEL_CONFIG,
  });
}
