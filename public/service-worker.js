const CACHE_NAME = 'sac-buy-nothing-v8';

const NOTIFICATION_ICON = '/Logo.jpeg';
const OFFLINE_URLS = ['/index.html', '/Logo.jpeg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn('Offline pre-cache partial:', err);
      }),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
    ),
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

  if (url.pathname === '/sw.js' || url.pathname === '/service-worker.js') {
    return;
  }

  if (url.origin !== self.location.origin) {
    if (url.href.includes('dicebear.com') || url.href.includes('tile.openstreetmap.org')) {
      event.respondWith(staleWhileRevalidate(event.request));
    }
    return;
  }

  if (isNavigationRequest(event.request) || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname === '/manifest.json') {
    event.respondWith(networkFirst(event.request, '/manifest.json'));
    return;
  }

  if (/\.(js|css|mjs|woff2?|ttf|otf)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });
    }),
  );
});

function notificationAsset(path) {
  try {
    return new URL(path, self.location.origin).href;
  } catch {
    return path;
  }
}

function resolveNotificationUrl(rawUrl) {
  if (!rawUrl) return '/';
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return rawUrl;
  } catch {
    return rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
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
  const data = {
    url: resolveNotificationUrl(payload.url || '/'),
    eventType: payload.eventType || '',
    ...(payload.data || {}),
  };
  const tag = payload.tag || payload.eventType || 'sbn-notification';

  async function show() {
    const withIcon = {
      body,
      icon: notificationAsset(payload.icon || NOTIFICATION_ICON),
      badge: notificationAsset(payload.badge || NOTIFICATION_ICON),
      tag,
      data,
      requireInteraction: false,
      renotify: true,
    };
    try {
      await self.registration.showNotification(title, withIcon);
    } catch {
      await self.registration.showNotification(title, { body, tag, data, renotify: true });
    }
  }

  event.waitUntil(show());
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
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
