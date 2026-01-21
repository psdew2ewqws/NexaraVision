'use client';

import { useState, useEffect, useMemo } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface UseProfilesOptions {
  searchQuery?: string;
}

interface UseProfilesReturn {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  createProfile: (data: Partial<Profile> & { email: string }) => Promise<{ error: Error | null }>;
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  deleteProfile: (id: string) => Promise<{ error: Error | null }>;
  refreshProfiles: () => void;
  stats: {
    total: number;
    admins: number;
    managers: number;
    guards: number;
  };
}

// Get supabase client once at module level
const supabase = getSupabase();

export function useProfiles(options: UseProfilesOptions = {}): UseProfilesReturn {
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { searchQuery = '' } = options;

  // Fetch profiles - only runs on mount and refresh
  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setAllProfiles([]);
        } else {
          setAllProfiles(data || []);
          setError(null);
        }
      } catch {
        if (!mounted) return;
        setError('Failed to fetch profiles');
        setAllProfiles([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    fetchData();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);

  // Client-side search filter
  const profiles = useMemo(() => {
    if (!searchQuery.trim()) return allProfiles;

    const search = searchQuery.toLowerCase();
    return allProfiles.filter(
      (p) =>
        p.email.toLowerCase().includes(search) ||
        p.full_name?.toLowerCase().includes(search) ||
        p.full_name_ar?.includes(searchQuery)
    );
  }, [allProfiles, searchQuery]);

  // Stats from all profiles
  const stats = useMemo(() => ({
    total: allProfiles.length,
    admins: allProfiles.filter((p) => p.role === 'admin').length,
    managers: allProfiles.filter((p) => p.role === 'manager').length,
    guards: allProfiles.filter((p) => p.role === 'guard').length,
  }), [allProfiles]);

  // CRUD - these don't need useCallback since supabase is stable
  async function createProfile(data: Partial<Profile> & { email: string }) {
    const { error: createError } = await supabase.from('profiles').insert({
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (!createError) {
      // Refresh the list
      setRefreshKey((k) => k + 1);
    }

    return { error: createError || null };
  }

  async function updateProfile(id: string, updates: Partial<Profile>) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!updateError) {
      setRefreshKey((k) => k + 1);
    }

    return { error: updateError || null };
  }

  async function deleteProfile(id: string) {
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (!deleteError) {
      setRefreshKey((k) => k + 1);
    }

    return { error: deleteError || null };
  }

  function refreshProfiles() {
    setRefreshKey((k) => k + 1);
  }

  return {
    profiles,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    refreshProfiles,
    stats,
  };
}
