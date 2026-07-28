import { apiUrl } from '../lib/appOrigin';

/** How often to poll for a new deploy. */
const VERSION_POLL_INTERVAL_MS = 15 * 1000;

/** Grace period for service-worker activation before a hard reload. */
const RELOAD_GRACE_MS = 750;

export interface VersionManifest {
  v?: string;
  label?: string;
}

function fetchVersionManifest(): Promise<VersionManifest | null> {
  return fetch(`${apiUrl('/version.json')}?_=${Date.now()}`, { cache: 'no-store' })
    .then((res) => (res.ok ? (res.json() as Promise<VersionManifest>) : null))
    .catch(() => null);
}

/**
 * Polls /version.json and reloads when the server deploy id changes.
 * Used for native APK (no service worker) and as a fast fallback on the web.
 */
export function startAppUpdateWatcher(): void {
  if (typeof window === 'undefined') return;

  let knownVersion: string | null = null;
  let reloadScheduled = false;

  const scheduleReload = () => {
    if (reloadScheduled) return;
    reloadScheduled = true;
    window.setTimeout(() => {
      window.location.reload();
    }, RELOAD_GRACE_MS);
  };

  const checkVersion = async () => {
    const data = await fetchVersionManifest();
    const serverVersion = data?.v;
    if (!serverVersion) return;

    if (knownVersion === null) {
      knownVersion = serverVersion;
      return;
    }

    if (knownVersion !== serverVersion) {
      scheduleReload();
    }
  };

  void checkVersion();
  window.setInterval(() => {
    void checkVersion();
  }, VERSION_POLL_INTERVAL_MS);

  window.addEventListener('online', () => {
    void checkVersion();
  });
  window.addEventListener('focus', () => {
    void checkVersion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersion();
  });
}
