'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { useAuth } from './AuthContext';
import { alertLogger as log } from '@/lib/logger';

// Track incidents we've already triggered WhatsApp for to prevent duplicates
const whatsappSentIncidents = new Set<string>();

// Incident data from Supabase realtime
interface IncidentPayload {
  id: string;
  camera_id?: string | null;
  location_id?: string | null;
  confidence: number;
  model_used?: string;
  status: 'detected' | 'acknowledged' | 'responding' | 'resolved' | 'false_positive';
  detected_at?: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  notes?: string | null;
}

// Alert data structure for notifications
export interface AlertData {
  id: string;
  camera: string;
  camera_ar?: string;
  location: string;
  location_ar?: string;
  confidence: number;
  timestamp: Date;
  status: 'detected' | 'acknowledged' | 'responding' | 'resolved' | 'false_positive';
  incident_id: string;
}

interface AlertContextType {
  alerts: AlertData[];
  dismissAlert: (id: string) => void;
  acknowledgeAlert: (id: string) => Promise<void>;
  clearAllAlerts: () => void;
  pushAlert: (alert: Omit<AlertData, 'id'>) => void;
  latestIncident: IncidentPayload | null;
  realtimeStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  triggerTestAlert: () => Promise<void>;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// Maximum alerts to keep in memory
const MAX_ALERTS = 10;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [latestIncident, setLatestIncident] = useState<IncidentPayload | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const { user } = useAuth();

  const supabase = getSupabase();

  // Ref to store user's alert settings for WhatsApp
  const alertSettingsRef = useRef<{
    whatsapp_enabled: boolean;
    whatsapp_number: string | null;
    min_confidence: number;
  } | null>(null);

  // Fetch user's alert settings on mount/user change
  useEffect(() => {
    if (!user?.id) {
      alertSettingsRef.current = null;
      return;
    }

    const fetchAlertSettings = async () => {
      const { data, error } = await supabase
        .from('alert_settings')
        .select('whatsapp_enabled, whatsapp_number, min_confidence')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        alertSettingsRef.current = data;
        log.debug('[AlertContext] Loaded user alert settings:', {
          whatsapp_enabled: data.whatsapp_enabled,
          has_number: !!data.whatsapp_number,
        });
      } else {
        alertSettingsRef.current = null;
      }
    };

    fetchAlertSettings();
  }, [user?.id, supabase]);

  // Send WhatsApp alert for current user when incident is received via realtime
  // This ensures WhatsApp works even when detection runs on external machines
  const sendWhatsAppForCurrentUser = useCallback(async (
    incident: IncidentPayload,
    alertData: AlertData
  ) => {
    // Skip if already sent for this incident (prevent duplicates from multiple tabs)
    if (whatsappSentIncidents.has(incident.id)) {
      log.debug('[AlertContext] WhatsApp already sent for incident:', incident.id);
      return;
    }

    const settings = alertSettingsRef.current;
    if (!settings?.whatsapp_enabled || !settings?.whatsapp_number) {
      log.debug('[AlertContext] WhatsApp not enabled or no number for current user');
      return;
    }

    // Check confidence threshold
    const minConfidence = settings.min_confidence || 0;
    if (incident.confidence < minConfidence) {
      log.debug('[AlertContext] Incident confidence below threshold:', incident.confidence, '<', minConfidence);
      return;
    }

    // Mark as sent before making request to prevent race conditions
    whatsappSentIncidents.add(incident.id);

    try {
      log.debug('[AlertContext] Sending WhatsApp alert for incident:', incident.id);

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: settings.whatsapp_number,
          userId: user?.id,
          incidentId: incident.id,
          cameraName: alertData.camera,
          locationName: alertData.location,
          confidence: incident.confidence,
          timestamp: incident.detected_at || new Date().toISOString(),
        }),
        keepalive: true,
      });

      const result = await response.json();

      if (result.success) {
        log.debug('[AlertContext] ✅ WhatsApp alert sent successfully');
      } else if (result.cooldownActive) {
        log.debug('[AlertContext] ⏰ WhatsApp cooldown active:', result.remainingSeconds, 's remaining');
      } else {
        log.error('[AlertContext] WhatsApp send failed:', result.error);
        // Remove from sent set so it can retry
        whatsappSentIncidents.delete(incident.id);
      }
    } catch (err) {
      log.error('[AlertContext] WhatsApp request failed:', err);
      // Remove from sent set so it can retry
      whatsappSentIncidents.delete(incident.id);
    }

    // Clean up old entries periodically (keep last 100)
    if (whatsappSentIncidents.size > 100) {
      const idsArray = Array.from(whatsappSentIncidents);
      idsArray.slice(0, 50).forEach(id => whatsappSentIncidents.delete(id));
    }
  }, [user?.id]);

  // Dismiss an alert from the notification list
  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // Acknowledge an alert (updates database and removes from list)
  const acknowledgeAlert = useCallback(async (id: string) => {
    if (!user) return;

    // Find the alert to get incident_id
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    // Update incident status in database
    const { error } = await supabase
      .from('incidents')
      .update({
        status: 'acknowledged',
        acknowledged_by: user.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alert.incident_id);

    if (!error) {
      // Remove from notification list
      dismissAlert(id);
    } else {
      log.error('[AlertContext] Failed to acknowledge:', error);
    }
  }, [user, alerts, supabase, dismissAlert]);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Push alert directly (from live page — bypasses Supabase Realtime for instant delivery)
  const pushAlert = useCallback((alert: Omit<AlertData, 'id'>) => {
    const newAlert: AlertData = {
      ...alert,
      id: `alert-direct-${Date.now()}`,
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, MAX_ALERTS));
    playAlertSound();
    log.debug('[AlertContext] ✅ Direct alert pushed:', newAlert.id);
  }, []);

  // Helper function to process an incident into an alert
  const processIncidentToAlert = useCallback(async (incident: IncidentPayload): Promise<AlertData> => {
    // Fetch related camera and location data
    let cameraName = 'Unknown Camera';
    let cameraNameAr = '';
    let locationName = 'Unknown Location';
    let locationNameAr = '';

    if (incident.camera_id) {
      const { data: camera } = await supabase
        .from('cameras')
        .select('name, name_ar')
        .eq('id', incident.camera_id)
        .single();

      if (camera) {
        cameraName = camera.name || cameraName;
        cameraNameAr = camera.name_ar || '';
      }
    }

    if (incident.location_id) {
      const { data: location } = await supabase
        .from('locations')
        .select('name, name_ar')
        .eq('id', incident.location_id)
        .single();

      if (location) {
        locationName = location.name || locationName;
        locationNameAr = location.name_ar || '';
      }
    }

    return {
      id: `alert-${incident.id}-${Date.now()}`,
      camera: cameraName,
      camera_ar: cameraNameAr,
      location: locationName,
      location_ar: locationNameAr,
      confidence: incident.confidence || 0,
      timestamp: new Date(incident.detected_at || Date.now()),
      status: incident.status || 'detected',
      incident_id: incident.id,
    };
  }, [supabase]);

  // Trigger a test alert by inserting a real incident into the database
  const triggerTestAlert = useCallback(async () => {
    if (!user) {
      log.warn('[AlertContext] Cannot trigger test alert: not authenticated');
      return;
    }

    log.debug('[AlertContext] Triggering test alert...');

    // First, get or create a test camera and location
    const { data: locations } = await supabase
      .from('locations')
      .select('id')
      .limit(1)
      .single();

    const { data: cameras } = await supabase
      .from('cameras')
      .select('id')
      .limit(1)
      .single();

    // Insert a test incident - this will trigger the realtime subscription
    const { data: incident, error } = await supabase
      .from('incidents')
      .insert([{
        camera_id: cameras?.id || null,
        location_id: locations?.id || null,
        confidence: 95.5,
        model_used: 'Test Alert',
        status: 'detected',
        detected_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      log.error('[AlertContext] Test alert failed:', error);
    } else {
      log.debug('[AlertContext] Test incident created:', incident?.id);
    }
  }, [user, supabase]);

  // Setup realtime subscription for new incidents with auto-reconnect
  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Auth state sync
      setRealtimeStatus('disconnected');
      return;
    }

    let incidentChannel: RealtimeChannel;
    let mounted = true;
    let reconnectAttempts = 0;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY_MS = 3000;

    const setupRealtimeIncidents = async () => {
      log.debug('[AlertContext] Setting up realtime subscription for incidents...');
      log.debug('[AlertContext] User authenticated:', user.email);
      setRealtimeStatus('connecting');

      // Create a unique channel name to avoid conflicts
      const channelName = `incidents-alerts-${user.id.slice(0, 8)}`;

      incidentChannel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: true },
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'incidents',
          },
          async (payload) => {
            if (!mounted) return;

            log.debug('[AlertContext] 🚨 NEW INCIDENT DETECTED via Realtime:', payload.new);

            const incident = payload.new as IncidentPayload;

            // Skip if we already have a direct-push alert for this incident (avoid duplicates)
            setAlerts(prev => {
              const alreadyExists = prev.some(a => a.incident_id === incident.id);
              if (alreadyExists) {
                log.debug('[AlertContext] Skipping duplicate - already pushed directly for:', incident.id);
                return prev;
              }
              return prev; // Will be updated below
            });

            const newAlert = await processIncidentToAlert(incident);

            // Add to alerts list (skip if direct push already added it)
            setAlerts(prev => {
              if (prev.some(a => a.incident_id === incident.id)) return prev;
              return [newAlert, ...prev].slice(0, MAX_ALERTS);
            });
            setLatestIncident(incident);

            // Play alert sound
            playAlertSound();

            // Send WhatsApp alert for current user
            // This ensures WhatsApp works even when detection runs externally
            sendWhatsAppForCurrentUser(incident, newAlert);

            log.debug('[AlertContext] ✅ Alert added:', newAlert.id);
          }
        )
        .subscribe((status, err) => {
          log.debug('[AlertContext] Subscription status:', status, err ? `Error: ${err.message}` : '');

          if (!mounted) return;

          if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
            log.debug('[AlertContext] ✅ Realtime subscription ACTIVE - listening for incidents');
            setRealtimeStatus('connected');
            reconnectAttempts = 0; // Reset on successful connection
          } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
            log.error('[AlertContext] ❌ Realtime subscription ERROR:', err);
            log.error('[AlertContext] 💡 Hint: Ensure realtime is enabled for "incidents" table in Supabase Dashboard > Database > Replication');
            setRealtimeStatus('error');

            // Attempt reconnection
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && mounted) {
              reconnectAttempts++;
              log.debug(`[AlertContext] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY_MS}ms...`);
              reconnectTimeout = setTimeout(() => {
                if (mounted && incidentChannel) {
                  supabase.removeChannel(incidentChannel);
                  setupRealtimeIncidents();
                }
              }, RECONNECT_DELAY_MS * reconnectAttempts);
            }
          } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
            log.error('[AlertContext] ⏱️ Realtime subscription TIMED OUT');
            setRealtimeStatus('error');
          } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
            log.debug('[AlertContext] Realtime subscription CLOSED');
            setRealtimeStatus('disconnected');
          }
        });
    };

    setupRealtimeIncidents();

    return () => {
      mounted = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (incidentChannel) {
        log.debug('[AlertContext] Cleaning up subscription');
        supabase.removeChannel(incidentChannel);
      }
      setRealtimeStatus('disconnected');
    };
  }, [user, supabase, processIncidentToAlert, sendWhatsAppForCurrentUser]);

  return (
    <AlertContext.Provider
      value={{
        alerts,
        dismissAlert,
        acknowledgeAlert,
        clearAllAlerts,
        pushAlert,
        latestIncident,
        realtimeStatus,
        triggerTestAlert,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}

// Hook to use alert context
export function useAlertContext() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  return context;
}

// WebKit Audio Context for Safari compatibility
interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

// Play alert sound using Web Audio API
function playAlertSound() {
  try {
    const windowWithWebkit = window as WindowWithWebkitAudio;
    const AudioContextClass = window.AudioContext || windowWithWebkit.webkitAudioContext;
    if (!AudioContextClass) {
      log.warn('[AlertContext] Web Audio API not supported');
      return;
    }
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Alert sound: two-tone beep
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
    oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.15); // C#6
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (err) {
    log.warn('[AlertContext] Sound playback failed:', err);
  }
}
