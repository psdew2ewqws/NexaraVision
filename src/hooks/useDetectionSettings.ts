import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';

export interface DetectionSettings {
  id?: string;
  user_id?: string;
  primary_threshold: number;
  veto_threshold: number;
  instant_trigger_threshold: number;
  instant_trigger_count: number;
  sustained_threshold: number;
  sustained_duration: number;
  sound_enabled: boolean;
  auto_record: boolean;
}

export const DEFAULT_DETECTION_SETTINGS: DetectionSettings = {
  primary_threshold: 50,
  veto_threshold: 4,
  instant_trigger_threshold: 95,
  instant_trigger_count: 3,
  sustained_threshold: 70,
  sustained_duration: 2,
  sound_enabled: true,
  auto_record: true,
};

// Legacy localStorage key for migration
const LEGACY_STORAGE_KEY = 'nexara-detection-settings';

interface UseDetectionSettingsResult {
  settings: DetectionSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateSetting: <K extends keyof DetectionSettings>(key: K, value: DetectionSettings[K]) => void;
  saveSettings: () => Promise<boolean>;
  resetToDefaults: () => void;
  isAuthenticated: boolean;
}

export function useDetectionSettings(): UseDetectionSettingsResult {
  const [settings, setSettings] = useState<DetectionSettings>(DEFAULT_DETECTION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();

        // Check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // Try to load from Supabase
          const { data, error: fetchError } = await supabase
            .from('detection_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 = no rows found, which is OK
            // PGRST204/PGRST205 = table doesn't exist (migration not run yet)
            if (fetchError.code === 'PGRST204' || fetchError.code === 'PGRST205' || fetchError.code === '42P01') {
              console.info('[Detection Settings] Table not found - using localStorage. Run the migration to enable cloud sync.');
            } else {
              console.warn('[Detection Settings] Error loading from Supabase, using localStorage:', fetchError.message || fetchError.code);
            }
            // Fall back to localStorage
            loadFromLocalStorage();
            return;
          }

          if (data) {
            // Map database columns to camelCase for frontend
            setSettings({
              id: data.id,
              user_id: data.user_id,
              primary_threshold: data.primary_threshold,
              veto_threshold: data.veto_threshold,
              instant_trigger_threshold: data.instant_trigger_threshold,
              instant_trigger_count: data.instant_trigger_count,
              sustained_threshold: data.sustained_threshold,
              sustained_duration: data.sustained_duration,
              sound_enabled: data.sound_enabled,
              auto_record: data.auto_record,
            });
          } else {
            // No settings in DB, try to migrate from localStorage
            const legacySettings = loadFromLocalStorage();
            if (legacySettings) {
              // Auto-save to Supabase
              await saveToSupabase(user.id, legacySettings);
            }
          }
        } else {
          // Not authenticated, use localStorage
          loadFromLocalStorage();
        }
      } catch (err) {
        console.error('Error in loadSettings:', err);
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  const loadFromLocalStorage = useCallback((): DetectionSettings | null => {
    try {
      const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert camelCase localStorage format to our format
        const loadedSettings: DetectionSettings = {
          ...DEFAULT_DETECTION_SETTINGS,
          primary_threshold: parsed.primaryThreshold ?? DEFAULT_DETECTION_SETTINGS.primary_threshold,
          veto_threshold: parsed.vetoThreshold ?? DEFAULT_DETECTION_SETTINGS.veto_threshold,
          instant_trigger_threshold: parsed.instantTriggerThreshold ?? DEFAULT_DETECTION_SETTINGS.instant_trigger_threshold,
          instant_trigger_count: parsed.instantTriggerCount ?? DEFAULT_DETECTION_SETTINGS.instant_trigger_count,
          sustained_threshold: parsed.sustainedThreshold ?? DEFAULT_DETECTION_SETTINGS.sustained_threshold,
          sustained_duration: parsed.sustainedDuration ?? DEFAULT_DETECTION_SETTINGS.sustained_duration,
        };
        setSettings(loadedSettings);
        return loadedSettings;
      }
    } catch (e) {
      console.error('Failed to parse localStorage settings:', e);
    }
    return null;
  }, []);

  const saveToSupabase = async (uid: string, settingsToSave: DetectionSettings): Promise<boolean> => {
    try {
      const supabase = getSupabase();

      const { error: upsertError } = await supabase
        .from('detection_settings')
        .upsert({
          user_id: uid,
          primary_threshold: settingsToSave.primary_threshold,
          veto_threshold: settingsToSave.veto_threshold,
          instant_trigger_threshold: settingsToSave.instant_trigger_threshold,
          instant_trigger_count: settingsToSave.instant_trigger_count,
          sustained_threshold: settingsToSave.sustained_threshold,
          sustained_duration: settingsToSave.sustained_duration,
          sound_enabled: settingsToSave.sound_enabled,
          auto_record: settingsToSave.auto_record,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        // PGRST204/PGRST205/42P01 = table doesn't exist (migration not run yet)
        if (upsertError.code === 'PGRST204' || upsertError.code === 'PGRST205' || upsertError.code === '42P01') {
          console.info('[Detection Settings] Table not found - saving to localStorage. Run the migration to enable cloud sync.');
        } else {
          console.warn('[Detection Settings] Error saving to Supabase:', upsertError.message || upsertError.code);
        }
        return false;
      }

      // Clear legacy localStorage after successful migration
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('Error in saveToSupabase:', err);
      return false;
    }
  };

  const saveToLocalStorage = (settingsToSave: DetectionSettings) => {
    // Save in camelCase format for backward compatibility
    const legacyFormat = {
      primaryThreshold: settingsToSave.primary_threshold,
      vetoThreshold: settingsToSave.veto_threshold,
      instantTriggerThreshold: settingsToSave.instant_trigger_threshold,
      instantTriggerCount: settingsToSave.instant_trigger_count,
      sustainedThreshold: settingsToSave.sustained_threshold,
      sustainedDuration: settingsToSave.sustained_duration,
    };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyFormat));
  };

  const updateSetting = useCallback(<K extends keyof DetectionSettings>(key: K, value: DetectionSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveSettings = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      if (userId) {
        // Try to save to Supabase
        const success = await saveToSupabase(userId, settings);
        if (!success) {
          // Fallback to localStorage (still counts as success for UI)
          saveToLocalStorage(settings);
        }
        // Return true - settings are saved (either to cloud or localStorage)
        return true;
      } else {
        // No user, save to localStorage
        saveToLocalStorage(settings);
        return true;
      }
    } catch (err) {
      console.error('[Detection Settings] Error saving:', err);
      setError('Failed to save settings');
      // Fallback to localStorage
      saveToLocalStorage(settings);
      return true; // Still success since we saved to localStorage
    } finally {
      setIsSaving(false);
    }
  }, [userId, settings]);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_DETECTION_SETTINGS);
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateSetting,
    saveSettings,
    resetToDefaults,
    isAuthenticated: !!userId,
  };
}

// Helper to get settings for live page (simplified, read-only)
export function getDetectionSettingsFromStorage(): DetectionSettings {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_DETECTION_SETTINGS,
        primary_threshold: parsed.primaryThreshold ?? DEFAULT_DETECTION_SETTINGS.primary_threshold,
        veto_threshold: parsed.vetoThreshold ?? DEFAULT_DETECTION_SETTINGS.veto_threshold,
        instant_trigger_threshold: parsed.instantTriggerThreshold ?? DEFAULT_DETECTION_SETTINGS.instant_trigger_threshold,
        instant_trigger_count: parsed.instantTriggerCount ?? DEFAULT_DETECTION_SETTINGS.instant_trigger_count,
        sustained_threshold: parsed.sustainedThreshold ?? DEFAULT_DETECTION_SETTINGS.sustained_threshold,
        sustained_duration: parsed.sustainedDuration ?? DEFAULT_DETECTION_SETTINGS.sustained_duration,
      };
    }
  } catch (e) {
    console.error('Failed to parse localStorage settings:', e);
  }
  return DEFAULT_DETECTION_SETTINGS;
}
