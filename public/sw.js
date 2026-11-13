/* eslint-disable no-restricted-globals */
// Check.mate Progressive Web App Service Worker
// Version: checkmate-pwa-v2.1.0

const CACHE_NAME = 'checkmate-pwa-v2.1';
const OFFLINE_URL = '/offline';

// Pre-cached critical application shell & offline assets
const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/icon.svg',
  '/workers/stockfishWorker.js',
];

// URLs that should NEVER be cached or intercepted by service worker
const BYPASS_PATTERNS = [
  '/api/',
  '/socket.io',
  '/_next/webpack-hmr',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebaseio.com',
  'firebase',
  'amazonaws.com',
  'chrome-extension:',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW] Some precache assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME || self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => {
        if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
          return self.registration.unregister();
        }
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

  // 0. Completely bypass service worker in localhost / development
  if (
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1' ||
    self.location.hostname.endsWith('.local') ||
    self.location.port === '3000'
  ) {
    return;
  }

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension, blob, data)
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return;
  }

  // 3. Bypass real-time, auth, and dynamic API endpoints
  const shouldBypass = BYPASS_PATTERNS.some((pattern) => url.includes(pattern));
  if (shouldBypass) {
    return;
  }

  // 4. Handle Page Navigation (HTML documents) -> Network First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline, try serving the specific cached page first
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fall back to dedicated offline page
          const offlineFallback = await caches.match(OFFLINE_URL);
          if (offlineFallback) {
            return offlineFallback;
          }
          return new Response(
            '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 5. Handle Next.js static asset chunks (JS/CSS in /_next/static/) -> Stale-While-Revalidate
  // Strictly target static chunks only; never intercept dynamic RSC data (?_rsc=) or server actions!
  if (url.includes('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response('', { status: 404, statusText: 'Not Found' }));

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 6. Handle Static Media Assets (Images, Icons, Piece Assets, Audio, Fonts) -> Stale-While-Revalidate
  const isMediaAsset =
    url.includes('/pieces/') ||
    url.includes('/icons/') ||
    url.includes('/workers/') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.svg') ||
    url.endsWith('.mp3') ||
    url.endsWith('.woff2');

  if (isMediaAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || new Response('', { status: 404, statusText: 'Not Found' }));

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 7. For all other dynamic requests (RSC data, review API, engine, game sessions):
  // DO NOT call event.respondWith! Let the browser handle standard network fetch natively.
});

// Communication listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
