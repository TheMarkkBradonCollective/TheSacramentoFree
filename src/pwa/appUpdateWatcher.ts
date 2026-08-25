import { apiUrl } from '../lib/appOrigin';

/** How often to poll for a new deploy. */
const VERSION_POLL_INTERVAL_MS = 15 * 1000;

/** Ignore resume/focus checks briefly after returning from a system dialog. */
const RESUME_GRACE_MS = 8_000;

const VERSION_STORAGE_KEY = 'sbn_known_web_version_v1';

export interface VersionManifest {
  v?: string;
  label?: string;
}

let pausedUntil = 0;
let resumeGraceUntil = 0;
let watcherStarted = false;

function fetchVersionManifest(): Promise<VersionManifest | null> {
  return fetch(`${apiUrl('/version.json')}?_=${Date.now()}`, { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<VersionManifest>) : null))
    .catch(() => null);
}

/** Pause deploy reload checks while a native permission dialog is open. */
export function pauseAppUpdateWatcher(durationMs = 30_000): void {
  pausedUntil = Date.now() + durationMs;
}

function readStoredVersion(): string | null {
  try {
    return sessionStorage.getItem(VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredVersion(version: string): void {
  try {
    sessionStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    // ignore
  }
}

function reloadNow(): void {
  window.location.reload();
}

/**
 * Apply a new deploy without flashing the live UI. Reload when the user returns
 * so the WebView is not left on a blank page mid-reload after multitasking.
 */
function reloadWhenQuiet(): void {
  if (Date.now() < pausedUntil) return;

  const doReload = () => {
    if (Date.now() < pausedUntil) return;
    reloadNow();
  };

  if (document.visibilityState === 'visible') {
    window.setTimeout(doReload, 400);
    return;
  }

  const onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', onVisible);
    window.setTimeout(doReload, 400);
  };
  document.addEventListener('visibilitychange', onVisible);
}

/**
 * Polls /version.json and applies the new deploy when the tab is in the background.
 * Used for native APK (no service worker) and as a fast fallback on the web.
 */
export function startAppUpdateWatcher(): void {
  if (typeof window === 'undefined' || watcherStarted) return;
  watcherStarted = true;

  let knownVersion: string | null = readStoredVersion();
  let reloadScheduled = false;

  const scheduleReload = () => {
    if (reloadScheduled || Date.now() < pausedUntil) return;
    reloadScheduled = true;
    reloadWhenQuiet();
  };

  const checkVersion = async () => {
    if (Date.now() < pausedUntil || Date.now() < resumeGraceUntil) return;

    const data = await fetchVersionManifest();
    const serverVersion = data?.v;
    if (!serverVersion) return;

    if (knownVersion === null) {
      knownVersion = serverVersion;
      writeStoredVersion(serverVersion);
      return;
    }

    if (knownVersion !== serverVersion) {
      knownVersion = serverVersion;
      writeStoredVersion(serverVersion);
      scheduleReload();
    }
  };

  const onResume = () => {
    resumeGraceUntil = Date.now() + RESUME_GRACE_MS;
    void checkVersion();
  };

  void checkVersion();
  window.setInterval(() => {
    void checkVersion();
  }, VERSION_POLL_INTERVAL_MS);

  window.addEventListener('online', onResume);
  window.addEventListener('focus', onResume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onResume();
  });
}
