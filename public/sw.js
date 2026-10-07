/*
 * Offline support.
 *  - Install: caches both pages and the scripts/styles they reference, so the whole app works
 *    offline after the first visit.
 *  - Pages (navigations): network first, so players always get the latest version when online;
 *    the cached copy is the offline fallback.
 *  - Same-origin assets: stale-while-revalidate. Built assets are fingerprinted, so cached copies
 *    are never wrong.
 * Bump CACHE_NAME to drop everything cached by older versions.
 */
const CACHE_NAME = 'soroban-v4';
const PAGES = ['./', './cards/'];
const STATIC = ['./manifest.json', './images/icon-192x192.png'];

/** Caches a page and every script and stylesheet it references. */
async function precachePage(cache, url) {
  const response = await fetch(url);
  if (!response.ok) return;
  await cache.put(url, response.clone());
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
    ([, path]) => new URL(path, response.url).href,
  );
  await Promise.allSettled(assets.map((asset) => cache.add(asset)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled([
          ...PAGES.map((page) => precachePage(cache, page)),
          ...STATIC.map((url) => cache.add(url)),
        ]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached ?? refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    request.mode === 'navigate' ? networkFirst(request) : staleWhileRevalidate(request),
  );
});
