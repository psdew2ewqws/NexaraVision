import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = 'https://api.4whats.net';

function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const instanceId = process.env.WHATSAPP_INSTANCE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!instanceId || !token) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Please set WHATSAPP_INSTANCE_ID and WHATSAPP_TOKEN.' },
        { status: 500 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);

    const message = `✅ *NexaraVision WhatsApp Test*

Your WhatsApp alerts are configured correctly!

You will receive notifications when violence is detected by your surveillance system.

🔒 This number is now linked to your account.`;

    const params = new URLSearchParams({
      instanceid: instanceId,
      token: token,
      phone: formattedPhone,
      body: message,
    });

    const url = `${WHATSAPP_API_URL}/sendMessage?${params.toString()}`;

    console.log('[WhatsApp Test] Sending test to:', formattedPhone);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.sent) {
      console.log('[WhatsApp Test] Success:', data.id);
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully',
        messageId: data.id
      });
    } else {
      console.error('[WhatsApp Test] Failed:', data);
      return NextResponse.json(
        { error: 'Failed to send test message', details: data },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
