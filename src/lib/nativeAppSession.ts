import { supabase } from '../supabase';
import { isNativeApp } from './nativePlatform';
import { getOrCreateDeviceId } from './deviceTracking';

const STORAGE_KEY_PREFIX = 'sbn_native_app_session_v1:';

/** In-flight native session registrations — ignore self-triggered realtime events. */
const pendingRegistrationByUser = new Map<string, string>();
const registrationPromiseByUser = new Map<string, Promise<string | null>>();
const pendingClearTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
  const timer = pendingClearTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    pendingClearTimers.delete(userId);
  }
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function clearAllLocalNativeSessionIds(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function markRegistrationPending(userId: string, sessionId: string): void {
  const existingTimer = pendingClearTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingClearTimers.delete(userId);
  }
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

function scheduleClearRegistrationPending(userId: string, sessionId: string): void {
  const existingTimer = pendingClearTimers.get(userId);
  if (existingTimer) clearTimeout(existingTimer);
  pendingClearTimers.set(
    userId,
    setTimeout(() => {
      pendingClearTimers.delete(userId);
      if (pendingRegistrationByUser.get(userId) === sessionId) {
        clearRegistrationPending(userId);
      }
    }, 1500),
  );
}

async function authUserIdOrNull(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

type NativeSessionRow = {
  sessionId?: string | null;
  deviceId?: string | null;
};

async function fetchRemoteNativeSession(userId: string): Promise<NativeSessionRow | null> {
  try {
    const { data, error } = await supabase
      .from('native_app_sessions')
      .select('sessionId, deviceId')
      .eq('userId', userId)
      .maybeSingle();
    if (error) {
      console.warn('Native app session lookup failed:', error.message);
      return null;
    }
    return (data as NativeSessionRow | null) ?? null;
  } catch (err) {
    console.warn('Native app session lookup failed:', err);
    return null;
  }
}

async function doRegisterNativeAppSession(userId: string): Promise<string | null> {
  const deviceId = getOrCreateDeviceId();
  const localId = readLocalNativeSessionId(userId);
  const remote = await fetchRemoteNativeSession(userId);
  const remoteId = typeof remote?.sessionId === 'string' ? remote.sessionId : null;
  const remoteDeviceId = typeof remote?.deviceId === 'string' ? remote.deviceId : null;

  let sessionId: string;
  if (remoteId && remoteDeviceId === deviceId) {
    // This install already owns the slot — keep the server id.
    sessionId = remoteId;
  } else if (localId && (!remoteId || !remoteDeviceId || remoteDeviceId === deviceId || remoteId === localId)) {
    sessionId = localId;
  } else {
    // First claim on this phone, or taking over from another install.
    sessionId = crypto.randomUUID();
  }

  writeLocalNativeSessionId(userId, sessionId);
  markRegistrationPending(userId, sessionId);

  try {
    const { error } = await supabase.from('native_app_sessions').upsert(
      {
        userId,
        sessionId,
        deviceId,
        updatedAt: new Date().toISOString(),
      },
      { onConflict: 'userId' },
    );

    if (error) {
      console.warn('Native app session registration failed:', error.message);
      if (localId && sessionId !== localId) {
        writeLocalNativeSessionId(userId, localId);
      } else if (!localId) {
        clearLocalNativeSessionId(userId);
      }
      return null;
    }

    writeLocalNativeSessionId(userId, sessionId);
    return sessionId;
  } finally {
    scheduleClearRegistrationPending(userId, sessionId);
  }
}

/** Claim the sole native app slot for this account (signs out other APK/AAB installs). */
export function registerNativeAppSession(userId: string): Promise<string | null> {
  if (!isNativeApp() || !userId) return Promise.resolve(null);

  const existing = registrationPromiseByUser.get(userId);
  if (existing) return existing;

  const promise = doRegisterNativeAppSession(userId).finally(() => {
    if (registrationPromiseByUser.get(userId) === promise) {
      registrationPromiseByUser.delete(userId);
    }
  });
  registrationPromiseByUser.set(userId, promise);
  return promise;
}

export async function clearRemoteNativeAppSession(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await supabase.from('native_app_sessions').delete().eq('userId', userId);
  } catch (err) {
    console.warn('Native app session delete failed:', err);
  }
}

export async function verifyNativeAppSession(userId: string): Promise<'valid' | 'revoked' | 'skip'> {
  if (!isNativeApp() || !userId) return 'skip';
  if (isRegistrationPending(userId)) return 'valid';

  const authUserId = await authUserIdOrNull();
  if (!authUserId || authUserId !== userId) return 'skip';
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
    // Stale local id (e.g. shared phone, account switched) — clear, don't sign out.
    if (localId) clearLocalNativeSessionId(userId);
    return 'valid';
  }

  // Same physical device owns the slot — never treat as another install.
  if (remoteDeviceId && remoteDeviceId === localDeviceId) {
    if (remoteId !== localId) writeLocalNativeSessionId(userId, remoteId);
    return 'valid';
  }

  // Legacy rows without deviceId: adopt when we have no local id or ids already match.
  if (!remoteDeviceId) {
    if (!localId || localId === remoteId) {
      writeLocalNativeSessionId(userId, remoteId);
      return 'valid';
    }
    return 'revoked';
  }

  if (localId && localId === remoteId) return 'valid';

  return 'revoked';
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

        const row = (payload.new || payload.old) as {
          userId?: string;
          sessionId?: string;
          deviceId?: string;
        } | null;

        const payloadUserId = typeof row?.userId === 'string' ? row.userId : null;
        if (payloadUserId && payloadUserId !== userId) return;

        const nextDeviceId =
          typeof (payload.new as { deviceId?: string } | null)?.deviceId === 'string'
            ? (payload.new as { deviceId: string }).deviceId
            : null;
        const localDeviceId = getOrCreateDeviceId();
        const nextId =
          typeof (payload.new as { sessionId?: string } | null)?.sessionId === 'string'
            ? (payload.new as { sessionId: string }).sessionId
            : null;

        // Our own heartbeat / reclaim — keep local id in sync, never kick.
        if (nextDeviceId && nextDeviceId === localDeviceId) {
          if (nextId) writeLocalNativeSessionId(userId, nextId);
          return;
        }

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
