import { NextRequest, NextResponse } from 'next/server';

const WHATSAPP_API_URL = 'https://api.4whats.net';

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
        {
          error: 'WhatsApp not configured on server',
          details: {
            instanceId: instanceId ? 'SET' : 'MISSING',
            token: token ? 'SET' : 'MISSING',
          }
        },
        { status: 500 }
      );
    }

    const formattedPhone = formatPhoneNumber(phone);

    const message = `✅ *اختبار NexaraVision واتساب*

تم تكوين تنبيهات واتساب بنجاح!

ستتلقى إشعارات عند اكتشاف العنف بواسطة نظام المراقبة.

🔗 *رابط التنبيهات:*
https://nexara-vision.vercel.app/alerts

🔒 تم ربط هذا الرقم بحسابك.`;

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

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid response from WhatsApp API', details: responseText },
        { status: 500 }
      );
    }

    // 4whats API returns { sent: true } on success
    if (data.sent === true) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully',
        messageId: data.id
      });
    } else {
      console.error('[WhatsApp Test] Failed:', data);
      return NextResponse.json(
        {
          error: data.message || data.error || 'Failed to send test message',
          details: data
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[WhatsApp Test] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
