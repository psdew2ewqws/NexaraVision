'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { AlertSettings } from '@/types/database';

const supabase = getSupabase();

// Default settings for new users
const DEFAULT_ALERT_SETTINGS: Omit<AlertSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  whatsapp_enabled: false,
  whatsapp_number: null,
  telegram_enabled: false,
  telegram_chat_id: null,
  discord_enabled: false,
  discord_webhook_url: null,
  email_enabled: false,
  push_enabled: true,
  min_confidence: 0.7,
  quiet_hours_start: null,
  quiet_hours_end: null,
};

export function useAlertSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      console.log('[AlertSettings] No userId, skipping fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[AlertSettings] Fetching settings for user:', userId);

      const { data, error: fetchError } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.log('[AlertSettings] Fetch error code:', fetchError.code, fetchError.message);

        // If no settings exist, create default settings
        if (fetchError.code === 'PGRST116') {
          console.log('[AlertSettings] No settings found, creating defaults...');
          const defaultSettings = {
            user_id: userId,
            ...DEFAULT_ALERT_SETTINGS,
          };

          const { data: newData, error: insertError } = await supabase
            .from('alert_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) {
            console.error('[AlertSettings] Failed to create defaults:', insertError);
            // Still set local defaults so UI works
            setSettings({
              id: 'local-fallback',
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...DEFAULT_ALERT_SETTINGS,
            } as AlertSettings);
            setError('Settings saved locally (DB sync failed)');
          } else {
            console.log('[AlertSettings] Created default settings:', newData);
            setSettings(newData);
          }
        } else {
          console.error('[AlertSettings] Fetch error:', fetchError);
          // Set local defaults so UI still works
          setSettings({
            id: 'local-fallback',
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...DEFAULT_ALERT_SETTINGS,
          } as AlertSettings);
          setError('Using local settings (DB unavailable)');
        }
      } else {
        console.log('[AlertSettings] Loaded settings:', data);
        setSettings(data);
      }
    } catch (err) {
      console.error('[AlertSettings] Error:', err);
      // Set local defaults so UI still works
      if (userId) {
        setSettings({
          id: 'local-fallback',
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...DEFAULT_ALERT_SETTINGS,
        } as AlertSettings);
      }
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<AlertSettings>): Promise<boolean> => {
    if (!userId) {
      console.log('[AlertSettings] No userId, cannot update');
      setError('Please sign in to save settings');
      return false;
    }

    // Optimistically update local state immediately
    setSettings(prev => prev ? { ...prev, ...updates } : null);

    try {
      setSaving(true);
      setError(null);

      // Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[AlertSettings] Session check:', session ? 'authenticated' : 'NOT authenticated');
      console.log('[AlertSettings] User ID:', userId);
      console.log('[AlertSettings] Session user ID:', session?.user?.id);

      if (!session) {
        console.error('[AlertSettings] No active session!');
        setError('Session expired - please sign in again');
        return false;
      }

      console.log('[AlertSettings] Updating settings:', updates);

      // Use upsert to handle both insert and update cases
      const { data, error: upsertError } = await supabase
        .from('alert_settings')
        .upsert({
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (upsertError) {
        console.error('[AlertSettings] Upsert error:', upsertError.message, upsertError.code, upsertError.details);
        setError(`Failed to save: ${upsertError.message}`);
        return false;
      }

      setSettings(data);
      console.log('[AlertSettings] Settings updated successfully:', data);
      return true;
    } catch (err) {
      console.error('[AlertSettings] Error:', err);
      setError('An unexpected error occurred');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const enableWhatsApp = async (phoneNumber: string): Promise<boolean> => {
    return updateSettings({
      whatsapp_enabled: true,
      whatsapp_number: phoneNumber,
    });
  };

  const disableWhatsApp = async (): Promise<boolean> => {
    return updateSettings({
      whatsapp_enabled: false,
    });
  };

  const testWhatsApp = async (phoneNumber?: string): Promise<{ success: boolean; error?: string }> => {
    const phone = phoneNumber || settings?.whatsapp_number;

    if (!phone) {
      return { success: false, error: 'No phone number provided' };
    }

    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to send test message' };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return {
    settings,
    loading,
    error,
    saving,
    updateSettings,
    enableWhatsApp,
    disableWhatsApp,
    testWhatsApp,
    refresh: fetchSettings,
  };
}

/**
 * Get users who should receive WhatsApp alerts for an incident
 */
export async function getWhatsAppRecipients(minConfidence: number = 0): Promise<{ userId: string; phone: string }[]> {
  const { data, error } = await supabase
    .from('alert_settings')
    .select('user_id, whatsapp_number')
    .eq('whatsapp_enabled', true)
    .not('whatsapp_number', 'is', null)
    .gte('min_confidence', minConfidence);

  if (error) {
    console.error('[AlertSettings] Failed to get WhatsApp recipients:', error);
    return [];
  }

  return (data || [])
    .filter(d => d.whatsapp_number)
    .map(d => ({
      userId: d.user_id,
      phone: d.whatsapp_number!,
    }));
}
