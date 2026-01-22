'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { validateIncidentData, clamp } from '@/lib/validation';
import { DETECTION } from '@/constants/detection';
import { createLogger, incidentLogger, cameraLogger, storageLogger, alertLogger } from '@/lib/logger';

// Module-specific loggers
const throttleLog = createLogger('Throttle');
const dashLog = createLogger('Dashboard');
const locLog = createLogger('Locations');
const mediaLog = createLogger('Media');

// Get supabase client once at module level
const supabase = getSupabase();

// ============================================
// INCIDENT THROTTLING & GROUPING (Database-based)
// ============================================

/** Active incident info returned from database query */
interface ActiveIncident {
  incidentId: string;
  cameraId: string;
  detectedAt: Date;
  confidence: number;
}

/** Check if camera has an active incident within the grouping window (DB-based) */
async function getActiveIncidentForCamera(cameraId: string): Promise<ActiveIncident | null> {
  const cutoffTime = new Date(Date.now() - DETECTION.INCIDENT_GROUP_WINDOW_MS).toISOString();

  throttleLog.debug('[Throttle] Checking for recent incidents...', { cameraId, cutoffTime });

  try {
    // Query database for recent incidents from this camera
    const { data: recentIncident, error } = await supabase
      .from('incidents')
      .select('id, camera_id, confidence, detected_at')
      .eq('camera_id', cameraId)
      .gte('detected_at', cutoffTime)
      .order('detected_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // PGRST116 = no rows returned, which is expected
      if (error.code !== 'PGRST116') {
        throttleLog.error('[Throttle] Database query failed:', error.message);
      }
      return null;
    }

    if (recentIncident) {
      throttleLog.debug('[Throttle] ✅ Found active incident:', recentIncident.id);
      return {
        incidentId: recentIncident.id,
        cameraId: recentIncident.camera_id,
        detectedAt: new Date(recentIncident.detected_at),
        confidence: recentIncident.confidence,
      };
    }

    return null;
  } catch (err: unknown) {
    throttleLog.error('[Throttle] Error checking active incidents:', (err as Error)?.message);
    return null;
  }
}

/** Get screenshot count for an incident from storage */
async function getIncidentScreenshotCount(incidentId: string): Promise<number> {
  try {
    const { data: files } = await supabase.storage
      .from('recordings')
      .list(`incidents/${incidentId}`, { limit: 100 });

    if (!files) return 0;
    return files.filter(f => f.name.includes('screenshot_')).length;
  } catch {
    return 0;
  }
}

// ============================================
// TYPE DEFINITIONS (GAP-CQ-002 Fix)
// ============================================

/** Location with joined relation data */
export interface Location {
  id: string;
  name: string;
  name_ar?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

/** Camera with optional joined location data */
export interface Camera {
  id: string;
  name: string;
  name_ar?: string;
  stream_url?: string | null;
  status: 'online' | 'offline' | 'maintenance';
  location_id?: string | null;
  grid_position?: number;
  sensitivity?: number;
  created_at?: string;
  updated_at?: string;
  // Joined relation
  locations?: { name: string; name_ar?: string } | null;
}

/** Incident with optional joined camera and location data */
export interface Incident {
  id: string;
  camera_id?: string | null;
  location_id?: string | null;
  confidence: number;
  violence_score?: number;
  model_used?: string;
  status: 'detected' | 'acknowledged' | 'responding' | 'resolved' | 'false_positive';
  detected_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  created_at?: string;
  // Joined relations
  cameras?: { name: string; name_ar?: string } | null;
  locations?: { name: string; name_ar?: string } | null;
}

/** Type for incident status update payload */
interface IncidentStatusUpdate {
  status: Incident['status'];
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

// Fetch cameras
export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Check if user is authenticated first
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          if (mounted) {
            setError('Not authenticated');
            setCameras([]);
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('cameras')
          .select('*, locations(name, name_ar)')
          .order('grid_position', { ascending: true });

        if (!mounted) return;

        if (fetchError) {
          cameraLogger.error('[useCameras] Fetch error:', fetchError.message);
          setError(fetchError.message);
        } else {
          cameraLogger.debug('[useCameras] Fetched', data?.length || 0, 'cameras');
          setCameras((data as Camera[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const error = err as Error;
        if (error?.name === 'AbortError') return;
        cameraLogger.error('[useCameras] Error:', error?.message || err);
        setError('Failed to fetch cameras');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const timeoutId = setTimeout(fetchData, 100);
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return { cameras, loading, error };
}

// Fetch incidents - simplified without realtime for stability
export function useIncidents(limit = 50) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Check if user is authenticated first
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          if (mounted) {
            setError('Not authenticated');
            setIncidents([]);
            setLoading(false);
          }
          return;
        }

        const { data, error: fetchError } = await supabase
          .from('incidents')
          .select('*, cameras(name, name_ar), locations(name, name_ar)')
          .order('detected_at', { ascending: false })
          .limit(limit);

        if (!mounted) return;

        if (fetchError) {
          incidentLogger.error('[useIncidents] Fetch error:', fetchError.message, fetchError.code);
          setError(fetchError.message);
          setIncidents([]);
        } else {
          incidentLogger.debug('[useIncidents] Fetched', data?.length || 0, 'incidents');
          setIncidents((data as Incident[]) || []);
          setError(null);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const error = err as Error;
        // Ignore AbortError from component unmount
        if (error?.name === 'AbortError') {
          incidentLogger.debug('[useIncidents] Request aborted (component unmount)');
          return;
        }
        incidentLogger.error('[useIncidents] Error:', error?.message || err);
        setError('Failed to fetch incidents');
        setIncidents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(true);
    // Small delay to prevent rapid re-fetches
    const timeoutId = setTimeout(fetchData, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [limit, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  return { incidents, loading, error, setIncidents, refresh };
}

// Pagination options for incidents
export interface PaginationOptions {
  page: number;
  pageSize: number;
  status?: Incident['status'] | 'all';
}

// Paginated incidents hook with total count
export function useIncidentsPaginated(options: PaginationOptions) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { page, pageSize, status = 'all' } = options;
  const offset = (page - 1) * pageSize;

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        // Check if user is authenticated first
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) {
          if (mounted) {
            setError('Not authenticated');
            setIncidents([]);
            setTotalCount(0);
            setLoading(false);
          }
          return;
        }

        // Build query
        let query = supabase
          .from('incidents')
          .select('*, cameras(name, name_ar), locations(name, name_ar)', { count: 'exact' });

        // Apply status filter if not 'all'
        if (status !== 'all') {
          query = query.eq('status', status);
        }

        // Apply ordering and pagination
        const { data, error: fetchError, count } = await query
          .order('detected_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (!mounted) return;

        if (fetchError) {
          incidentLogger.error('[useIncidentsPaginated] Fetch error:', fetchError.message);
          setError(fetchError.message);
          setIncidents([]);
          setTotalCount(0);
        } else {
          incidentLogger.debug('[useIncidentsPaginated] Fetched', data?.length || 0, 'of', count, 'incidents');
          setIncidents((data as Incident[]) || []);
          setTotalCount(count || 0);
          setError(null);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const error = err as Error;
        if (error?.name === 'AbortError') return;
        incidentLogger.error('[useIncidentsPaginated] Error:', error?.message || err);
        setError('Failed to fetch incidents');
        setIncidents([]);
        setTotalCount(0);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(true);
    const timeoutId = setTimeout(fetchData, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [page, pageSize, status, offset, refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    incidents,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    refresh
  };
}

// Fetch locations
export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .order('name', { ascending: true });

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setLocations((data as Location[]) || []);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        locLog.error('[useLocations] Error:', (err as Error)?.message || err);
        setError('Failed to fetch locations');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, []);

  return { locations, loading, error };
}

// Get dashboard stats
export function useDashboardStats() {
  const [stats, setStats] = useState({
    activeCameras: 0,
    totalCameras: 0,
    todaysIncidents: 0,
    resolvedToday: 0,
    falsePositives: 0,
    avgResponseTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [camerasRes, activeCamerasRes, incidentsRes, resolvedRes, falseRes, acknowledgedIncidents] = await Promise.all([
          supabase.from('cameras').select('*', { count: 'exact', head: true }),
          supabase.from('cameras').select('*', { count: 'exact', head: true }).eq('status', 'online'),
          supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('detected_at', today.toISOString()),
          supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('detected_at', today.toISOString()).eq('status', 'resolved'),
          supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('detected_at', today.toISOString()).eq('status', 'false_positive'),
          // Get incidents with acknowledged_at to calculate real response time
          supabase.from('incidents').select('detected_at, acknowledged_at').not('acknowledged_at', 'is', null).limit(100),
        ]);

        if (!mounted) return;

        // Calculate real average response time from acknowledged incidents
        let avgResponseTime = 0;
        if (acknowledgedIncidents.data && acknowledgedIncidents.data.length > 0) {
          type IncidentTimes = { detected_at: string; acknowledged_at: string | null };
          const responseTimes = (acknowledgedIncidents.data as IncidentTimes[])
            .filter((i) => i.detected_at && i.acknowledged_at)
            .map((i) => {
              const detected = new Date(i.detected_at).getTime();
              const acknowledged = new Date(i.acknowledged_at!).getTime();
              return (acknowledged - detected) / 60000; // Convert to minutes
            })
            .filter((t) => t > 0 && t < 1440); // Filter out invalid times (0 to 24 hours)

          if (responseTimes.length > 0) {
            avgResponseTime = Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10;
          }
        }

        setStats({
          activeCameras: activeCamerasRes.count || 0,
          totalCameras: camerasRes.count || 0,
          todaysIncidents: incidentsRes.count || 0,
          resolvedToday: resolvedRes.count || 0,
          falsePositives: falseRes.count || 0,
          avgResponseTime,
        });
      } catch (err) {
        dashLog.error('Failed to fetch dashboard stats:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => { mounted = false; };
  }, []);

  return { stats, loading };
}

// Update incident status
export async function updateIncidentStatus(
  incidentId: string,
  status: 'acknowledged' | 'responding' | 'resolved' | 'false_positive',
  userId: string,
  notes?: string
) {
  const updates: IncidentStatusUpdate = { status };

  if (status === 'acknowledged') {
    updates.acknowledged_by = userId;
    updates.acknowledged_at = new Date().toISOString();
  } else if (status === 'resolved' || status === 'false_positive') {
    updates.resolved_by = userId;
    updates.resolved_at = new Date().toISOString();
    if (notes) updates.resolution_notes = notes;
  }

  const { error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', incidentId);

  return { error };
}

/** Delete an incident and its associated media files */
export async function deleteIncident(incidentId: string): Promise<{ error: Error | null }> {
  incidentLogger.debug('[Incident] Deleting incident:', incidentId);

  try {
    // First delete all media files from storage
    const { data: files } = await supabase.storage
      .from('recordings')
      .list(`incidents/${incidentId}`);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `incidents/${incidentId}/${f.name}`);
      const { error: storageError } = await supabase.storage
        .from('recordings')
        .remove(filePaths);

      if (storageError) {
        incidentLogger.warn('[Incident] Failed to delete media files:', storageError.message);
        // Continue with incident deletion even if storage cleanup fails
      } else {
        incidentLogger.debug('[Incident] Deleted', filePaths.length, 'media files');
      }
    }

    // Then delete the incident record
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', incidentId);

    if (error) {
      incidentLogger.error('[Incident] Delete failed:', error.message);
      return { error: new Error(error.message) };
    }

    incidentLogger.debug('[Incident] ✅ Deleted successfully');
    return { error: null };
  } catch (err: unknown) {
    const error = err as Error;
    incidentLogger.error('[Incident] Delete exception:', error?.message);
    return { error };
  }
}

// Create new incident
export async function createIncident(data: {
  camera_id: string;
  location_id: string;
  confidence: number;
  violence_score?: number;
  model_used?: string;
  video_url?: string;
  thumbnail_url?: string;
}) {
  // GAP-CQ-004 Fix: Validate input data
  const validation = validateIncidentData(data);
  if (!validation.valid) {
    incidentLogger.warn('[Incident] Validation failed:', validation.errors);
    // Don't reject - just clamp confidence and continue with warning
  }

  // Ensure confidence is within valid range
  const safeConfidence = clamp(data.confidence, 0, 100);

  const { data: incident, error } = await supabase
    .from('incidents')
    .insert([{
      ...data,
      confidence: safeConfidence,
      status: 'detected',
      detected_at: new Date().toISOString(),
    }])
    .select()
    .single();

  return { incident, error };
}

// Storage bucket name for recordings
const RECORDINGS_BUCKET = 'recordings';

// Upload video to Supabase Storage
async function uploadVideoToStorage(incidentId: string, videoBlob: Blob): Promise<string | null> {
  const fileName = `incidents/${incidentId}/video_${Date.now()}.webm`;

  storageLogger.debug('[Storage] Uploading video...', { fileName, size: videoBlob.size });

  try {
    const { error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(fileName, videoBlob, {
        contentType: 'video/webm',
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      storageLogger.error('[Storage] Video upload failed:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(fileName);

    storageLogger.debug('[Storage] Video uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err: unknown) {
    storageLogger.error('[Storage] Video upload exception:', (err as Error)?.message || err);
    return null;
  }
}

// Upload thumbnail to Supabase Storage
async function uploadThumbnailToStorage(incidentId: string, thumbnailBlob: Blob): Promise<string | null> {
  const fileName = `incidents/${incidentId}/thumbnail_${Date.now()}.jpg`;

  storageLogger.debug('[Storage] Uploading thumbnail...', { fileName, size: thumbnailBlob.size });

  try {
    const { error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(fileName, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      storageLogger.error('[Storage] Thumbnail upload failed:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(fileName);

    storageLogger.debug('[Storage] Thumbnail uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err: unknown) {
    storageLogger.error('[Storage] Thumbnail upload exception:', (err as Error)?.message || err);
    return null;
  }
}

// Update incident with video/thumbnail URLs
async function updateIncidentWithUrls(incidentId: string, video_url?: string | null, thumbnail_url?: string | null) {
  const updates: Record<string, string> = {};
  if (video_url) updates.video_url = video_url;
  if (thumbnail_url) updates.thumbnail_url = thumbnail_url;

  if (Object.keys(updates).length === 0) return;

  incidentLogger.debug('[Incident] Updating with URLs:', { incidentId, ...updates });

  const { error } = await supabase
    .from('incidents')
    .update(updates)
    .eq('id', incidentId);

  if (error) {
    incidentLogger.error('[Incident] Failed to update URLs:', error.message);
  } else {
    incidentLogger.debug('[Incident] URLs updated successfully');
  }
}

// Retry helper for AbortError
async function retryOnAbort<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err as Error;
      lastError = error;

      // Check if it's an AbortError (lock timeout)
      if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
        storageLogger.warn(`[Supabase] AbortError on attempt ${attempt}/${maxRetries}, retrying in ${delayMs}ms...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt)); // Exponential backoff
          continue;
        }
      }
      throw error;
    }
  }
  throw lastError;
}

// Create incident with video recording - WITH THROTTLING & GROUPING
export async function createIncidentWithRecording(data: {
  camera_id: string;
  location_id: string;
  confidence: number;
  model_used?: string;
  videoBlob?: Blob;
  thumbnailBlob?: Blob;
}) {
  incidentLogger.debug('[Incident] createIncidentWithRecording called', {
    camera_id: data.camera_id,
    location_id: data.location_id,
    confidence: data.confidence,
    hasVideo: !!data.videoBlob,
    videoSize: data.videoBlob?.size,
    hasThumbnail: !!data.thumbnailBlob,
  });

  // GAP-CQ-004 Fix: Validate input data
  const validation = validateIncidentData(data);
  if (!validation.valid) {
    incidentLogger.warn('[Incident] Validation warnings:', validation.errors);
  }

  // Ensure confidence is within valid range
  const safeConfidence = clamp(data.confidence, 0, 100);

  try {
    // First verify we have a valid auth session with retry on AbortError
    const authResult = await retryOnAbort(async () => {
      return await supabase.auth.getUser();
    }, 3, 300);

    const { data: authData, error: authError } = authResult;
    if (authError || !authData?.user) {
      incidentLogger.error('[Incident] ❌ Not authenticated:', authError?.message || 'No user');
      return { incident: null, error: { message: 'Not authenticated', code: 'AUTH_ERROR' }, video_url: undefined, thumbnail_url: undefined, throttled: false };
    }
    incidentLogger.debug('[Incident] ✅ Auth verified for user:', authData.user.email);

    // ============================================
    // THROTTLING & GROUPING CHECK (Database-based)
    // ============================================
    const activeIncident = await getActiveIncidentForCamera(data.camera_id);

    if (activeIncident) {
      // There's an active incident for this camera - add screenshot instead of new incident
      throttleLog.debug('[Throttle] 🔄 Active incident exists:', activeIncident.incidentId,
        '- Adding screenshot instead of new incident');

      // Get current screenshot count from storage
      const currentScreenshotCount = await getIncidentScreenshotCount(activeIncident.incidentId);
      throttleLog.debug('[Throttle] Current screenshot count:', currentScreenshotCount);

      // Add screenshot if provided and under limit
      if (data.thumbnailBlob && currentScreenshotCount < DETECTION.MAX_SCREENSHOTS_PER_INCIDENT) {
        await addScreenshotToIncident(activeIncident.incidentId, data.thumbnailBlob, currentScreenshotCount + 1);
      }

      // Update peak confidence in DB if this detection is higher
      if (safeConfidence > activeIncident.confidence) {
        await updateIncidentPeakConfidence(activeIncident.incidentId, safeConfidence);
      }

      // Return the existing incident info (throttled)
      return {
        incident: { id: activeIncident.incidentId } as Incident,
        error: null,
        video_url: undefined,
        thumbnail_url: undefined,
        throttled: true // Flag indicating this was grouped with existing incident
      };
    }

    // ============================================
    // CREATE NEW INCIDENT
    // ============================================
    incidentLogger.debug('[Incident] 🆕 No active incident - creating new one...');

    const insertData = {
      camera_id: data.camera_id,
      location_id: data.location_id,
      confidence: safeConfidence,
      model_used: data.model_used || 'Violence Detection AI',
      status: 'detected',
      detected_at: new Date().toISOString(),
    };
    incidentLogger.debug('[Incident] Insert payload:', JSON.stringify(insertData));

    // Use retry wrapper to handle potential AbortError on insert
    const insertResult = await retryOnAbort(async () => {
      return await supabase
        .from('incidents')
        .insert([insertData])
        .select()
        .single();
    }, 3, 300);

    const { data: incident, error } = insertResult;

    if (error) {
      incidentLogger.error('[Incident] ❌ DB insert failed:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      // Check common issues
      if (error.code === '42501') {
        incidentLogger.error('[Incident] ⚠️ RLS policy blocked insert - run the migration: 20260121_fix_rls_policies.sql');
      } else if (error.code === '23503') {
        incidentLogger.error('[Incident] ⚠️ Foreign key violation - camera or location does not exist');
      }
      return { incident: null, error, video_url: undefined, thumbnail_url: undefined, throttled: false };
    }

    incidentLogger.debug('[Incident] ✅ Created successfully:', incident?.id);

    // Step 2: Upload video and thumbnail in background (non-blocking)
    // This allows the incident to be created immediately while uploads happen async
    if (incident?.id && (data.videoBlob || data.thumbnailBlob)) {
      // Don't await - let uploads happen in background
      uploadMediaInBackground(incident.id, data.videoBlob, data.thumbnailBlob);
    }

    // Step 3: Send WhatsApp alerts to enabled users (non-blocking)
    if (incident?.id) {
      // Get camera and location names for the alert message
      getIncidentDetails(data.camera_id, data.location_id).then(({ cameraName, locationName }) => {
        sendWhatsAppAlerts({
          incidentId: incident.id,
          cameraId: data.camera_id,
          cameraName,
          locationId: data.location_id,
          locationName,
          confidence: safeConfidence,
          timestamp: new Date().toISOString(),
        });
      });
    }

    return { incident, error: null, video_url: undefined, thumbnail_url: undefined, throttled: false };

  } catch (err: unknown) {
    const error = err as Error;
    const isAbortError = error?.name === 'AbortError' || error?.message?.includes('abort');

    if (isAbortError) {
      incidentLogger.error('[Incident] ❌ AbortError after retries - possible auth lock contention:', error?.message);
      return {
        incident: null,
        error: { message: 'Request timed out - please try again', code: 'ABORT_ERROR' },
        video_url: undefined,
        thumbnail_url: undefined,
        throttled: false
      };
    }

    incidentLogger.error('[Incident] ❌ Exception:', error?.message || err);
    return { incident: null, error: err, video_url: undefined, thumbnail_url: undefined, throttled: false };
  }
}

// Add screenshot to existing incident
async function addScreenshotToIncident(incidentId: string, thumbnailBlob: Blob, index: number): Promise<string | null> {
  const fileName = `incidents/${incidentId}/screenshot_${index}_${Date.now()}.jpg`;

  storageLogger.debug('[Storage] Adding screenshot to incident:', incidentId, 'index:', index);

  try {
    const { error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(fileName, thumbnailBlob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      storageLogger.error('[Storage] Screenshot upload failed:', error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(fileName);

    storageLogger.debug('[Storage] Screenshot added:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err: unknown) {
    storageLogger.error('[Storage] Screenshot upload exception:', (err as Error)?.message || err);
    return null;
  }
}

// Update incident peak confidence
async function updateIncidentPeakConfidence(incidentId: string, newConfidence: number) {
  incidentLogger.debug('[Incident] Updating peak confidence:', incidentId, 'to', newConfidence);

  try {
    const { error } = await supabase
      .from('incidents')
      .update({ confidence: newConfidence })
      .eq('id', incidentId);

    if (error) {
      incidentLogger.error('[Incident] Failed to update peak confidence:', error.message);
    }
  } catch (err: unknown) {
    incidentLogger.error('[Incident] Peak confidence update exception:', (err as Error)?.message || err);
  }
}

// Background upload function - uploads media and updates incident record
async function uploadMediaInBackground(incidentId: string, videoBlob?: Blob, thumbnailBlob?: Blob) {
  storageLogger.debug('[Background] Starting media upload for incident:', incidentId);

  try {
    const uploadPromises: Promise<void>[] = [];
    let video_url: string | null = null;
    let thumbnail_url: string | null = null;

    // Upload video if provided
    if (videoBlob && videoBlob.size > 0) {
      uploadPromises.push(
        uploadVideoToStorage(incidentId, videoBlob).then(url => {
          video_url = url;
        })
      );
    }

    // Upload thumbnail if provided
    if (thumbnailBlob && thumbnailBlob.size > 0) {
      uploadPromises.push(
        uploadThumbnailToStorage(incidentId, thumbnailBlob).then(url => {
          thumbnail_url = url;
        })
      );
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Update incident with URLs
    if (video_url || thumbnail_url) {
      await updateIncidentWithUrls(incidentId, video_url, thumbnail_url);
      storageLogger.debug('[Background] Media upload completed:', { incidentId, video_url, thumbnail_url });
    }
  } catch (err: unknown) {
    storageLogger.error('[Background] Media upload failed:', (err as Error)?.message || err);
  }
}

// Upload video for an existing incident (called when recording finishes)
export async function uploadIncidentVideo(incidentId: string, videoBlob: Blob): Promise<string | null> {
  incidentLogger.debug('[Incident] Uploading video for existing incident:', incidentId, 'size:', videoBlob.size);

  if (!incidentId || !videoBlob || videoBlob.size === 0) {
    incidentLogger.warn('[Incident] Invalid incidentId or videoBlob');
    return null;
  }

  try {
    const video_url = await uploadVideoToStorage(incidentId, videoBlob);

    if (video_url) {
      await updateIncidentWithUrls(incidentId, video_url, null);
      incidentLogger.debug('[Incident] Video uploaded and incident updated:', video_url);
      return video_url;
    }

    return null;
  } catch (err: unknown) {
    incidentLogger.error('[Incident] Video upload failed:', (err as Error)?.message || err);
    return null;
  }
}

// Helper to capture frame from video element as thumbnail
export function captureVideoFrame(videoElement: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(videoElement, 0, 0);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    } catch {
      resolve(null);
    }
  });
}

// Source type for camera registration
export type CameraSourceType = 'webcam' | 'rtsp' | 'upload';

/** Result type for camera operations */
interface CameraResult {
  camera: Camera | null;
  error: Error | { message: string; code?: string } | null;
}

// Auto-create or find a camera based on source type
export async function findOrCreateCamera(
  sourceType: CameraSourceType,
  sourceUrl?: string,
  customName?: string
): Promise<CameraResult> {
  cameraLogger.debug('[Camera] findOrCreateCamera called:', { sourceType, sourceUrl, customName });

  // First verify we have auth
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    cameraLogger.error('[Camera] ❌ Not authenticated:', authError?.message || 'No user');
    return { camera: null, error: { message: 'Not authenticated', code: 'AUTH_ERROR' } };
  }

  // Generate identifiers based on source type
  let name: string;
  let name_ar: string;
  let stream_url: string | null = null;

  switch (sourceType) {
    case 'webcam':
      name = customName || 'Browser Webcam';
      name_ar = 'كاميرا المتصفح';
      break;
    case 'rtsp':
      name = customName || `RTSP Camera`;
      name_ar = 'كاميرا RTSP';
      stream_url = sourceUrl || null;
      break;
    case 'upload':
      name = customName || 'Video Upload';
      name_ar = 'فيديو مرفوع';
      break;
    default:
      name = 'Unknown Camera';
      name_ar = 'كاميرا غير معروفة';
  }

  // First, try to find existing camera
  let existing: Camera | null = null;
  let findError: { message: string; code?: string } | null = null;

  if (sourceType === 'rtsp' && sourceUrl) {
    // For RTSP, match by stream URL
    const result = await supabase
      .from('cameras')
      .select('*')
      .eq('stream_url', sourceUrl)
      .limit(1)
      .maybeSingle();
    existing = result.data as Camera | null;
    findError = result.error;
  } else {
    // For webcam/upload, match by exact name
    const result = await supabase
      .from('cameras')
      .select('*')
      .eq('name', name)
      .limit(1)
      .maybeSingle();
    existing = result.data as Camera | null;
    findError = result.error;
  }

  if (existing && !findError) {
    cameraLogger.debug('[Camera] ✅ Found existing camera:', existing.id, existing.name);
    // Found existing camera, update status to online
    await supabase
      .from('cameras')
      .update({ status: 'online', updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    return { camera: { ...existing, status: 'online' }, error: null };
  }

  if (findError) {
    cameraLogger.warn('[Camera] Find error (non-critical):', findError.message, findError.code);
  }

  // Create new camera
  cameraLogger.debug('[Camera] Creating new camera:', { name, sourceType });
  const { data: newCamera, error: createError } = await supabase
    .from('cameras')
    .insert([{
      name,
      name_ar,
      stream_url,
      status: 'online',
      grid_position: 0,
      sensitivity: 0.5,
    }])
    .select()
    .single();

  if (createError) {
    cameraLogger.error('[Camera] ❌ Failed to create:', {
      message: createError.message,
      code: createError.code,
      details: createError.details,
    });
    if (createError.code === '42501') {
      cameraLogger.error('[Camera] ⚠️ RLS policy blocked insert - run migration: 20260121_fix_rls_policies.sql');
    }
  } else {
    cameraLogger.debug('[Camera] ✅ Created successfully:', newCamera?.id, newCamera?.name);
  }

  return { camera: newCamera, error: createError };
}

// Set camera status (online/offline)
export async function setCameraStatus(cameraId: string, status: 'online' | 'offline' | 'maintenance') {
  const { error } = await supabase
    .from('cameras')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', cameraId);

  return { error };
}

/** Result type for location operations */
interface LocationResult {
  location: Location | null;
  error: Error | { message: string; code?: string } | null;
}

// Get or create a default location
export async function getOrCreateDefaultLocation(): Promise<LocationResult> {
  locLog.debug('[Location] getOrCreateDefaultLocation called');

  // First verify we have auth
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    locLog.error('[Location] ❌ Not authenticated:', authError?.message || 'No user');
    return { location: null, error: { message: 'Not authenticated', code: 'AUTH_ERROR' } };
  }

  // Try to find existing default location
  const { data: existing, error: findError } = await supabase
    .from('locations')
    .select('*')
    .eq('name', 'Default Location')
    .limit(1)
    .single();

  if (existing && !findError) {
    locLog.debug('[Location] ✅ Found existing:', existing.id);
    return { location: existing, error: null };
  }

  if (findError && findError.code !== 'PGRST116') {
    // PGRST116 = "no rows returned" which is expected
    locLog.warn('[Location] Find error (non-critical):', findError.message, findError.code);
  }

  // Create default location
  locLog.debug('[Location] Creating default location...');
  const { data: newLocation, error: createError } = await supabase
    .from('locations')
    .insert([{
      name: 'Default Location',
      name_ar: 'الموقع الافتراضي',
      address: 'Not specified',
    }])
    .select()
    .single();

  if (createError) {
    locLog.error('[Location] ❌ Failed to create:', {
      message: createError.message,
      code: createError.code,
      details: createError.details,
    });
    if (createError.code === '42501') {
      locLog.error('[Location] ⚠️ RLS policy blocked insert - run migration: 20260121_fix_rls_policies.sql');
    }
  } else {
    locLog.debug('[Location] ✅ Created successfully:', newLocation?.id);
  }

  return { location: newLocation, error: createError };
}

// ============================================
// INCIDENT MEDIA RETRIEVAL
// ============================================

/** Media files for an incident */
export interface IncidentMedia {
  screenshots: string[];
  video_url: string | null;
  thumbnail_url: string | null;
}

/** Get all media files for an incident from storage */
export async function getIncidentMedia(incidentId: string): Promise<IncidentMedia> {
  const media: IncidentMedia = {
    screenshots: [],
    video_url: null,
    thumbnail_url: null,
  };

  try {
    // List all files in the incident folder
    const { data: files, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .list(`incidents/${incidentId}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (error) {
      storageLogger.error('[Storage] Failed to list incident media:', error.message);
      return media;
    }

    if (!files || files.length === 0) {
      return media;
    }

    // Categorize files
    for (const file of files) {
      const { data: urlData } = supabase.storage
        .from(RECORDINGS_BUCKET)
        .getPublicUrl(`incidents/${incidentId}/${file.name}`);

      if (file.name.includes('screenshot_')) {
        media.screenshots.push(urlData.publicUrl);
      } else if (file.name.includes('video_')) {
        media.video_url = urlData.publicUrl;
      } else if (file.name.includes('thumbnail_')) {
        media.thumbnail_url = urlData.publicUrl;
      }
    }

    storageLogger.debug('[Storage] Retrieved incident media:', {
      incidentId,
      screenshots: media.screenshots.length,
      hasVideo: !!media.video_url,
      hasThumbnail: !!media.thumbnail_url,
    });

  } catch (err: unknown) {
    storageLogger.error('[Storage] Error retrieving incident media:', (err as Error)?.message || err);
  }

  return media;
}

/** Get incidents for a specific camera with media */
export async function getCameraIncidents(cameraId: string, limit = 20): Promise<(Incident & { media?: IncidentMedia })[]> {
  try {
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*, cameras(name, name_ar), locations(name, name_ar)')
      .eq('camera_id', cameraId)
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (error) {
      incidentLogger.error('[Incidents] Failed to fetch camera incidents:', error.message);
      return [];
    }

    return (incidents as Incident[]) || [];
  } catch (err: unknown) {
    incidentLogger.error('[Incidents] Error fetching camera incidents:', (err as Error)?.message || err);
    return [];
  }
}

/** Hook to get camera incidents with realtime updates */
export function useCameraIncidents(cameraId: string | null, limit = 20) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cameraId) {
      setIncidents([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchData() {
      if (!cameraId) return;
      try {
        const data = await getCameraIncidents(cameraId, limit);
        if (mounted) {
          setIncidents(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError((err as Error)?.message || 'Failed to fetch incidents');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    setLoading(true);
    fetchData();

    // Subscribe to realtime updates for this camera's incidents
    const channel = supabase
      .channel(`camera-incidents-${cameraId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'incidents',
          filter: `camera_id=eq.${cameraId!}`,
        },
        () => {
          // Refetch on any change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [cameraId, limit]);

  return { incidents, loading, error };
}

// ============================================
// WHATSAPP ALERT NOTIFICATIONS
// ============================================

interface IncidentAlertData {
  incidentId: string;
  cameraId: string;
  cameraName: string;
  locationId: string;
  locationName: string;
  confidence: number;
  timestamp: string;
}

/**
 * Send WhatsApp alerts to all enabled users (non-blocking)
 * Called automatically when a new incident is created
 */
export async function sendWhatsAppAlerts(alertData: IncidentAlertData): Promise<void> {
  alertLogger.debug('[WhatsApp] Starting alert distribution for incident:', alertData.incidentId);

  try {
    // Get all users with WhatsApp enabled
    const { data: alertSettings, error } = await supabase
      .from('alert_settings')
      .select('user_id, whatsapp_number, min_confidence')
      .eq('whatsapp_enabled', true)
      .not('whatsapp_number', 'is', null);

    if (error) {
      alertLogger.error('[WhatsApp] Failed to get recipients:', error.message);
      return;
    }

    if (!alertSettings || alertSettings.length === 0) {
      alertLogger.debug('[WhatsApp] No users with WhatsApp alerts enabled');
      return;
    }

    // Filter by minimum confidence threshold
    const eligibleUsers = alertSettings.filter(
      (s) => alertData.confidence >= (s.min_confidence || 0)
    );

    alertLogger.debug(`[WhatsApp] Sending to ${eligibleUsers.length} users (${alertSettings.length} total enabled)`);

    // Send alerts in parallel
    const sendPromises = eligibleUsers.map(async (settings) => {
      try {
        const response = await fetch('/api/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: settings.whatsapp_number,
            userId: settings.user_id,
            incidentId: alertData.incidentId,
            cameraName: alertData.cameraName,
            locationName: alertData.locationName,
            confidence: alertData.confidence,
            timestamp: alertData.timestamp,
          }),
          keepalive: true, // Ensure request completes even if page navigates away
        });

        const result = await response.json();

        // Handle cooldown response - don't log as failure
        if (result.cooldownActive) {
          alertLogger.debug(`[WhatsApp] ⏰ Cooldown active for ${settings.whatsapp_number}, ${result.remainingSeconds}s remaining`);
          return; // Skip logging to database for cooldown
        }

        // Log alert to database
        await supabase.from('alerts').insert({
          incident_id: alertData.incidentId,
          user_id: settings.user_id,
          channel: 'whatsapp',
          sent_at: result.success ? new Date().toISOString() : null,
          failed_at: result.success ? null : new Date().toISOString(),
          error_message: result.error || null,
          message_preview: `Violence alert: ${alertData.locationName}`,
        });

        if (result.success) {
          alertLogger.debug('[WhatsApp] ✅ Alert sent to:', settings.whatsapp_number);
        } else {
          alertLogger.error('[WhatsApp] ❌ Failed to send to:', settings.whatsapp_number, result.error);
        }
      } catch (err) {
        alertLogger.error('[WhatsApp] ❌ Exception sending to:', settings.whatsapp_number, err);
      }
    });

    await Promise.all(sendPromises);
    alertLogger.debug('[WhatsApp] Alert distribution complete');
  } catch (err) {
    alertLogger.error('[WhatsApp] Alert distribution failed:', err);
  }
}

/**
 * Helper to get camera and location names for alert
 */
async function getIncidentDetails(cameraId: string, locationId: string): Promise<{ cameraName: string; locationName: string }> {
  const [cameraResult, locationResult] = await Promise.all([
    supabase.from('cameras').select('name').eq('id', cameraId).single(),
    supabase.from('locations').select('name').eq('id', locationId).single(),
  ]);

  return {
    cameraName: cameraResult.data?.name || 'Unknown Camera',
    locationName: locationResult.data?.name || 'Unknown Location',
  };
}
