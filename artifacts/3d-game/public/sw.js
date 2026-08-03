// VOIDLING service worker.
// Strategy: network-first for page navigations (so new versions show up
// immediately), cache-first for content-addressed assets, network-first for
// everything else. Self-healing: skipWaiting + clients.claim + old-cache purge
// means a previously stuck browser recovers on its own instead of serving a
// stale app shell forever.
//
// THIS FILE USED TO SAY "cache-first for hashed static assets (safe: Vite
// content-hashes filenames, so a changed asset has a new URL)" AND APPLY IT TO
// EVERYTHING. Vite only fingerprints what it processes. Every file copied out
// of public/ keeps the name it was written with — /assets/splash_hero.webp,
// /assets/music/theme.mp3, the thirty files in /assets/audio/, the icons — and
// the handler below is cache-first with NO revalidation, so once one of those
// was in the cache it was served forever no matter what the server had.
//
// It shipped a new splash screen and the owner's phone kept showing the old one
// on a build stamped an hour later. Nothing was wrong with the deploy; the
// service worker simply never asked again. Any asset that is not
// content-addressed must be network-first, or changing it is a no-op for every
// returning player.
const CACHE_NAME = 'voidling-v15';   // bump PURGES every stale entry on activate
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

  // ── is this URL content-addressed? ────────────────────────────────────────
  // Only if its NAME changes when its BYTES change. Two things qualify: what
  // Vite fingerprints (main-DM2n4jP5.js, fredoka-latin-400-normal-17JuUzdy.woff2)
  // and the generated art, whose filenames carry a uuid. Everything else —
  // i.e. everything copied verbatim out of public/ — does not.
  const immutable = /-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(req.url)
    || /\/assets\/hf(3d)?\//.test(req.url);

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (immutable) {
        // safe to serve forever: a new build gives it a new URL
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }
      // Stable-named: ASK FIRST, every time. The HTTP cache still does the real
      // work (this is a conditional request, not a full download), and the cache
      // below is only the offline fallback.
      try {
        const res = await fetch(req);
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      } catch (e) {
        const cached = await cache.match(req);
        if (cached) return cached;
        throw e;
      }
    })()
  );
});
