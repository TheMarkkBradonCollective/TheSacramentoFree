import { supabase } from '../supabase';
import type { NotificationPreferences, NearbyRadiusMiles } from '../types';

const SW_PATH = '/service-worker.js';
const VAPID_CACHE_KEY = 'sbn_vapid_public_key_v1';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function getVapidPublicKey(): Promise<string> {
  const envKey = (import.meta as { env?: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  const cached = localStorage.getItem(VAPID_CACHE_KEY);
  if (cached) return cached;

  const res = await fetch('/api/push/vapid-public-key');
  if (!res.ok) throw new Error('Push notifications are not configured on this server');
  const json = await res.json();
  localStorage.setItem(VAPID_CACHE_KEY, json.publicKey);
  return json.publicKey;
}

export type PushPermissionState = NotificationPermission | 'unsupported';

export function getPushPermissionState(): PushPermissionState {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  return registration;
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to enable notifications');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await registerPushServiceWorker();
  if (!registration) return null;

  const publicKey = await getVapidPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not save push subscription');
  }

  return subscription;
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ endpoint: subscription?.endpoint }),
  });

  if (subscription) await subscription.unsubscribe();
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (getPushPermissionState() !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return subscribeToPushNotifications();

  const token = await getAccessToken();
  if (!token) return existing;

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      subscription: existing.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Could not save push subscription on the server.');
  }

  return existing;
}

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'new_message'
  | 'new_comment'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'nearby_item'
  | 'announcement'
  | 'account_update';

export interface SendPushOptions {
  eventType: PushEventType;
  title: string;
  body: string;
  url: string;
  tag?: string;
  recipientUserIds?: string[];
  excludeUserIds?: string[];
  listingId?: string;
  conversationId?: string;
  requestId?: string;
  category?: string;
  neighborhood?: string;
  itemLat?: number;
  itemLng?: number;
  cities?: string[];
  data?: Record<string, string>;
}

export async function sendTestPushNotification(): Promise<{ ok: boolean; errorMessage?: string }> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, errorMessage: 'Sign in to test notifications.' };
  }

  if (getPushPermissionState() !== 'granted') {
    return { ok: false, errorMessage: 'Allow notifications in your browser, then try again.' };
  }

  try {
    await ensurePushSubscription();
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not refresh push subscription.',
    };
  }

  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404) {
        return {
          ok: false,
          errorMessage:
            'Push API server is not reachable. Run npm run dev (starts Vite + push server) or deploy with npm start.',
        };
      }
      return { ok: false, errorMessage: json.error || 'Could not send test notification.' };
    }
    if (json.sent === 0) {
      return {
        ok: false,
        errorMessage:
          json.error ||
          'No push subscription found on this device. Enable notifications first, then try again.',
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorMessage:
        err instanceof Error
          ? err.message
          : 'Could not reach the push API. Make sure the push server is running.',
    };
  }
}

export async function sendPushNotification(options: SendPushOptions): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  await fetch('/api/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  }).catch((err) => {
    console.warn('[push] send failed:', err);
  });
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messages: true,
  claims: true,
  gifts: true,
  comments: true,
  nearbyListings: true,
  requests: true,
  announcements: true,
  pickupReminders: true,
  newListings: true,
  accountUpdates: true,
  nearbyRadiusMiles: 10,
  followedCategories: [],
};

function normalizePreferencesRow(row: Record<string, unknown>): NotificationPreferences {
  return {
    enabled: row.enabled !== false,
    messages: row.messages !== false,
    claims: row.claims !== false,
    gifts: row.gifts !== false,
    comments: row.comments !== false,
    nearbyListings: row.nearbyListings !== false,
    requests: row.requests !== false,
    announcements: row.announcements !== false,
    pickupReminders: row.pickupReminders !== false,
    newListings: row.newListings !== false,
    accountUpdates: row.accountUpdates !== false,
    nearbyRadiusMiles: (Number(row.nearbyRadiusMiles) || 10) as NearbyRadiusMiles,
    followedCategories: Array.isArray(row.followedCategories) ? (row.followedCategories as string[]) : [],
  };
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('userId', userId)
    .maybeSingle();

  if (error || !data) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  return normalizePreferencesRow(data as Record<string, unknown>);
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: NotificationPreferences,
): Promise<boolean> {
  const payload = {
    userId,
    ...prefs,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('notification_preferences').upsert(payload, { onConflict: 'userId' });
  return !error;
}

export function listenForNotificationClicks(handler: (url: string) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
      handler(event.data.url);
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => navigator.serviceWorker.removeEventListener('message', onMessage);
}
