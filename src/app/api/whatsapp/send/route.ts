import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const WHATSAPP_API_URL = 'https://api.4whats.net';

// Create a Supabase client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!instanceId || !token) {
      return NextResponse.json(
        { error: 'WhatsApp not configured on server' },
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
        const { data: settings, error: settingsError } = await supabase
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
              console.log(`[WhatsApp API] Cooldown active for user ${alert.userId}. ${remainingSeconds}s remaining`);
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
      });
      const confidencePercent = Math.round(alert.confidence * 100);

      message = `🚨 *تنبيه عنف* 🚨

⚠️ تم اكتشاف عنف في *${alert.locationName}*

📍 *الكاميرا:* ${alert.cameraName}
📊 *نسبة الثقة:* ${confidencePercent}%
🕐 *الوقت:* ${timestamp}
🆔 *رقم الحادثة:* ${alert.incidentId.slice(0, 8)}

🔗 *عرض التفاصيل:*
https://nexara-vision.vercel.app/alerts

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

    console.log('[WhatsApp API] Sending message to:', formattedPhone);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.sent) {
      console.log('[WhatsApp API] Message sent successfully:', data.id);

      // Update last_alert_sent_at for incident alerts
      if ('incidentId' in body && body.userId) {
        const { error: updateError } = await supabase
          .from('alert_settings')
          .update({ last_alert_sent_at: new Date().toISOString() })
          .eq('user_id', body.userId);

        if (updateError) {
          console.error('[WhatsApp API] Failed to update last_alert_sent_at:', updateError);
        } else {
          console.log('[WhatsApp API] Updated last_alert_sent_at for user:', body.userId);
        }
      }

      return NextResponse.json({ success: true, ...data });
    } else {
      console.error('[WhatsApp API] Failed to send:', data);
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
