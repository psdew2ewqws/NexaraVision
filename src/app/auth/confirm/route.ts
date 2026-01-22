import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// This route handles email confirmation links from Supabase
// URL format: /auth/confirm?token_hash=xxx&type=signup
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'signup' | 'recovery' | 'invite' | 'email' | null;
  const next = searchParams.get('next') ?? '/';

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
      // Determine redirect based on confirmation type
      let redirectPath = next;

      if (type === 'signup') {
        // Email confirmed - redirect to login with success message
        redirectPath = '/login?confirmed=true';
      } else if (type === 'recovery') {
        // Password recovery - redirect to settings/password reset
        redirectPath = '/settings?reset=true';
      } else if (type === 'email') {
        // Email change confirmed
        redirectPath = '/settings?email_updated=true';
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }

    // Error during confirmation
    console.error('Email confirmation error:', error.message);

    // Provide user-friendly error messages
    let errorMessage = 'Confirmation failed';
    if (error.message.includes('expired')) {
      errorMessage = 'Confirmation link has expired. Please request a new one.';
    } else if (error.message.includes('invalid')) {
      errorMessage = 'Invalid confirmation link. Please request a new one.';
    }

    return NextResponse.redirect(
      `${origin}/login?error=confirmation_failed&message=${encodeURIComponent(errorMessage)}`
    );
  }

  // No valid token - redirect to login
  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
