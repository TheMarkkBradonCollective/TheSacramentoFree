// Legacy service worker — the app registers /service-worker.js instead.
// This file remains for browsers that cached an older registration.
const BUILD_TIMESTAMP = '__BUILD_TIMESTAMP__';
const CACHE_NAME = 'sac-buy-nothing-legacy-' + BUILD_TIMESTAMP;

const OFFLINE_URLS = ['/index.html', '/icon.svg', '/Logo.jpeg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn('Offline pre-cache partial:', err);
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.headers.get('accept')?.includes('text/html')
  );
}

async function networkFirst(request, fallbackUrl = '/index.html') {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = (await caches.match(request)) || (await caches.match(fallbackUrl));
    if (cached) return cached;
    throw new Error('Offline and no cached fallback');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.status === 200) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || caches.match('/index.html');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Never cache the service worker itself or the version manifest.
  if (url.pathname === '/sw.js' || url.pathname === '/service-worker.js') {
    return;
  }

  if (url.pathname === '/version.json') {
    return;
  }

  if (url.origin !== self.location.origin) {
    if (url.href.includes('dicebear.com') || url.href.includes('tile.openstreetmap.org')) {
      event.respondWith(staleWhileRevalidate(event.request));
    }
    return;
  }

  // Always fetch fresh HTML so new Vite bundles load after deploys.
  if (isNavigationRequest(event.request) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Manifest should reflect latest install metadata.
  if (url.pathname === '/manifest.json') {
    event.respondWith(networkFirst(event.request, '/manifest.json'));
    return;
  }

  // Hashed JS/CSS: serve cache for speed, refresh in background.
  if (/\.(js|css|mjs|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Icons and images: cache-first with network fallback.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
    })
  );
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
