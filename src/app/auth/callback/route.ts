import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Get the token and type from URL params
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email' | null;
  const next = searchParams.get('next') ?? '/';

  // For magic link or OTP-based confirmation
  if (token_hash && type) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name);
          },
        },
      }
    );

    // Exchange the token for a session
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Successfully confirmed - redirect to dashboard or next URL
      const redirectUrl = type === 'recovery' ? '/settings' : next;
      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }

    // If there's an error, redirect to login with error message
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed&message=${encodeURIComponent(error.message)}`);
  }

  // Handle OAuth callback (code exchange)
  const code = searchParams.get('code');
  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('OAuth callback error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // No valid params - redirect to home
  return NextResponse.redirect(`${origin}/login`);
}
