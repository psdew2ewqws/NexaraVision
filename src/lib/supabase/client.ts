import { createBrowserClient } from '@supabase/ssr';

// Placeholder values for build time - actual values come from env at runtime
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export function createClient() {
  // Only create client if we have real credentials (runtime, not build time)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // During build, return a dummy client that will be replaced at runtime
    console.warn('[Supabase] Creating client with placeholder credentials (build time)');
  }

  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        // Keep session refresh enabled but manage lock contention via retry logic
        autoRefreshToken: true,
        // Keep session in memory to reduce storage access
        persistSession: true,
        // Detect session from URL for OAuth flows
        detectSessionInUrl: true,
      },
    }
  );
}

// Singleton for client-side usage
let client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!client) {
    client = createClient();
  }
  return client;
}
