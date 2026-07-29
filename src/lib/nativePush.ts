import { PushNotifications } from '@capacitor/push-notifications';
import { pauseAppUpdateWatcher } from '../pwa/appUpdateWatcher';
import { isNativeApp } from './nativePlatform';

export const FCM_ENDPOINT_PREFIX = 'fcm:';
export const FCM_NATIVE_KEY = 'native-fcm';

const FCM_TOKEN_KEY = 'sbn_fcm_token_v1';
const NATIVE_PERMISSION_KEY = 'sbn_native_push_permission_v1';

let handlersReady = false;

function storeNativePermission(state: 'granted' | 'denied' | 'default') {
  try {
    localStorage.setItem(NATIVE_PERMISSION_KEY, state);
  } catch {
    // ignore
  }
}

export function getStoredFcmToken(): string | null {
  try {
    return localStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearStoredFcmToken(): void {
  try {
    localStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function fcmEndpointForToken(token: string): string {
  return `${FCM_ENDPOINT_PREFIX}${token}`;
}

export function isFcmEndpoint(endpoint: string): boolean {
  return endpoint.startsWith(FCM_ENDPOINT_PREFIX);
}

export async function getNativePushPermissionState(): Promise<'granted' | 'denied' | 'default'> {
  if (!isNativeApp()) return 'default';
  const status = await PushNotifications.checkPermissions();
  if (status.receive === 'granted') return 'granted';
  if (status.receive === 'denied') return 'denied';
  return 'default';
}

function waitForFcmToken(timeoutMs = 12_000): Promise<string | null> {
  const existing = getStoredFcmToken();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const onToken = (event: Event) => {
      const token = String((event as CustomEvent<string>).detail || '').trim();
      cleanup();
      resolve(token || getStoredFcmToken());
    };

    const timer = window.setTimeout(() => {
      cleanup();
      resolve(getStoredFcmToken());
    }, timeoutMs);

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('sbn-fcm-token', onToken);
    };

    window.addEventListener('sbn-fcm-token', onToken);
  });
}

export async function initNativePushHandlers(onNotificationClick: (url: string) => void): Promise<void> {
  if (!isNativeApp() || handlersReady) return;
  handlersReady = true;

  await PushNotifications.addListener('registration', (token) => {
    const value = String(token.value || '').trim();
    if (!value) return;
    try {
      localStorage.setItem(FCM_TOKEN_KEY, value);
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('sbn-fcm-token', { detail: value }));
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.warn('[native-push] registration failed:', error);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = String(action.notification.data?.url || '').trim();
    if (url) onNotificationClick(url);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const url = String(notification.data?.url || '').trim();
    if (url && document.visibilityState === 'visible') {
      onNotificationClick(url);
    }
  });
}

export async function registerNativePushToken(): Promise<string | null> {
  if (!isNativeApp()) return null;

  pauseAppUpdateWatcher(45_000);
  const permission = await PushNotifications.requestPermissions();
  pauseAppUpdateWatcher(10_000);
  if (permission.receive !== 'granted') {
    storeNativePermission('denied');
    return null;
  }

  storeNativePermission('granted');
  const pendingToken = waitForFcmToken();
  await PushNotifications.register();
  return pendingToken;
}

export async function unregisterNativePushToken(): Promise<void> {
  if (!isNativeApp()) return;
  clearStoredFcmToken();
  try {
    await PushNotifications.unregister();
  } catch {
    // ignore
  }
}
