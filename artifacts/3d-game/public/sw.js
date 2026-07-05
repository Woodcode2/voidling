// VOIDLING service worker.
// Strategy: network-first for page navigations (so new versions show up
// immediately), cache-first for hashed static assets (safe: Vite content-hashes
// filenames, so a changed asset has a new URL). Self-healing: skipWaiting +
// clients.claim + old-cache purge means a previously stuck browser recovers on
// its own instead of serving a stale app shell forever.
const CACHE_NAME = 'voidling-v14-1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache that isn't the current version.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
      // Force any open tabs still showing the old shell to reload onto fresh code.
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        windows.map((client) => {
          try {
            return client.navigate(client.url);
          } catch (e) {
            return Promise.resolve();
          }
        })
      );
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  // Page loads: always try the network first so updates appear immediately.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put('/index.html', res.clone());
          }
          return res;
        } catch (e) {
          return (
            (await caches.match('/index.html')) ||
            (await caches.match('/')) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Static assets: serve from cache, fall back to network and cache the result.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    })()
  );
});
