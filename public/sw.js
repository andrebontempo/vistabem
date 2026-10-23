/**
 * Service Worker de desativação e limpeza de cache
 * Previne que navegadores sirvam páginas HTML obsoletas de e-commerce
 */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Pass-through direto para a rede sem cache
  e.respondWith(fetch(e.request));
});
