import {
  buildNotificationJson,
  shouldRemoveSubscription,
  webPushOptionsFor,
} from './notificationPayload';
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

  const notification = buildNotificationJson({
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
    eventType: payload.eventType || 'account_update',
    data: payload.data,
  });

  try {
    const webpush = await getWebPushModuleAsync();
    const options = webPushOptionsFor(payload.eventType || 'account_update');
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        notification,
        options,
      );
    } catch {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        notification,
      );
    }
    return { ok: true, removed: false };
  } catch (err: unknown) {
    return { ok: false, removed: shouldRemoveSubscription(err) };
  }
}

/** @deprecated Use isVapidConfigured from webPushLoader after configureVapidAsync */
export function isVapidReady(): boolean {
  return isVapidConfigured();
}
