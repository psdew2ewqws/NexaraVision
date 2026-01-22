'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

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

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    return null;
  }, [supabase]);

  // Refresh profile (can be called externally)
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

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
            console.log('[Auth] Profile realtime update:', payload.eventType);

            if (payload.eventType === 'UPDATE') {
              const newProfile = payload.new as Profile;
              setProfile(newProfile);

              // If role changed, log it (use ref to avoid stale closure)
              const currentProfile = profileRef.current;
              if (currentProfile && currentProfile.role !== newProfile.role) {
                console.log(`[Auth] Role changed: ${currentProfile.role} -> ${newProfile.role}`);
              }
            } else if (payload.eventType === 'DELETE') {
              // Profile deleted - sign out
              console.log('[Auth] Profile deleted, signing out');
              signOut();
            }
          }
        )
        .subscribe((status) => {
          console.log('[Auth] Profile subscription status:', status);
        });
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
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      }

      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] Auth state changed:', event);
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }, [supabase]);

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
