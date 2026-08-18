// BUILD_TIMESTAMP is replaced at build time by the Vite swVersionPlugin.
// Every deploy produces a unique value so the browser always detects a new SW.
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';

self.addEventListener('install', (event) => {
  // Take over immediately so a previous worker cannot keep serving a stale
  // index.html / CSS bundle (that is what "old versions flashing" looks like).
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

async function refreshPushSubscription(oldEndpoint) {
  const vapidRes = await fetch('/api/push/vapid-public-key');
  if (!vapidRes.ok) throw new Error('VAPID key unavailable');
  const { publicKey } = await vapidRes.json();
  if (!publicKey) throw new Error('Missing VAPID public key');

  const subscription = await self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // DB row is refreshed when the signed-in app calls /api/push/subscribe.
  // Do not resubscribe here without auth — that caused wrong-user delivery.
  return subscription;
}

function resolveNotificationUrl(rawUrl) {
  if (!rawUrl) return '/';
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return '/';
  } catch {
    return rawUrl.startsWith('/') ? rawUrl : '/';
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: 'Sacramento Buy Nothing', body: event.data.text() };
    }
  }

  const title = payload.title || 'Sacramento Buy Nothing';
  const body =
    String(payload.body || '').trim() ||
    String(payload.title || '').trim() ||
    'You have a new community update.';
  const options = {
    body,
    icon: payload.icon || '/Logo.jpeg',
    badge: payload.badge || '/Logo.jpeg',
    tag: payload.tag || payload.eventType || 'sbn-notification',
    data: {
      url: resolveNotificationUrl(payload.url || '/'),
      eventType: payload.eventType || '',
      ...(payload.data || {}),
    },
    requireInteraction: false,
    renotify: true,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('pushsubscriptionchange', (event) => {
  const oldEndpoint = event.oldSubscription?.endpoint;
  event.waitUntil(
    refreshPushSubscription(oldEndpoint)
      .then(() =>
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
          }
        }),
      )
      .catch((err) => {
        console.warn('[sw] push subscription refresh failed:', err);
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
          }
        });
      }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = resolveNotificationUrl(
    event.notification.data?.url || event.notification.data?.destination || '/',
  );

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(targetUrl).then(() => client.focus());
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
