import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { createLogger } from '@/lib/logger';
import {
  MODEL_REGISTRY,
  MODEL_PRESETS,
  DEFAULT_MODEL_CONFIG,
  getAvailableModels,
  getModelById,
  type ModelSpec,
  type ModelPreset,
} from '@/config/model-registry';

const log = createLogger('ModelConfiguration');

export interface ModelConfiguration {
  id?: string;
  user_id?: string;
  primary_model: string;
  primary_threshold: number;
  veto_model: string;
  veto_threshold: number;
  smart_veto_enabled: boolean;
  preset_id: string | null;
  config_name?: string;
  config_description?: string;
  is_active?: boolean;
}

export const DEFAULT_MODEL_CONFIGURATION: ModelConfiguration = {
  primary_model: DEFAULT_MODEL_CONFIG.primaryModel,
  primary_threshold: DEFAULT_MODEL_CONFIG.primaryThreshold,
  veto_model: DEFAULT_MODEL_CONFIG.vetoModel,
  veto_threshold: DEFAULT_MODEL_CONFIG.vetoThreshold,
  smart_veto_enabled: true,
  preset_id: DEFAULT_MODEL_CONFIG.presetId,
  config_name: 'Default',
  is_active: true,
};

// localStorage key for unauthenticated users
const LOCAL_STORAGE_KEY = 'nexara-model-config';

interface UseModelConfigurationResult {
  config: ModelConfiguration;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Model info
  primaryModelSpec: ModelSpec | undefined;
  vetoModelSpec: ModelSpec | undefined;
  availableModels: ModelSpec[];
  presets: ModelPreset[];

  // Actions
  updateConfig: <K extends keyof ModelConfiguration>(key: K, value: ModelConfiguration[K]) => void;
  applyPreset: (presetId: string) => void;
  saveConfig: () => Promise<boolean>;
  resetToDefaults: () => void;

  // Validation
  isValidCombination: boolean;
  validationErrors: string[];
}

export function useModelConfiguration(): UseModelConfigurationResult {
  const [config, setConfig] = useState<ModelConfiguration>(DEFAULT_MODEL_CONFIGURATION);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get model specifications
  const primaryModelSpec = getModelById(config.primary_model);
  const vetoModelSpec = getModelById(config.veto_model);
  const availableModels = getAvailableModels();

  // Validate combination
  const { isValidCombination, validationErrors } = validateModelCombination(config);

  // Load from localStorage
  const loadFromLocalStorage = useCallback((): ModelConfiguration | null => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedConfig: ModelConfiguration = {
          ...DEFAULT_MODEL_CONFIGURATION,
          ...parsed,
        };
        setConfig(loadedConfig);
        return loadedConfig;
      }
    } catch (e) {
      log.warn('Failed to parse localStorage model config:', e);
    }
    return null;
  }, []);

  // Load configuration on mount
  useEffect(() => {
    async function loadConfig() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // Try to load from Supabase
          const { data, error: fetchError } = await supabase
            .from('user_model_configurations')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found
            if (fetchError.code === 'PGRST204' || fetchError.code === 'PGRST205' || fetchError.code === '42P01') {
              log.info('Table not found - using localStorage. Run migration to enable cloud sync.');
            } else {
              log.warn('[Model Config] Error loading from Supabase:', fetchError.message);
            }
            loadFromLocalStorage();
            return;
          }

          if (data) {
            setConfig({
              id: data.id,
              user_id: data.user_id,
              primary_model: data.primary_model,
              primary_threshold: data.primary_threshold,
              veto_model: data.veto_model,
              veto_threshold: data.veto_threshold,
              smart_veto_enabled: data.smart_veto_enabled,
              preset_id: data.preset_id,
              config_name: data.config_name,
              config_description: data.config_description,
              is_active: data.is_active,
            });
          } else {
            // No config in DB, try localStorage
            const localConfig = loadFromLocalStorage();
            if (localConfig) {
              // Auto-save to Supabase
              await saveToSupabase(user.id, localConfig);
            }
          }
        } else {
          // Not authenticated
          loadFromLocalStorage();
        }
      } catch (err) {
        log.error('Error in loadConfig:', err);
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    }

    loadConfig();
  }, [loadFromLocalStorage]);

  const saveToSupabase = async (uid: string, configToSave: ModelConfiguration): Promise<boolean> => {
    try {
      const supabase = getSupabase();

      const { error: upsertError } = await supabase
        .from('user_model_configurations')
        .upsert({
          user_id: uid,
          primary_model: configToSave.primary_model,
          primary_threshold: configToSave.primary_threshold,
          veto_model: configToSave.veto_model,
          veto_threshold: configToSave.veto_threshold,
          smart_veto_enabled: configToSave.smart_veto_enabled,
          preset_id: configToSave.preset_id,
          config_name: configToSave.config_name || 'Default',
          config_description: configToSave.config_description,
          is_active: true,
        }, { onConflict: 'user_id,is_active' });

      if (upsertError) {
        if (upsertError.code === 'PGRST204' || upsertError.code === 'PGRST205' || upsertError.code === '42P01') {
          log.info('Table not found - saving to localStorage.');
        } else {
          log.warn('[Model Config] Error saving to Supabase:', upsertError.message);
        }
        return false;
      }

      // Clear localStorage after successful save
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return true;
    } catch (err) {
      log.error('Error in saveToSupabase:', err);
      return false;
    }
  };

  const saveToLocalStorage = (configToSave: ModelConfiguration) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configToSave));
  };

  const updateConfig = useCallback(<K extends keyof ModelConfiguration>(
    key: K,
    value: ModelConfiguration[K]
  ) => {
    setConfig(prev => {
      const updated = { ...prev, [key]: value };
      // If changing model or threshold, clear preset (it's now custom)
      if (['primary_model', 'primary_threshold', 'veto_model', 'veto_threshold'].includes(key)) {
        updated.preset_id = null;
      }
      return updated;
    });
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = MODEL_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setConfig(prev => ({
        ...prev,
        primary_model: preset.primaryModel,
        primary_threshold: preset.primaryThreshold,
        veto_model: preset.vetoModel,
        veto_threshold: preset.vetoThreshold,
        preset_id: presetId,
        config_name: preset.name,
      }));
    }
  }, []);

  const saveConfig = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate before saving
      const { isValidCombination: isValid, validationErrors: errors } = validateModelCombination(config);
      if (!isValid) {
        setError(errors.join(', '));
        return false;
      }

      if (userId) {
        const success = await saveToSupabase(userId, config);
        if (!success) {
          saveToLocalStorage(config);
        }
        return true;
      } else {
        saveToLocalStorage(config);
        return true;
      }
    } catch (err) {
      log.error('[Model Config] Error saving:', err);
      setError('Failed to save model configuration');
      saveToLocalStorage(config);
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [userId, config]);

  const resetToDefaults = useCallback(() => {
    setConfig(DEFAULT_MODEL_CONFIGURATION);
  }, []);

  return {
    config,
    isLoading,
    isSaving,
    error,
    isAuthenticated: !!userId,
    primaryModelSpec,
    vetoModelSpec,
    availableModels,
    presets: MODEL_PRESETS,
    updateConfig,
    applyPreset,
    saveConfig,
    resetToDefaults,
    isValidCombination,
    validationErrors,
  };
}

// Validation function for model combinations
function validateModelCombination(config: ModelConfiguration): {
  isValidCombination: boolean;
  validationErrors: string[];
} {
  const errors: string[] = [];

  // Check if models exist
  const primaryModel = getModelById(config.primary_model);
  const vetoModel = getModelById(config.veto_model);

  if (!primaryModel) {
    errors.push(`Primary model "${config.primary_model}" not found`);
  }

  if (!vetoModel) {
    errors.push(`VETO model "${config.veto_model}" not found`);
  }

  // Check if models are available (>75% accuracy, dual dataset)
  if (primaryModel && (!primaryModel.isAvailable || !primaryModel.isDualDataset)) {
    errors.push(`Primary model does not meet requirements (>75% accuracy, dual dataset)`);
  }

  if (vetoModel && (!vetoModel.isAvailable || !vetoModel.isDualDataset)) {
    errors.push(`VETO model does not meet requirements (>75% accuracy, dual dataset)`);
  }

  // Check threshold ranges
  if (config.primary_threshold < 50 || config.primary_threshold > 99) {
    errors.push('Primary threshold must be between 50% and 99%');
  }

  if (config.veto_threshold < 50 || config.veto_threshold > 99) {
    errors.push('VETO threshold must be between 50% and 99%');
  }

  // Warning: Same model for both roles (not an error, but suboptimal)
  if (config.primary_model === config.veto_model) {
    // This is allowed but will be noted in UI
  }

  return {
    isValidCombination: errors.length === 0,
    validationErrors: errors,
  };
}

// Helper function to get user's model config for ML service API
export async function getUserModelConfigForAPI(userId: string): Promise<ModelConfiguration> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .rpc('get_user_model_config', { p_user_id: userId });

    if (error || !data || data.length === 0) {
      log.warn('Failed to get user model config, using defaults:', error?.message);
      return DEFAULT_MODEL_CONFIGURATION;
    }

    return {
      primary_model: data[0].primary_model,
      primary_threshold: data[0].primary_threshold,
      veto_model: data[0].veto_model,
      veto_threshold: data[0].veto_threshold,
      smart_veto_enabled: data[0].smart_veto_enabled,
      preset_id: data[0].preset_id,
    };
  } catch (err) {
    log.error('Error getting user model config:', err);
    return DEFAULT_MODEL_CONFIGURATION;
  }
}
