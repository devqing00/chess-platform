/* eslint-disable no-restricted-globals */
// Check.mate Progressive Web App Service Worker
// Version: checkmate-pwa-v1.0.0

const CACHE_NAME = 'checkmate-pwa-v1';
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
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = request.url;

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

  // 5. Handle Static Assets (Images, Icons, Piece Assets, Fonts, CSS/JS chunks) -> Stale-While-Revalidate
  const isStaticAsset =
    url.includes('/_next/static/') ||
    url.includes('/pieces/') ||
    url.includes('/icons/') ||
    url.includes('/workers/') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.svg') ||
    url.endsWith('.mp3') ||
    url.endsWith('.woff2');

  if (isStaticAsset) {
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
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 6. Default fallback to standard fetch
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Communication listener
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
