import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Check if a WhatsApp number is already in use by another user
 * POST /api/whatsapp/check-duplicate
 * Body: { phone: string, excludeUserId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, excludeUserId } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean the phone number for comparison
    const cleanedPhone = phone.replace(/[\s-]/g, '');

    // Use service role to check all users
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query to find if this phone number exists for another user
    let query = supabase
      .from('alert_settings')
      .select('user_id')
      .eq('whatsapp_number', cleanedPhone);

    // Exclude current user if provided
    if (excludeUserId) {
      query = query.neq('user_id', excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[WhatsApp] Check duplicate error:', error);
      return NextResponse.json(
        { error: 'Failed to check phone number' },
        { status: 500 }
      );
    }

    const isDuplicate = data && data.length > 0;

    return NextResponse.json({
      isDuplicate,
      message: isDuplicate
        ? 'This phone number is already registered by another user'
        : 'Phone number is available',
    });
  } catch (error) {
    console.error('[WhatsApp] Check duplicate error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
