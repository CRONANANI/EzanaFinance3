/* Ezana Finance - Service Worker for client-side caching */
const CACHE_NAME = 'ezana-finance-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './assets/css/theme-variables.css',
  './pages/landing.css',
  './components/landing/antigravity-bg/antigravity-bg.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        console.log('Service Worker: Some assets failed to cache');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok && !url.pathname.includes('api') && !url.pathname.includes('socket')) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
        return cached || fetchPromise;
      })
    )
  );
});
