'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';
import { authLogger as log } from '@/lib/logger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  // Role helpers
  isAdmin: boolean;
  isManager: boolean;
  isGuard: boolean;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to access current profile in callbacks without causing re-subscriptions
  const profileRef = useRef<Profile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const supabase = getSupabase();

  // Fetch user profile with retry logic
  const fetchProfile = useCallback(async (userId: string, retryCount = 0): Promise<Profile | null> => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      log.debug(`Fetching profile for user ${userId} (attempt ${retryCount + 1})`);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        log.error('Profile fetch error:', error.message, error.code);

        // Retry on network errors or temporary failures
        if (retryCount < maxRetries && (error.code === 'PGRST301' || error.message.includes('fetch'))) {
          log.debug(`Retrying profile fetch in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return fetchProfile(userId, retryCount + 1);
        }

        // If profile doesn't exist, it might need to be created
        if (error.code === 'PGRST116') {
          log.debug('Profile not found, may need to be created');
        }

        return null;
      }

      if (data) {
        log.debug('Profile loaded successfully:', data.email);
        setProfile(data as Profile);
        return data as Profile;
      }

      return null;
    } catch (err) {
      log.error('Profile fetch exception:', err);

      // Retry on exceptions
      if (retryCount < maxRetries) {
        log.debug(`Retrying after exception in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchProfile(userId, retryCount + 1);
      }

      return null;
    }
  }, [supabase]);

  // Refresh profile (can be called externally)
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- user?.id is correct narrow dependency
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  // Sign out - defined early so it can be used in realtime subscription
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [supabase]);

  // Setup realtime subscription for profile changes
  useEffect(() => {
    if (!user?.id) return;

    let profileChannel: RealtimeChannel;

    const setupRealtimeProfile = () => {
      profileChannel = supabase
        .channel(`profile-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            log.debug('Profile realtime update:', payload.eventType);

            if (payload.eventType === 'UPDATE') {
              const newProfile = payload.new as Profile;
              setProfile(newProfile);

              // If role changed, log it (use ref to avoid stale closure)
              const currentProfile = profileRef.current;
              if (currentProfile && currentProfile.role !== newProfile.role) {
                log.debug(`Role changed: ${currentProfile.role} -> ${newProfile.role}`);
              }
            } else if (payload.eventType === 'DELETE') {
              // Profile deleted - sign out
              log.debug('Profile deleted, signing out');
              signOut();
            }
          }
        )
        .subscribe();
    };

    setupRealtimeProfile();

    return () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [user?.id, supabase, signOut]);

  // Initial session and auth state listener
  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        log.debug('Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          log.error('Error getting session:', error.message);
        }

        if (!isMounted) return;

        log.debug('Session retrieved:', session ? 'valid' : 'none');
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          log.debug('User found, fetching profile for:', session.user.email);
          const profile = await fetchProfile(session.user.id);
          if (!profile && isMounted) {
            log.warn('Profile not loaded for user:', session.user.email);
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (err) {
        log.error('Exception in getInitialSession:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        log.debug('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Profile will be updated via realtime subscription
    return { error };
  };

  // Role helpers
  const isAdmin = profile?.role === 'admin';
  const isManager = profile?.role === 'manager';
  const isGuard = profile?.role === 'guard';

  const hasRole = useCallback((roles: UserRole | UserRole[]) => {
    if (!profile) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(profile.role);
  }, [profile]);

  const canAccess = useCallback((requiredRoles: UserRole[]) => {
    if (!profile) return false;
    // Admin can access everything
    if (profile.role === 'admin') return true;
    return requiredRoles.includes(profile.role);
  }, [profile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        isAdmin,
        isManager,
        isGuard,
        hasRole,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for role-based access control
export function useRequireRole(requiredRoles: UserRole | UserRole[]) {
  const { profile, loading, canAccess } = useAuth();
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return {
    loading,
    hasAccess: canAccess(roles),
    role: profile?.role,
  };
}
