import { ensurePushSubscription } from '../lib/pushNotifications';

/** How often to ask the browser to re-fetch service-worker.js and check for changes. */
const SW_POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * How often to poll /version.json as a fallback update signal.
 * This catches deploys even when the SW byte-comparison doesn't change
 * (shouldn't happen with the swVersionPlugin, but kept as belt-and-suspenders).
 */
const VERSION_POLL_INTERVAL_MS = 30 * 1000; // 30 seconds

function setupServiceWorker(registration: ServiceWorkerRegistration) {
  const skipWaiting = (worker: ServiceWorker) => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  // When the browser finds a new SW version, tell it to activate immediately.
  registration.addEventListener('updatefound', () => {
    const incoming = registration.installing;
    if (!incoming) return;

    incoming.addEventListener('statechange', () => {
      // 'installed' == waiting. If an old SW is already controlling this page,
      // skip the wait so the new SW activates right away.
      if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
        skipWaiting(incoming);
      }
    });
  });

  // Handle the case where a new SW is already waiting when this script runs
  // (e.g. the tab was opened right after a deploy).
  if (registration.waiting && navigator.serviceWorker.controller) {
    skipWaiting(registration.waiting);
  }

  const checkForUpdates = () => {
    registration.update().catch(() => {});
  };

  // Immediate check on load, then every 2 minutes.
  checkForUpdates();
  window.setInterval(checkForUpdates, SW_POLL_INTERVAL_MS);

  // Extra triggers so mobile users who leave the tab in the background still
  // pick up updates quickly when they return.
  window.addEventListener('online', checkForUpdates);
  window.addEventListener('focus', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates();
  });

  // -------------------------------------------------------------------------
  // version.json fallback
  // -------------------------------------------------------------------------
  // /version.json is written at build time with a unique timestamp. Polling it
  // gives us a reliable secondary signal: if the server version differs from
  // what we saw at startup, a reload is needed even if the SW update path
  // didn't fire (common on iOS Safari when the app is installed as a PWA).
  let knownVersion: string | null = null;
  let reloadScheduled = false;

  const checkVersion = async () => {
    try {
      const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { v?: string };
      const serverVersion = data.v;
      if (!serverVersion) return;

      if (knownVersion === null) {
        knownVersion = serverVersion;
        return;
      }

      if (knownVersion !== serverVersion && !reloadScheduled) {
        reloadScheduled = true;
        // Give the SW update chain (controllerchange → reload) a few seconds to
        // fire first. If we're still running after that, the SW path failed, so
        // reload ourselves.
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    } catch {
      // Offline or server unavailable — silently ignore.
    }
  };

  void checkVersion();
  window.setInterval(checkVersion, VERSION_POLL_INTERVAL_MS);
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  // When the new SW takes control (after skipWaiting + clients.claim), reload
  // the page so the latest HTML/assets are used.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
      void ensurePushSubscription().catch((err) => {
        console.warn('[push] subscription refresh failed:', err);
      });
    }
  });

  void navigator.serviceWorker
    .register('/service-worker.js')
    .then((registration) => {
      setupServiceWorker(registration);
    })
    .catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
}
