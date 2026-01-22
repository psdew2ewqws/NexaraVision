-- Migration: Add user model configurations for multi-tenant Smart Veto support
-- Date: 2026-01-22
-- Description: Stores per-user ML model configuration for multi-tenant detection

-- ============================================
-- USER MODEL CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS user_model_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Model Selection
    primary_model TEXT NOT NULL DEFAULT 'STGCNPP_Kaggle_NTU',
    veto_model TEXT NOT NULL DEFAULT 'MSG3D_Kaggle_NTU',

    -- Thresholds
    primary_threshold INT NOT NULL DEFAULT 94 CHECK (primary_threshold >= 50 AND primary_threshold <= 99),
    veto_threshold INT NOT NULL DEFAULT 85 CHECK (veto_threshold >= 50 AND veto_threshold <= 99),

    -- Preset (optional - tracks which preset was used, null for custom)
    preset_id TEXT,

    -- Smart Veto Logic enabled
    smart_veto_enabled BOOLEAN NOT NULL DEFAULT true,

    -- Configuration metadata
    config_name TEXT DEFAULT 'Default',
    config_description TEXT,

    -- Active configuration flag (user can have multiple configs but only one active)
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure only one active config per user
    UNIQUE(user_id, is_active)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_model_config_user_active
    ON user_model_configurations(user_id, is_active)
    WHERE is_active = true;

-- Create index for ML service lookups (by user_id)
CREATE INDEX IF NOT EXISTS idx_model_config_user
    ON user_model_configurations(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_model_configurations ENABLE ROW LEVEL SECURITY;

-- Users can view their own configurations
CREATE POLICY "Users can view own model configurations"
    ON user_model_configurations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own configurations
CREATE POLICY "Users can insert own model configurations"
    ON user_model_configurations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own configurations
CREATE POLICY "Users can update own model configurations"
    ON user_model_configurations
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own configurations
CREATE POLICY "Users can delete own model configurations"
    ON user_model_configurations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Service role can read all configs (for ML service API)
CREATE POLICY "Service role can read all model configurations"
    ON user_model_configurations
    FOR SELECT
    USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGER: Update updated_at on change
-- ============================================

CREATE TRIGGER user_model_configurations_updated_at
    BEFORE UPDATE ON user_model_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Get active model config for user
-- ============================================

CREATE OR REPLACE FUNCTION get_user_model_config(p_user_id UUID)
RETURNS TABLE (
    primary_model TEXT,
    primary_threshold INT,
    veto_model TEXT,
    veto_threshold INT,
    smart_veto_enabled BOOLEAN,
    preset_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        umc.primary_model,
        umc.primary_threshold,
        umc.veto_model,
        umc.veto_threshold,
        umc.smart_veto_enabled,
        umc.preset_id
    FROM user_model_configurations umc
    WHERE umc.user_id = p_user_id AND umc.is_active = true
    LIMIT 1;

    -- If no config found, return defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'STGCNPP_Kaggle_NTU'::TEXT as primary_model,
            94::INT as primary_threshold,
            'MSG3D_Kaggle_NTU'::TEXT as veto_model,
            85::INT as veto_threshold,
            true::BOOLEAN as smart_veto_enabled,
            'production'::TEXT as preset_id;
    END IF;
END;
$$;

-- ============================================
-- API VIEW: For ML service to query user configs
-- ============================================

CREATE OR REPLACE VIEW user_model_configs_api AS
SELECT
    umc.user_id,
    umc.primary_model,
    umc.primary_threshold,
    umc.veto_model,
    umc.veto_threshold,
    umc.smart_veto_enabled,
    umc.preset_id,
    p.email as user_email
FROM user_model_configurations umc
JOIN profiles p ON p.id = umc.user_id
WHERE umc.is_active = true;

-- Grant access to the view
GRANT SELECT ON user_model_configs_api TO authenticated;
GRANT SELECT ON user_model_configs_api TO service_role;

-- ============================================
-- REALTIME: Enable for live config updates
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_model_configurations;

-- ============================================
-- COMMENT: Documentation
-- ============================================

COMMENT ON TABLE user_model_configurations IS
'Stores per-user ML model configuration for multi-tenant Smart Veto detection. Each user can have their own model combination and thresholds.';

COMMENT ON COLUMN user_model_configurations.primary_model IS
'The PRIMARY model ID (e.g., STGCNPP_Kaggle_NTU). Must match model registry.';

COMMENT ON COLUMN user_model_configurations.veto_model IS
'The VETO model ID (e.g., MSG3D_Kaggle_NTU). Must match model registry.';

COMMENT ON COLUMN user_model_configurations.primary_threshold IS
'PRIMARY model threshold (50-99%). Violence score must exceed this.';

COMMENT ON COLUMN user_model_configurations.veto_threshold IS
'VETO model threshold (50-99%). Required for dual-model confirmation.';

COMMENT ON COLUMN user_model_configurations.preset_id IS
'Optional preset ID if using a predefined configuration. Null for custom configs.';
