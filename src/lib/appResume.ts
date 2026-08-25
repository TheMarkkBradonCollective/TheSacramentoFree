import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../supabase';
import { isNativeApp } from './nativePlatform';
import { pauseAppUpdateWatcher } from '../pwa/appUpdateWatcher';

const RESUME_AUTH_GRACE_MS = 12_000;
const STALE_BACKGROUND_MS = 45_000;
const EMPTY_ROOT_CHECK_MS = 2_500;
const RECOVERY_ATTEMPT_KEY = 'sbn_resume_recovery_v1';

let recoveryInstalled = false;
let lastHiddenAt = 0;
let emptyRootTimer: number | null = null;

function markBackgrounded(): void {
  lastHiddenAt = Date.now();
}

function clearRecoveryAttempt(): void {
  try {
    sessionStorage.removeItem(RECOVERY_ATTEMPT_KEY);
  } catch {
    /* ignore */
  }
}

export function noteAppRendered(): void {
  clearRecoveryAttempt();
  if (emptyRootTimer) {
    clearTimeout(emptyRootTimer);
    emptyRootTimer = null;
  }
}

async function refreshAuthAfterResume(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 4_000);
      }),
    ]);
  } catch (err) {
    console.warn('[resume] auth refresh failed:', err);
  }
}

function reconnectRealtimeIfNeeded(awayMs: number): void {
  if (awayMs < STALE_BACKGROUND_MS) return;
  try {
    const realtime = supabase.realtime as { isConnected?: () => boolean; connect?: () => void };
    if (typeof realtime.isConnected === 'function' && typeof realtime.connect === 'function') {
      if (!realtime.isConnected()) realtime.connect();
    }
  } catch (err) {
    console.warn('[resume] realtime reconnect failed:', err);
  }
}

function scheduleEmptyRootRecovery(): void {
  if (emptyRootTimer) clearTimeout(emptyRootTimer);
  emptyRootTimer = window.setTimeout(() => {
    emptyRootTimer = null;
    const root = document.getElementById('root');
    if (!root || root.childElementCount > 0) {
      clearRecoveryAttempt();
      return;
    }

    try {
      if (sessionStorage.getItem(RECOVERY_ATTEMPT_KEY) === '1') return;
      sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, '1');
    } catch {
      /* ignore */
    }

    console.warn('[resume] root still empty after resume — reloading');
    window.location.reload();
  }, EMPTY_ROOT_CHECK_MS);
}

export async function recoverAppOnResume(): Promise<void> {
  pauseAppUpdateWatcher(RESUME_AUTH_GRACE_MS);
  const awayMs = lastHiddenAt ? Date.now() - lastHiddenAt : 0;

  await refreshAuthAfterResume();
  reconnectRealtimeIfNeeded(awayMs);
  scheduleEmptyRootRecovery();
}

function handleResume(): void {
  void recoverAppOnResume();
}

function handleBackground(): void {
  markBackgrounded();
}

export function installAppResumeRecovery(): void {
  if (typeof window === 'undefined' || recoveryInstalled) return;
  recoveryInstalled = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleBackground();
      return;
    }
    handleResume();
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      pauseAppUpdateWatcher(RESUME_AUTH_GRACE_MS);
      try {
        sessionStorage.setItem(RECOVERY_ATTEMPT_KEY, '1');
      } catch {
        /* ignore */
      }
      window.location.reload();
      return;
    }
    handleResume();
  });

  window.addEventListener('focus', handleResume);

  if (isNativeApp()) {
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        handleBackground();
        return;
      }
      handleResume();
    }).catch(() => {
      /* Capacitor App plugin unavailable in some web shells */
    });
  }
}
