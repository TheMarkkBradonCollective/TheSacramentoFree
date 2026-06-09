import { configureVapidAsync, getWebPushModule, isVapidConfigured } from './webPushLoader';

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

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag || payload.eventType || 'sbn-notification',
    eventType: payload.eventType || '',
    data: payload.data || {},
  });

  try {
    const webpush = getWebPushModule();
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

/** @deprecated Use isVapidConfigured from webPushLoader after configureVapidAsync */
export function isVapidReady(): boolean {
  return isVapidConfigured();
}
