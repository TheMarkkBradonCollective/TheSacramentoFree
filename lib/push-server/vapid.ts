import webpush from 'web-push';

let configured = false;

export function ensureVapidConfigured(): boolean {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.VAPID_PRIVATE_KEY || '';
  const subject = process.env.VAPID_SUBJECT || process.env.APP_URL || 'mailto:support@sacbuynothing.org';

  if (!publicKey || !privateKey) return false;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
}

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

export async function sendWebPush(
  subscription: PushSubscriptionKeys,
  payload: PushNotificationPayload,
): Promise<{ ok: boolean; removed: boolean }> {
  if (!ensureVapidConfigured()) {
    return { ok: false, removed: false };
  }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag || payload.eventType || 'sbn-notification',
    eventType: payload.eventType || '',
    data: payload.data || {},
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      notification,
    );
    return { ok: true, removed: false };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, removed: status === 404 || status === 410 };
  }
}
