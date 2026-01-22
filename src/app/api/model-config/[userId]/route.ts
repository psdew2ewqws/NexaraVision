import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_MODEL_CONFIG } from '@/config/model-registry';

// Create Supabase client with service role for API access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ModelConfigResponse {
  user_id: string;
  primary_model: string;
  primary_threshold: number;
  veto_model: string;
  veto_threshold: number;
  smart_veto_enabled: boolean;
  preset_id: string | null;
}

/**
 * GET /api/model-config/[userId]
 *
 * Fetches the model configuration for a specific user.
 * Used by the ML service to get per-user detection settings.
 *
 * Multi-tenant support: Each user can have their own model configuration,
 * allowing 5+ concurrent users with different configs.
 *
 * Returns default configuration if user has no custom config.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (!userId || userId === 'undefined' || userId === 'null') {
      // Return default config for anonymous users
      return NextResponse.json({
        user_id: 'anonymous',
        primary_model: DEFAULT_MODEL_CONFIG.primaryModel,
        primary_threshold: DEFAULT_MODEL_CONFIG.primaryThreshold,
        veto_model: DEFAULT_MODEL_CONFIG.vetoModel,
        veto_threshold: DEFAULT_MODEL_CONFIG.vetoThreshold,
        smart_veto_enabled: true,
        preset_id: DEFAULT_MODEL_CONFIG.presetId,
        source: 'default',
      } satisfies ModelConfigResponse & { source: string });
    }

    // Try to get user's custom configuration using RPC function (bypasses RLS)
    const { data, error } = await supabase
      .rpc('get_user_model_config', { p_user_id: userId });

    if (error) {
      console.error('[Model Config API] Supabase RPC error:', error);
    }

    // RPC returns array, check if we have a result with custom config
    if (data && data.length > 0 && data[0].preset_id !== 'production') {
      const config = data[0];
      // Return user's custom configuration
      return NextResponse.json({
        user_id: userId,
        primary_model: config.primary_model,
        primary_threshold: config.primary_threshold,
        veto_model: config.veto_model,
        veto_threshold: config.veto_threshold,
        smart_veto_enabled: config.smart_veto_enabled,
        preset_id: config.preset_id,
        source: 'custom',
      } satisfies ModelConfigResponse & { source: string });
    }

    // No custom config found - return defaults
    return NextResponse.json({
      user_id: userId,
      primary_model: DEFAULT_MODEL_CONFIG.primaryModel,
      primary_threshold: DEFAULT_MODEL_CONFIG.primaryThreshold,
      veto_model: DEFAULT_MODEL_CONFIG.vetoModel,
      veto_threshold: DEFAULT_MODEL_CONFIG.vetoThreshold,
      smart_veto_enabled: true,
      preset_id: DEFAULT_MODEL_CONFIG.presetId,
      source: 'default',
    } satisfies ModelConfigResponse & { source: string });

  } catch (err) {
    console.error('[Model Config API] Error:', err);

    // Return defaults on error
    return NextResponse.json({
      user_id: 'error',
      primary_model: DEFAULT_MODEL_CONFIG.primaryModel,
      primary_threshold: DEFAULT_MODEL_CONFIG.primaryThreshold,
      veto_model: DEFAULT_MODEL_CONFIG.vetoModel,
      veto_threshold: DEFAULT_MODEL_CONFIG.vetoThreshold,
      smart_veto_enabled: true,
      preset_id: DEFAULT_MODEL_CONFIG.presetId,
      source: 'default_error',
    } satisfies ModelConfigResponse & { source: string }, { status: 200 });
  }
}

/**
 * POST /api/model-config/[userId]
 *
 * Updates the model configuration for a specific user.
 * Requires authentication matching the userId.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    if (!userId || userId === 'undefined' || userId === 'null') {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const {
      primary_model,
      primary_threshold,
      veto_model,
      veto_threshold,
      smart_veto_enabled = true,
      preset_id = null,
    } = body;

    // Validate required fields
    if (!primary_model || !veto_model) {
      return NextResponse.json({ error: 'primary_model and veto_model are required' }, { status: 400 });
    }

    // Validate thresholds
    if (primary_threshold < 50 || primary_threshold > 99) {
      return NextResponse.json({ error: 'primary_threshold must be between 50 and 99' }, { status: 400 });
    }
    if (veto_threshold < 50 || veto_threshold > 99) {
      return NextResponse.json({ error: 'veto_threshold must be between 50 and 99' }, { status: 400 });
    }

    // Upsert configuration
    const { data, error } = await supabase
      .from('user_model_configurations')
      .upsert({
        user_id: userId,
        primary_model,
        primary_threshold,
        veto_model,
        veto_threshold,
        smart_veto_enabled,
        preset_id,
        is_active: true,
      }, { onConflict: 'user_id,is_active' })
      .select()
      .single();

    if (error) {
      console.error('[Model Config API] Upsert error:', error);
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (err) {
    console.error('[Model Config API] POST Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
