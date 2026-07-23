const CACHE_NAME = 'lyric-listen-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa_icon.jpg'
];

// Install event - pre-cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some initial static assets failed to cache:', err);
      });
    })
  );
});

// Activate event - clean up old caches & take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network-First for dynamic/dev assets with Cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API routes so dynamic AI calls are not intercepted
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-First with Cache Fallback & Automatic Dynamic Caching
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // If valid response from network, cache a copy for offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed (offline or server sleeping) -> try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // If it's a page navigation request, return cached index.html or root
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const indexFallback = await caches.match('/index.html') || await caches.match('/');
          if (indexFallback) {
            return indexFallback;
          }
        }

        return new Response('Offline - Asset not cached yet.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});

// Listen for custom messages from UI
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'PRECACHE_ALL') {
    const urlsToFetch = event.data.urls || STATIC_ASSETS;
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of urlsToFetch) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) {
            await cache.put(url, res);
          }
        } catch (e) {
          console.warn('Failed to precache:', url, e);
        }
      }
      // Notify clients that precaching completed
      const clients = await self.clients.matchAll();
      clients.forEach(client => client.postMessage({ type: 'PRECACHE_COMPLETE' }));
    });
  }
});
