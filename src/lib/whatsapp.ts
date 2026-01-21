/**
 * 4whats.net WhatsApp API Integration
 * Documentation: https://docs.4whats.net/get/Message/sendMessage
 */

const WHATSAPP_API_URL = 'https://api.4whats.net';

interface WhatsAppConfig {
  instanceId: string;
  token: string;
}

interface SendMessageResponse {
  sent: boolean;
  id?: string;
  from?: string;
  to?: string;
  timestamp?: number;
  type?: string;
  queueNumber?: number;
  error?: string;
}

interface IncidentAlert {
  incidentId: string;
  cameraName: string;
  locationName: string;
  confidence: number;
  timestamp: Date;
  screenshotUrl?: string;
}

/**
 * Get WhatsApp configuration from environment variables
 */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  const instanceId = process.env.NEXT_PUBLIC_WHATSAPP_INSTANCE_ID;
  const token = process.env.NEXT_PUBLIC_WHATSAPP_TOKEN;

  if (!instanceId || !token) {
    console.warn('[WhatsApp] Missing configuration - instanceId or token not set');
    return null;
  }

  return { instanceId, token };
}

/**
 * Format phone number for WhatsApp API
 * Removes spaces, dashes, and ensures country code
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Remove leading + if present
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Send a WhatsApp text message
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  config?: WhatsAppConfig
): Promise<SendMessageResponse> {
  const whatsappConfig = config || getWhatsAppConfig();

  if (!whatsappConfig) {
    return { sent: false, error: 'WhatsApp not configured' };
  }

  const formattedPhone = formatPhoneNumber(phone);

  // Build URL with query parameters
  const params = new URLSearchParams({
    instanceid: whatsappConfig.instanceId,
    token: whatsappConfig.token,
    phone: formattedPhone,
    body: message,
  });

  const url = `${WHATSAPP_API_URL}/sendMessage?${params.toString()}`;

  try {
    console.log('[WhatsApp] Sending message to:', formattedPhone);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();

    if (data.sent) {
      console.log('[WhatsApp] Message sent successfully:', data.id);
      return data;
    } else {
      console.error('[WhatsApp] Failed to send message:', data);
      return { sent: false, error: data.message || 'Failed to send message' };
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending message:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send a violence detection alert via WhatsApp
 */
export async function sendViolenceAlert(
  phone: string,
  alert: IncidentAlert,
  config?: WhatsAppConfig
): Promise<SendMessageResponse> {
  const timestamp = alert.timestamp.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Amman',  // Jordan timezone
  });

  // confidence is already 0-100, no need to multiply
  const confidencePercent = Math.round(alert.confidence);

  const message = `🚨 *VIOLENCE ALERT* 🚨

⚠️ Violence detected at *${alert.locationName}*

📍 *Camera:* ${alert.cameraName}
📊 *Confidence:* ${confidencePercent}%
🕐 *Time:* ${timestamp}
🆔 *Incident ID:* ${alert.incidentId.slice(0, 8)}

Please review immediately in the NexaraVision dashboard.`;

  return sendWhatsAppMessage(phone, message, config);
}

/**
 * Send alert to multiple phone numbers
 */
export async function sendAlertToMultiple(
  phones: string[],
  alert: IncidentAlert,
  config?: WhatsAppConfig
): Promise<{ phone: string; result: SendMessageResponse }[]> {
  const results = await Promise.all(
    phones.map(async (phone) => ({
      phone,
      result: await sendViolenceAlert(phone, alert, config),
    }))
  );

  const successful = results.filter(r => r.result.sent).length;
  console.log(`[WhatsApp] Sent alerts: ${successful}/${phones.length} successful`);

  return results;
}

/**
 * Test WhatsApp connection by sending a test message
 */
export async function testWhatsAppConnection(
  phone: string,
  config?: WhatsAppConfig
): Promise<SendMessageResponse> {
  const message = `✅ *NexaraVision WhatsApp Test*

Your WhatsApp alerts are configured correctly!

You will receive notifications when violence is detected by your surveillance system.`;

  return sendWhatsAppMessage(phone, message, config);
}
