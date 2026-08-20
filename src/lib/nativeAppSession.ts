import { supabase } from '../supabase';
import { isNativeApp } from './nativePlatform';
import { getOrCreateDeviceId } from './deviceTracking';

const STORAGE_KEY_PREFIX = 'sbn_native_app_session_v1:';

/** In-flight native session registrations — ignore self-triggered realtime events. */
const pendingRegistrationByUser = new Map<string, string>();

function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readLocalNativeSessionId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(storageKey(userId));
    return value?.trim() ? value : null;
  } catch {
    return null;
  }
}

export function writeLocalNativeSessionId(userId: string, sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), sessionId);
  } catch {
    /* ignore */
  }
}

export function clearLocalNativeSessionId(userId: string): void {
  if (typeof window === 'undefined') return;
  pendingRegistrationByUser.delete(userId);
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

function markRegistrationPending(userId: string, sessionId: string): void {
  pendingRegistrationByUser.set(userId, sessionId);
}

function clearRegistrationPending(userId: string): void {
  pendingRegistrationByUser.delete(userId);
}

function isRegistrationPending(userId: string, sessionId?: string | null): boolean {
  const pendingId = pendingRegistrationByUser.get(userId);
  if (!pendingId) return false;
  return sessionId ? pendingId === sessionId : true;
}

/** Claim the sole native app slot for this account (signs out other APK/AAB installs). */
export async function registerNativeAppSession(userId: string): Promise<string | null> {
  if (!isNativeApp() || !userId) return null;

  const sessionId = crypto.randomUUID();
  const deviceId = getOrCreateDeviceId();
  const now = new Date().toISOString();

  // Write local first so verify/guard see the new id before realtime fires.
  writeLocalNativeSessionId(userId, sessionId);
  markRegistrationPending(userId, sessionId);

  try {
    const { error } = await supabase.from('native_app_sessions').upsert(
      {
        userId,
        sessionId,
        deviceId,
        updatedAt: now,
      },
      { onConflict: 'userId' },
    );

    if (error) {
      console.warn('Native app session registration failed:', error.message);
      clearLocalNativeSessionId(userId);
      return null;
    }

    return sessionId;
  } finally {
    clearRegistrationPending(userId);
  }
}

export async function verifyNativeAppSession(userId: string): Promise<'valid' | 'revoked' | 'skip'> {
  if (!isNativeApp() || !userId) return 'skip';
  if (isRegistrationPending(userId)) return 'valid';

  const localId = readLocalNativeSessionId(userId);
  const localDeviceId = getOrCreateDeviceId();
  const { data, error } = await supabase
    .from('native_app_sessions')
    .select('sessionId, deviceId')
    .eq('userId', userId)
    .maybeSingle();

  if (error) {
    console.warn('Native app session verify failed:', error.message);
    return 'valid';
  }

  const remoteId = typeof data?.sessionId === 'string' ? data.sessionId : null;
  const remoteDeviceId = typeof data?.deviceId === 'string' ? data.deviceId : null;

  if (!remoteId) {
    if (localId) return 'revoked';
    return 'valid';
  }

  if (!localId) {
    // Legacy rows may lack deviceId — fail open; registration will refresh on sign-in/resume.
    if (!remoteDeviceId) return 'valid';
    if (remoteDeviceId === localDeviceId) {
      writeLocalNativeSessionId(userId, remoteId);
      return 'valid';
    }
    return 'revoked';
  }

  return localId === remoteId ? 'valid' : 'revoked';
}

/** Realtime guard — another native login replaces sessionId and triggers sign-out here. */
export function subscribeNativeAppSessionGuard(
  userId: string,
  onRevoked: () => void,
): () => void {
  if (!isNativeApp() || !userId) return () => undefined;

  const channel = supabase
    .channel(`native-app-session:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'native_app_sessions',
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        if (isRegistrationPending(userId)) return;

        const nextId =
          typeof (payload.new as { sessionId?: string } | null)?.sessionId === 'string'
            ? (payload.new as { sessionId: string }).sessionId
            : null;
        const localId = readLocalNativeSessionId(userId);
        if (nextId && localId && nextId !== localId) {
          onRevoked();
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
