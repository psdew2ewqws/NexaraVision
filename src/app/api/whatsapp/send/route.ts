import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const WHATSAPP_API_URL = 'https://api.4whats.net';

// Lazy-initialize Supabase client to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and key are required');
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabase;
}

interface SendMessageRequest {
  phone: string;
  message: string;
}

interface IncidentAlertRequest {
  phone: string;
  userId: string;
  incidentId: string;
  cameraName: string;
  locationName: string;
  confidence: number;
  timestamp: string;
  skipCooldown?: boolean; // For test messages
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // Remove the + prefix
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  // Remove leading zeros (common mistake: +062 instead of +62)
  cleaned = cleaned.replace(/^0+/, '');
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check for required environment variables (server-side only)
    // Fall back to NEXT_PUBLIC_ vars for backwards compatibility
    const instanceId = process.env.WHATSAPP_INSTANCE_ID || process.env.NEXT_PUBLIC_WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN || process.env.NEXT_PUBLIC_WHATSAPP_TOKEN;

    if (!instanceId || !token) {
      console.error('[WhatsApp API] Missing env vars. Required: WHATSAPP_INSTANCE_ID and WHATSAPP_TOKEN (or NEXT_PUBLIC_ variants)');
      return NextResponse.json(
        { error: 'WhatsApp not configured on server. Check WHATSAPP_INSTANCE_ID and WHATSAPP_TOKEN env vars.' },
        { status: 500 }
      );
    }

    // Determine if this is a simple message or incident alert
    let message: string;
    let phone: string;

    if ('incidentId' in body) {
      // Incident alert
      const alert = body as IncidentAlertRequest;
      phone = alert.phone;

      // Check cooldown if userId is provided and not skipping cooldown
      if (alert.userId && !alert.skipCooldown) {
        const { data: settings, error: settingsError } = await getSupabase()
          .from('alert_settings')
          .select('alert_cooldown_seconds, last_alert_sent_at')
          .eq('user_id', alert.userId)
          .single();

        if (!settingsError && settings) {
          const cooldownSeconds = settings.alert_cooldown_seconds || 60;
          const lastAlertSentAt = settings.last_alert_sent_at;

          if (lastAlertSentAt) {
            const lastAlertTime = new Date(lastAlertSentAt).getTime();
            const now = Date.now();
            const elapsedSeconds = (now - lastAlertTime) / 1000;

            if (elapsedSeconds < cooldownSeconds) {
              const remainingSeconds = Math.ceil(cooldownSeconds - elapsedSeconds);
              return NextResponse.json({
                success: false,
                cooldownActive: true,
                remainingSeconds,
                message: `Alert cooldown active. Please wait ${remainingSeconds} seconds.`,
              }, { status: 429 });
            }
          }
        }
      }

      const timestamp = new Date(alert.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Amman',  // Jordan timezone
      });
      // confidence is already 0-100, no need to multiply
      const confidencePercent = Math.round(alert.confidence);

      message = `🚨 *تنبيه عنف* 🚨

⚠️ تم اكتشاف عنف في *${alert.locationName}*

📍 *الكاميرا:* ${alert.cameraName}
📊 *نسبة الثقة:* ${confidencePercent}%
🕐 *الوقت:* ${timestamp}
🆔 *رقم الحادثة:* ${alert.incidentId.slice(0, 8)}

🔗 *عرض التفاصيل:*
https://nexaravision.com/alerts

يرجى المراجعة فوراً.`;

      // Update last_alert_sent_at after successful message send (done below)
    } else {
      // Simple message
      const msg = body as SendMessageRequest;
      phone = msg.phone;
      message = msg.message;
    }

    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: phone and message' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);

    // Build URL with query parameters
    const params = new URLSearchParams({
      instanceid: instanceId,
      token: token,
      phone: formattedPhone,
      body: message,
    });

    const url = `${WHATSAPP_API_URL}/sendMessage?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.sent) {
      // Update last_alert_sent_at for incident alerts
      if ('incidentId' in body && body.userId) {
        await getSupabase()
          .from('alert_settings')
          .update({ last_alert_sent_at: new Date().toISOString() })
          .eq('user_id', body.userId);
      }

      return NextResponse.json({ success: true, ...data });
    } else {
      return NextResponse.json(
        { error: data.message || 'Failed to send message', details: data },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
