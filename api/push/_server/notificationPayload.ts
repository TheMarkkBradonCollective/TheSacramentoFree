export const PUSH_ICON_PATH = '/icon-192.png';
export const PUSH_BADGE_PATH = '/icon-192.png';

export interface NotificationPayloadInput {
  title: string;
  body: string;
  url: string;
  tag?: string;
  eventType: string;
  data?: Record<string, string>;
}

const HIGH_URGENCY_EVENTS = new Set<string>([
  'director_alert',
  'staff_support',
  'staff_report',
  'support_reply',
  'new_message',
  'message_request',
  'message_request_accepted',
  'item_claimed',
  'claim_request',
  'account_update',
  'pickup_scheduled',
  'pickup_reminder',
]);

export function webPushOptionsFor(eventType: string): { TTL: number; urgency: 'high' | 'normal' } {
  return {
    TTL: 60 * 60 * 24,
    urgency: HIGH_URGENCY_EVENTS.has(eventType) ? 'high' : 'normal',
  };
}

export function buildNotificationJson(payload: NotificationPayloadInput): string {
  const body =
    String(payload.body || '').trim() || String(payload.title || '').trim() || 'New community activity';
  return JSON.stringify({
    title: payload.title || 'Sacramento Buy Nothing',
    body,
    url: payload.url,
    icon: PUSH_ICON_PATH,
    badge: PUSH_BADGE_PATH,
    tag: payload.tag || payload.eventType,
    eventType: payload.eventType,
    data: payload.data || {},
  });
}

export function shouldRemoveSubscription(err: unknown): boolean {
  const status = (err as { statusCode?: number }).statusCode;
  if (status === 404 || status === 410) return true;
  if (status === 401 || status === 403) {
    const message = String((err as { body?: string }).body || (err as Error).message || '').toLowerCase();
    return message.includes('vapid') || message.includes('credentials') || message.includes('unauthorized');
  }
  return false;
}
