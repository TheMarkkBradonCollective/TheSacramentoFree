import { configureVapidAsync, getWebPushModuleAsync, isVapidConfigured } from './webPushLoader';

export { getVapidPublicKey } from './webPushLoader';

export interface PushSubscriptionKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  eventType?: string;
  data?: Record<string, string>;
}

export async function ensureVapidConfigured(): Promise<boolean> {
  return configureVapidAsync();
}

export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payload: PushNotificationPayload,
): Promise<{ ok: boolean; removed: boolean }> {
  if (!(await ensureVapidConfigured())) {
    return { ok: false, removed: false };
  }

  const body =
    String(payload.body || '').trim() || String(payload.title || '').trim() || 'New activity';
  const notification = JSON.stringify({
    title: payload.title || 'Sacramento Buy Nothing',
    body,
    url: payload.url,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: payload.tag || payload.eventType || 'sbn-notification',
    eventType: payload.eventType || '',
    data: payload.data || {},
  });

  const urgency =
    payload.eventType === 'director_alert' ||
    payload.eventType === 'staff_support' ||
    payload.eventType === 'staff_report' ||
    payload.eventType === 'new_message' ||
    payload.eventType === 'community_chat' ||
    payload.eventType === 'staff_chat' ||
    payload.eventType === 'message_request'
      ? 'high'
      : 'normal';

  try {
    const webpush = await getWebPushModuleAsync();
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      notification,
      { TTL: 60 * 60 * 24, urgency },
    );
    return { ok: true, removed: false };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, removed: status === 404 || status === 410 };
  }
}

/** @deprecated Use isVapidConfigured from webPushLoader after configureVapidAsync */
export function isVapidReady(): boolean {
  return isVapidConfigured();
}
