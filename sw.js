const CACHE_NAME = 'soroban-v26';
const urlsToCache = [
  '/',
  '/index.html',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js' // CDN externa
];

// Instalar Service Worker y guardar recursos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptar solicitudes y servir desde la caché
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devolver el recurso de la caché si existe
        if (response) {
          return response;
        }
        // Si no está en caché, hacer la solicitud normal a la red
        return fetch(event.request);
      })
  );
});

// Opcional: limpiar cachés antiguas
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});