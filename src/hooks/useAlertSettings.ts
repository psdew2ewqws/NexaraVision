'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { AlertSettings } from '@/types/database';

const supabase = getSupabase();

export function useAlertSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('alert_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // If no settings exist, create default settings
        if (fetchError.code === 'PGRST116') {
          const defaultSettings: Partial<AlertSettings> = {
            user_id: userId,
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

          const { data: newData, error: insertError } = await supabase
            .from('alert_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) {
            console.error('[AlertSettings] Failed to create defaults:', insertError);
            setError('Failed to create alert settings');
          } else {
            setSettings(newData);
          }
        } else {
          console.error('[AlertSettings] Fetch error:', fetchError);
          setError('Failed to load alert settings');
        }
      } else {
        setSettings(data);
      }
    } catch (err) {
      console.error('[AlertSettings] Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<AlertSettings>): Promise<boolean> => {
    if (!userId || !settings) return false;

    try {
      setSaving(true);
      setError(null);

      const { data, error: updateError } = await supabase
        .from('alert_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[AlertSettings] Update error:', updateError);
        setError('Failed to save settings');
        return false;
      }

      setSettings(data);
      console.log('[AlertSettings] Settings updated successfully');
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
