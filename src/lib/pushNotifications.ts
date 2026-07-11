import { supabase } from '../supabase';
import { apiUrl } from './appOrigin';
import {
  fcmEndpointForToken,
  FCM_NATIVE_KEY,
  getNativePushPermissionState,
  getStoredFcmToken,
  registerNativePushToken,
  unregisterNativePushToken,
} from './nativePush';
import { isNativeApp } from './nativePlatform';
import type { NotificationPreferences, NearbyRadiusMiles } from '../types';

const SW_PATH = '/service-worker.js';
const PUSH_CELEBRATION_DISMISSED_KEY = 'sbn_push_celebration_prompt_dismissed_v1';
const VAPID_CACHE_KEY = 'sbn_vapid_public_key_v1';

const OPTIONAL_PREF_COLUMNS = ['communityChat', 'staffChat'] as const;

function isMissingPrefColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    error.code === 'PGRST204' ||
    message.includes('communitychat') ||
    message.includes('staffchat') ||
    message.includes('schema cache')
  );
}

function prefsWithoutOptionalColumns(prefs: NotificationPreferences): NotificationPreferences {
  const next = { ...prefs };
  for (const key of OPTIONAL_PREF_COLUMNS) {
    delete (next as Record<string, unknown>)[key];
  }
  return next;
}

export const NOTIFICATION_SESSION_CLEARED_EVENT = 'sbn-notification-session-cleared';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

function mapPushSubscriptionError(error: { code?: string; message?: string }): string {
  const message = error.message || '';
  if (error.code === '42P01' || message.includes('push_subscriptions')) {
    return 'Push tables are missing in Supabase. Run supabase-complete.sql in the SQL editor, then try again.';
  }
  if (error.code === '23503') {
    return 'Your profile is not synced yet. Open Profile, save your settings once, then enable notifications again.';
  }
  if (error.code === '42501' || message.toLowerCase().includes('permission denied')) {
    return 'Database blocked saving your subscription. Run supabase-complete.sql and confirm you are signed in.';
  }
  return message || 'Could not save push subscription.';
}

async function savePushSubscriptionDirect(
  json: { endpoint: string; keys: { p256dh: string; auth: string } },
  userId: string,
): Promise<void> {
  const row = {
    id: crypto.randomUUID(),
    userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent.slice(0, 512),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error) {
    throw new Error(mapPushSubscriptionError(error));
  }

  await ensureNotificationPreferencesOnSubscribe(userId);
}

async function ensureNotificationPreferencesOnSubscribe(userId: string): Promise<void> {
  const updatedAt = new Date().toISOString();
  const { data: existing, error: readError } = await supabase
    .from('notification_preferences')
    .select('userId')
    .eq('userId', userId)
    .maybeSingle();

  if (readError?.code === '42P01') return;

  if (existing) {
    const { error } = await supabase
      .from('notification_preferences')
      .update({ enabled: true, updatedAt })
      .eq('userId', userId);
    if (error && error.code !== '42P01') {
      console.warn('[push] notification_preferences update:', error.message);
    }
    return;
  }

  let { error } = await supabase.from('notification_preferences').insert({
    userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    updatedAt,
  });
  if (error && isMissingPrefColumnError(error)) {
    ({ error } = await supabase.from('notification_preferences').insert({
      userId,
      ...prefsWithoutOptionalColumns(DEFAULT_NOTIFICATION_PREFERENCES),
      updatedAt,
    }));
  }
  if (error && error.code !== '42P01') {
    console.warn('[push] notification_preferences insert:', error.message);
  }
}

async function persistNativePushSubscription(token: string, userId: string): Promise<void> {
  const endpoint = fcmEndpointForToken(token);
  const tokenAuth = await getAccessToken();
  if (tokenAuth) {
    const res = await fetch(apiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: {
          endpoint,
          keys: { p256dh: FCM_NATIVE_KEY, auth: FCM_NATIVE_KEY },
        },
        userAgent: navigator.userAgent.slice(0, 512),
      }),
    });
    const body = await readJsonResponse(res);
    if (res.ok) return;

    const serverError = typeof body.error === 'string' ? body.error : '';
    if (res.status >= 500 || serverError.includes('SERVICE_ROLE_KEY')) {
      console.warn('[push] server subscribe unavailable, saving native token directly:', serverError);
      await savePushSubscriptionDirect(
        { endpoint, keys: { p256dh: FCM_NATIVE_KEY, auth: FCM_NATIVE_KEY } },
        userId,
      );
      return;
    }

    throw new Error(serverError || 'Could not save push subscription on the server.');
  }

  await savePushSubscriptionDirect(
    { endpoint, keys: { p256dh: FCM_NATIVE_KEY, auth: FCM_NATIVE_KEY } },
    userId,
  );
}

async function persistPushSubscription(subscription: PushSubscription, userId: string): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid push subscription from this browser.');
  }

  const token = await getAccessToken();
  if (token) {
    const res = await fetch(apiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: json,
        userAgent: navigator.userAgent.slice(0, 512),
      }),
    });
    const body = await readJsonResponse(res);
    if (res.ok) return;

    const serverError = typeof body.error === 'string' ? body.error : '';
    if (res.status >= 500 || serverError.includes('SERVICE_ROLE_KEY')) {
      console.warn('[push] server subscribe unavailable, saving directly:', serverError);
      await savePushSubscriptionDirect(
        { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
        userId,
      );
      return;
    }

    throw new Error(serverError || 'Could not save push subscription on the server.');
  }

  await savePushSubscriptionDirect(
    { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
    userId,
  );
}

async function removePushSubscriptionDirect(userId: string, endpoint?: string): Promise<void> {
  let query = supabase.from('push_subscriptions').delete().eq('userId', userId);
  if (endpoint) query = query.eq('endpoint', endpoint);
  const { error } = await query;
  if (error && error.code !== '42P01') {
    throw new Error(mapPushSubscriptionError(error));
  }
}

async function removePushSubscription(userId: string, endpoint?: string): Promise<void> {
  const token = await getAccessToken();
  if (token) {
    const res = await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint }),
    });
    const body = await readJsonResponse(res);
    if (res.ok) return;

    const serverError = typeof body.error === 'string' ? body.error : '';
    if (res.status >= 500 || serverError.includes('SERVICE_ROLE_KEY')) {
      console.warn('[push] server unsubscribe unavailable, removing directly:', serverError);
      await removePushSubscriptionDirect(userId, endpoint);
      return;
    }

    throw new Error(serverError || 'Could not remove push subscription on the server.');
  }

  await removePushSubscriptionDirect(userId, endpoint);
}

async function clearStaleBrowserSubscription(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // ignore — browser may not have an active subscription
  }
}

async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch(apiUrl('/api/push/vapid-public-key'));
    if (res.ok) {
      const json = (await res.json()) as { publicKey?: string };
      const serverKey = String(json.publicKey || '').trim();
      if (serverKey) {
        const cached = localStorage.getItem(VAPID_CACHE_KEY);
        if (cached && cached !== serverKey) {
          localStorage.setItem(VAPID_CACHE_KEY, serverKey);
          await clearStaleBrowserSubscription();
        } else {
          localStorage.setItem(VAPID_CACHE_KEY, serverKey);
        }
        return serverKey;
      }
    }
  } catch {
    // fall through to build-time key
  }

  const envKey = (import.meta as { env?: Record<string, string> }).env?.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  throw new Error('Push notifications are not configured on this server');
}

export type PushPermissionState = NotificationPermission | 'unsupported';

export function getPushPermissionState(): PushPermissionState {
  if (isNativeApp()) {
    try {
      const stored = localStorage.getItem('sbn_native_push_permission_v1');
      if (stored === 'granted' || stored === 'denied') return stored;
    } catch {
      // ignore
    }
    return getStoredFcmToken() ? 'granted' : 'default';
  }

  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function refreshNativePushPermissionState(): Promise<PushPermissionState> {
  if (!isNativeApp()) return getPushPermissionState();
  const state = await getNativePushPermissionState();
  try {
    localStorage.setItem('sbn_native_push_permission_v1', state);
  } catch {
    // ignore
  }
  return state;
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.register(SW_PATH);
  await navigator.serviceWorker.ready;
  return registration;
}

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  const userId = await getSessionUserId();
  if (!userId) throw new Error('Sign in to enable notifications');

  if (isNativeApp()) {
    const token = await registerNativePushToken();
    if (!token) return null;
    await persistNativePushSubscription(token, userId);
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await registerPushServiceWorker();
  if (!registration) return null;

  const publicKey = await getVapidPublicKey();
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await persistPushSubscription(existing, userId);
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await persistPushSubscription(subscription, userId);
  return subscription;
}

export async function detachPushSubscriptionForUser(userId: string): Promise<void> {
  if (!userId) return;

  if (isNativeApp()) {
    const token = getStoredFcmToken();
    await removePushSubscription(userId, token ? fcmEndpointForToken(token) : undefined);
    await unregisterNativePushToken();
    return;
  }

  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  await removePushSubscription(userId, subscription?.endpoint);
  if (subscription) await subscription.unsubscribe();
}

export async function unsubscribeFromPushNotifications(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;
  await detachPushSubscriptionForUser(userId);
}

function broadcastNotificationSessionCleared(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_SESSION_CLEARED_EVENT));
}

/**
 * Wipe all notification session data on logout: device push subscription,
 * notification-related localStorage, and in-memory UI state (via event).
 */
export async function clearNotificationDataOnLogout(userId?: string | null): Promise<void> {
  const uid = userId || (await getSessionUserId());

  try {
    if (uid) {
      await detachPushSubscriptionForUser(uid);
    } else if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();
    }
  } catch {
    // ignore — session may already be clearing
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(PUSH_CELEBRATION_DISMISSED_KEY);
    }
  } catch {
    // ignore
  }

  broadcastNotificationSessionCleared();
}

/** @deprecated Use clearNotificationDataOnLogout */
export const clearPushSessionOnLogout = clearNotificationDataOnLogout;

export function preferencesEqual(a: NotificationPreferences, b: NotificationPreferences): boolean {
  const keys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES) as (keyof NotificationPreferences)[];
  for (const key of keys) {
    const av = a[key];
    const bv = b[key];
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length || av.some((value, index) => value !== bv[index])) return false;
      continue;
    }
    if (av !== bv) return false;
  }
  return true;
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (isNativeApp()) {
    if ((await refreshNativePushPermissionState()) !== 'granted') return null;
    const userId = await getSessionUserId();
    if (!userId) return null;
    const token = getStoredFcmToken() || (await registerNativePushToken());
    if (!token) return null;
    await persistNativePushSubscription(token, userId);
    return null;
  }

  if (getPushPermissionState() !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return subscribeToPushNotifications();

  const userId = await getSessionUserId();
  if (!userId) return existing;

  await persistPushSubscription(existing, userId);
  return existing;
}

export type PushEventType =
  | 'new_item'
  | 'new_request'
  | 'item_claimed'
  | 'item_gifted'
  | 'pickup_scheduled'
  | 'pickup_reminder'
  | 'on_the_way'
  | 'new_message'
  | 'community_chat'
  | 'staff_chat'
  | 'message_request'
  | 'message_request_accepted'
  | 'new_comment'
  | 'listing_upvote'
  | 'listing_downvote'
  | 'listing_approved'
  | 'listing_denied'
  | 'listing_expiring'
  | 'nearby_item'
  | 'nearby_request'
  | 'claim_request'
  | 'request_fulfilled'
  | 'announcement'
  | 'app_update'
  | 'account_update'
  | 'support_reply'
  | 'staff_support'
  | 'staff_report'
  | 'director_alert'
  | 'saved_item_update'
  | 'listing_status'
  | 'go_get_availability_request'
  | 'go_get_available_now'
  | 'go_get_schedule_proposed'
  | 'go_get_schedule_confirmed'
  | 'go_get_ready_reminder'
  | 'go_get_fulfiller_ready'
  | 'go_get_started'
  | 'go_get_arrived'
  | 'go_get_completed'
  | 'go_get_cancelled'
  | 'violation_filed'
  | 'violation_decision'
  | 'account_locked'
  | 'appeal_decision'
  | 'contactless_pickup_arrived'
  | 'contactless_pickup_left';

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
  minStaffRank?: number;
  data?: Record<string, string>;
}

function formatPushApiError(text: string, status: number): string {
  if (text.includes('FUNCTION_INVOCATION_FAILED')) {
    return 'Push server crashed on Vercel (FUNCTION_INVOCATION_FAILED). Redeploy the app, then turn notifications off and on again.';
  }
  if (text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // fall through
    }
  }
  return text.slice(0, 220) || `Push API returned ${status}`;
}

async function readJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: formatPushApiError(text, res.status) };
  }
}

export async function sendTestPushNotification(): Promise<{
  ok: boolean;
  errorMessage?: string;
}> {
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

  const registration = await navigator.serviceWorker.ready;
  const browserSubscription = await registration.pushManager.getSubscription();

  try {
    const res = await fetch(apiUrl('/api/push/test'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: browserSubscription?.toJSON() || null,
      }),
    });
    const json = await readJsonResponse(res);
    const serverError =
      typeof json.error === 'string' ? json.error : `Push API returned ${res.status}`;

    if (!res.ok) {
      return { ok: false, errorMessage: serverError };
    }

    if (Number(json.sent) === 0) {
      return {
        ok: false,
        errorMessage:
          serverError ||
          'Server push did not deliver. Turn notifications off and on again, then retry.',
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not reach the push API.',
    };
  }
}

export const DIRECTOR_BROADCAST_DEFAULT_TITLE = 'SacramentoBuyNothing';
export const DIRECTOR_BROADCAST_DEFAULT_BODY = 'This is a test notification!';

export async function sendDirectorBroadcastTest(params: {
  title: string;
  body: string;
}): Promise<{
  ok: boolean;
  errorMessage?: string;
  sent?: number;
  userCount?: number;
}> {
  const token = await getAccessToken();
  if (!token) {
    return { ok: false, errorMessage: 'Sign in as director to run a broadcast test.' };
  }

  try {
    const res = await fetch(apiUrl('/api/push/test-broadcast'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm: true, title: params.title, body: params.body }),
    });
    const json = await readJsonResponse(res);
    const serverError =
      typeof json.error === 'string' ? json.error : `Push API returned ${res.status}`;

    if (!res.ok) {
      return { ok: false, errorMessage: serverError };
    }

    const sent = Number(json.sent ?? 0);
    const userCount = Number(json.userCount ?? 0);
    if (sent === 0) {
      return {
        ok: false,
        errorMessage: serverError || 'Broadcast reached zero devices.',
        sent,
        userCount,
      };
    }

    return { ok: true, sent, userCount };
  } catch (err) {
    return {
      ok: false,
      errorMessage: err instanceof Error ? err.message : 'Could not reach the push API.',
    };
  }
}

export async function notifySupportTicketPush(params: {
  ticketId: string;
  event: 'opened' | 'user_message' | 'staff_reply';
  messageId?: string;
}): Promise<void> {
  const json = await postPushApi('/api/support/notify', params);
  const staffSent = Number((json.staff as { sent?: number } | undefined)?.sent ?? json.sent ?? 0);
  const directorSent = Number((json.director as { sent?: number } | undefined)?.sent ?? 0);
  if (params.event !== 'staff_reply' && staffSent === 0 && directorSent === 0 && !json.error) {
    console.warn('[push] support notify reached 0 staff/director devices:', json);
  }
}

async function postPushApi(path: string, body: unknown, retries = 2): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  if (!token) {
    console.warn('[push] send skipped: not signed in');
    return { error: 'not signed in' };
  }

  let lastJson: Record<string, unknown> = {};
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(apiUrl(path), {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      lastJson = await readJsonResponse(res);
      if (res.ok) return lastJson;
      if (res.status >= 500 && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      const errorText = typeof lastJson.error === 'string' ? lastJson.error : `HTTP ${res.status}`;
      console.warn(`[push] send rejected (${path}):`, res.status, errorText);
      return lastJson;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        continue;
      }
      console.warn('[push] send failed:', err);
      return { error: err instanceof Error ? err.message : 'send failed' };
    }
  }
  return lastJson;
}

export async function notifyReportPush(reportId: string): Promise<void> {
  const json = await postPushApi('/api/reports/notify', { reportId });
  const staffSent = Number((json.staff as { sent?: number } | undefined)?.sent ?? 0);
  const directorSent = Number((json.director as { sent?: number } | undefined)?.sent ?? 0);
  if (staffSent === 0 && directorSent === 0 && !json.error) {
    console.warn('[push] report notify reached 0 staff/director devices:', json);
  }
}

export async function sendPushNotification(options: SendPushOptions): Promise<void> {
  const json = await postPushApi('/api/push/send', options);
  if (json.error) {
    console.warn('[push] send failed:', {
      eventType: options.eventType,
      error: json.error,
    });
    return;
  }
  if (Number(json.sent) === 0) {
    console.warn('[push] send reached 0 devices:', {
      eventType: options.eventType,
      recipients: json.recipients,
      skipped: json.skipped,
      subscriptionCount: json.subscriptionCount,
    });
  }
}

/** Empty/off state after logout — not persisted; reload from DB on next sign-in. */
export const CLEARED_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: false,
  messages: false,
  messageRequests: false,
  communityChat: false,
  staffChat: false,
  support: false,
  claims: false,
  gifts: false,
  comments: false,
  listingUpvotes: false,
  listingDownvotes: false,
  listingStatus: false,
  nearbyListings: false,
  requests: false,
  appUpdates: false,
  announcements: false,
  pickupReminders: false,
  newListings: false,
  savedItems: false,
  accountUpdates: false,
  staffSupport: false,
  staffReports: false,
  directorAlerts: false,
  directorJoins: false,
  directorLeaves: false,
  directorModeration: false,
  directorReports: false,
  directorTickets: false,
  directorListings: false,
  directorMessageRequests: false,
  directorClaimRequests: false,
  nearbyRadiusMiles: 10,
  followedCategories: [],
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messages: true,
  messageRequests: true,
  communityChat: true,
  staffChat: true,
  support: true,
  claims: true,
  gifts: true,
  comments: true,
  listingUpvotes: true,
  listingDownvotes: true,
  listingStatus: true,
  nearbyListings: true,
  requests: true,
  appUpdates: true,
  announcements: true,
  pickupReminders: true,
  newListings: true,
  savedItems: true,
  accountUpdates: true,
  staffSupport: true,
  staffReports: true,
  directorAlerts: true,
  directorJoins: true,
  directorLeaves: true,
  directorModeration: true,
  directorReports: true,
  directorTickets: true,
  directorListings: true,
  directorMessageRequests: true,
  directorClaimRequests: true,
  nearbyRadiusMiles: 10,
  followedCategories: [],
};

function normalizePreferencesRow(row: Record<string, unknown>): NotificationPreferences {
  return {
    enabled: row.enabled !== false,
    messages: row.messages !== false,
    messageRequests: row.messageRequests !== false,
    communityChat: row.communityChat !== false,
    staffChat: row.staffChat !== false,
    support: row.support !== false,
    claims: row.claims !== false,
    gifts: row.gifts !== false,
    comments: row.comments !== false,
    listingUpvotes: row.listingUpvotes !== false,
    listingDownvotes: row.listingDownvotes !== false,
    listingStatus: row.listingStatus !== false,
    nearbyListings: row.nearbyListings !== false,
    requests: row.requests !== false,
    appUpdates: row.appUpdates !== false,
    announcements: row.announcements !== false,
    pickupReminders: row.pickupReminders !== false,
    newListings: row.newListings !== false,
    savedItems: row.savedItems !== false,
    accountUpdates: row.accountUpdates !== false,
    staffSupport: row.staffSupport !== false,
    staffReports: row.staffReports !== false,
    directorAlerts: row.directorAlerts !== false,
    directorJoins: row.directorJoins !== false,
    directorLeaves: row.directorLeaves !== false,
    directorModeration: row.directorModeration !== false,
    directorReports: row.directorReports !== false,
    directorTickets: row.directorTickets !== false,
    directorListings: row.directorListings !== false,
    directorMessageRequests: row.directorMessageRequests !== false,
    directorClaimRequests: row.directorClaimRequests !== false,
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

  let { error } = await supabase.from('notification_preferences').upsert(payload, { onConflict: 'userId' });
  if (error && isMissingPrefColumnError(error)) {
    ({ error } = await supabase.from('notification_preferences').upsert(
      { userId, ...prefsWithoutOptionalColumns(prefs), updatedAt: payload.updatedAt },
      { onConflict: 'userId' },
    ));
  }
  return !error;
}

export function listenForNotificationClicks(handler: (url: string) => void): () => void {
  const onNativeClick = (event: Event) => {
    const url = String((event as CustomEvent<string>).detail || '').trim();
    if (url) handler(url);
  };

  window.addEventListener('sbn-native-notification-click', onNativeClick);

  if (!('serviceWorker' in navigator)) {
    return () => window.removeEventListener('sbn-native-notification-click', onNativeClick);
  }

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
      handler(event.data.url);
    }
  };

  navigator.serviceWorker.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener('sbn-native-notification-click', onNativeClick);
    navigator.serviceWorker.removeEventListener('message', onMessage);
  };
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (isNativeApp()) {
    return Boolean(getStoredFcmToken()) && (await refreshNativePushPermissionState()) === 'granted';
  }

  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}
