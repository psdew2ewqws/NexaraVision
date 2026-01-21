import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
