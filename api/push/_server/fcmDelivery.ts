import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { PushPayload } from './pushDelivery';
import { getEventMetadata, fcmAndroidPriority } from '../../../shared/notificationTypes';

export const FCM_ENDPOINT_PREFIX = 'fcm:';
export const FCM_NATIVE_KEY = 'native-fcm';

let firebaseApp: App | null | undefined;

function getFirebaseApp(): App | null {
  if (firebaseApp !== undefined) return firebaseApp;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    firebaseApp = null;
    return firebaseApp;
  }

  try {
    const credentials = JSON.parse(raw) as Record<string, string>;
    if (!getApps().length) {
      firebaseApp = initializeApp({ credential: cert(credentials) });
    } else {
      firebaseApp = getApps()[0] ?? null;
    }
  } catch (error) {
    console.error('[push] invalid FIREBASE_SERVICE_ACCOUNT_JSON:', (error as Error).message);
    firebaseApp = null;
  }

  return firebaseApp;
}

export function isFcmConfigured(): boolean {
  return getFirebaseApp() !== null;
}

export function isFcmSubscription(endpoint: string): boolean {
  return endpoint.startsWith(FCM_ENDPOINT_PREFIX);
}

export function fcmTokenFromEndpoint(endpoint: string): string {
  return endpoint.slice(FCM_ENDPOINT_PREFIX.length);
}

function buildFcmData(payload: PushPayload): Record<string, string> {
  const data: Record<string, string> = {
    url: payload.url,
    eventType: payload.eventType,
    tag: payload.tag || payload.eventType,
  };

  for (const [key, value] of Object.entries(payload.data || {})) {
    data[key] = String(value);
  }

  return data;
}

function shouldRemoveFcmToken(errorCode?: string): boolean {
  return errorCode === 'messaging/registration-token-not-registered'
    || errorCode === 'messaging/invalid-registration-token';
}

function isUrgentGoGetRing(payload: PushPayload): boolean {
  return payload.data?.urgentGoGetRing === 'true' || payload.eventType === 'go_get_availability_request';
}

export async function sendFcmToSubscription(
  endpoint: string,
  payload: PushPayload,
): Promise<{ ok: boolean; removed: boolean }> {
  const app = getFirebaseApp();
  if (!app) return { ok: false, removed: false };

  const token = fcmTokenFromEndpoint(endpoint);
  if (!token) return { ok: false, removed: false };

  const body = String(payload.body || '').trim() || String(payload.title || '').trim() || 'New activity';
  const priorityFromPayload = payload.data?.priority;
  const priority =
    priorityFromPayload === 'silent' ||
    priorityFromPayload === 'normal' ||
    priorityFromPayload === 'important' ||
    priorityFromPayload === 'urgent'
      ? priorityFromPayload
      : getEventMetadata(payload.eventType).priority;
  const channelFromPayload = payload.data?.androidChannel;
  const channelId =
    channelFromPayload === 'messages' ||
    channelFromPayload === 'listings' ||
    channelFromPayload === 'community' ||
    channelFromPayload === 'pickup' ||
    channelFromPayload === 'account' ||
    channelFromPayload === 'staff' ||
    channelFromPayload === 'urgent'
      ? `sac_buy_nothing_${channelFromPayload}`
      : 'sac_buy_nothing_alerts';

  try {
    const urgentRing = isUrgentGoGetRing(payload);
    await getMessaging(app).send({
      token,
      notification: {
        title: payload.title || 'SacramentoBuyNothing',
        body,
      },
      data: buildFcmData(payload),
      android: {
        priority: urgentRing ? 'high' : fcmAndroidPriority(priority),
        notification: {
          channelId: urgentRing ? 'sac_buy_nothing_urgent' : channelId,
          icon: 'ic_stat_notification',
          color: '#000000',
          ...(urgentRing ? { sound: 'default', defaultVibrateTimings: true } : {}),
        },
      },
    });
    return { ok: true, removed: false };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (shouldRemoveFcmToken(code)) {
      return { ok: false, removed: true };
    }
    console.error('[push] FCM send failed:', code, (error as Error).message);
    return { ok: false, removed: false };
  }
}
