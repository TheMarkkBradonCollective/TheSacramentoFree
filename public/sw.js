const CACHE_NAME = 'sac-buy-nothing-v3';

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

  // Never cache the service worker itself.
  if (url.pathname === '/sw.js' || url.pathname === '/service-worker.js') {
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
    event.respondWith(staleWhileRevalidate(event.request));
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
