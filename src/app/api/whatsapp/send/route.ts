import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = 'https://api.4whats.net';

interface SendMessageRequest {
  phone: string;
  message: string;
}

interface IncidentAlertRequest {
  phone: string;
  incidentId: string;
  cameraName: string;
  locationName: string;
  confidence: number;
  timestamp: string;
}

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
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

      const timestamp = new Date(alert.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const confidencePercent = Math.round(alert.confidence * 100);

      message = `🚨 *VIOLENCE ALERT* 🚨

⚠️ Violence detected at *${alert.locationName}*

📍 *Camera:* ${alert.cameraName}
📊 *Confidence:* ${confidencePercent}%
🕐 *Time:* ${timestamp}
🆔 *Incident ID:* ${alert.incidentId.slice(0, 8)}

Please review immediately in the NexaraVision dashboard.`;
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
