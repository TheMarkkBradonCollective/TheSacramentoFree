export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service worker registered:', registration.scope);

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
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}
