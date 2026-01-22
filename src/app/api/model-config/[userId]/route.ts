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

    // Try to get user's custom configuration
    const { data, error } = await supabase
      .from('user_model_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (OK - use defaults)
      // Other errors should be logged
      console.error('[Model Config API] Supabase error:', error);
    }

    if (data) {
      // Return user's custom configuration
      return NextResponse.json({
        user_id: data.user_id,
        primary_model: data.primary_model,
        primary_threshold: data.primary_threshold,
        veto_model: data.veto_model,
        veto_threshold: data.veto_threshold,
        smart_veto_enabled: data.smart_veto_enabled,
        preset_id: data.preset_id,
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
