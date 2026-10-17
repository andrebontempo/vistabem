const CACHE_NAME = 'vistabem-v3';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/main.js',
  '/images/logo.svg',
  '/images/logo-white.svg',
  '/images/favicon.svg',
  '/images/hero-art.svg',
  '/images/placeholder.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Ignora requisições de API, POST, Checkout ou admin
  if (
    e.request.method !== 'GET' ||
    e.request.url.includes('/api/') ||
    e.request.url.includes('/admin') ||
    e.request.url.includes('/checkout') ||
    e.request.url.includes('/pedido/')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        if (networkRes.status === 200 && e.request.url.match(/\.(css|js|svg|png|jpg|webp|woff2)$/)) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkRes;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('/')))
  );
});
