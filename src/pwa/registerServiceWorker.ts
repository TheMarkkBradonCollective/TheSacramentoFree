import { ensurePushSubscription } from '../lib/pushNotifications';

function setupServiceWorker(registration: ServiceWorkerRegistration) {
  const notifyUpdateReady = (worker: ServiceWorker) => {
    worker.postMessage({ type: 'SKIP_WAITING' });
  };

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        notifyUpdateReady(newWorker);
      }
    });
  });

  if (registration.waiting && navigator.serviceWorker.controller) {
    notifyUpdateReady(registration.waiting);
  }

  const checkForUpdates = () => {
    registration.update().catch(() => {});
  };

  checkForUpdates();
  window.setInterval(checkForUpdates, 60 * 60 * 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

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

  void navigator.serviceWorker
    .register('/service-worker.js')
    .then((registration) => {
      console.log('Service worker registered:', registration.scope);
      setupServiceWorker(registration);
    })
    .catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
}
