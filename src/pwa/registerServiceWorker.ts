import { ensurePushSubscription } from '../lib/pushNotifications';
import { startAppUpdateWatcher } from './appUpdateWatcher';

/** How often to ask the browser to re-fetch service-worker.js and check for changes. */
const SW_POLL_INTERVAL_MS = 60 * 1000;

async function unregisterLegacyServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.waiting?.scriptURL || '';
        return scriptUrl.includes('/sw.js') && !scriptUrl.includes('/service-worker.js');
      })
      .map((registration) => registration.unregister()),
  );
}

function setupServiceWorker(registration: ServiceWorkerRegistration) {
  const skipWaiting = (worker: ServiceWorker) => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  registration.addEventListener('updatefound', () => {
    const incoming = registration.installing;
    if (!incoming) return;

    incoming.addEventListener('statechange', () => {
      if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
        skipWaiting(incoming);
      }
    });
  });

  if (registration.waiting && navigator.serviceWorker.controller) {
    skipWaiting(registration.waiting);
  }

  const checkForUpdates = () => {
    registration.update().catch(() => {});
  };

  checkForUpdates();
  window.setInterval(checkForUpdates, SW_POLL_INTERVAL_MS);

  window.addEventListener('online', checkForUpdates);
  window.addEventListener('focus', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates();
  });
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  await unregisterLegacyServiceWorkers();

  let refreshing = false;

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

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    setupServiceWorker(registration);
    startAppUpdateWatcher();
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    startAppUpdateWatcher();
  }
}
