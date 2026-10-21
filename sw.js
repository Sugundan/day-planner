/* Planner — Service Worker (offline support) */
const CACHE = 'day-planner-v78';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon2-192.png',
  './icon2-512.png',
  './icon2-maskable-512.png',
  './apple2-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.2.0/dist/tabler-icons.min.css'
];

// Install: pre-cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all(ASSETS.map((u) => cache.add(new Request(u, { cache: 'reload' }))))).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first, fall back to network (and cache new requests like icon fonts)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return; // let POSTs (Google Sheets save) pass through
  // Pages, the manifest and icons: network first, so a new version shows on the very next open
  // (cache is only the offline fallback). Everything else (fonts etc.): cache first.
  const u0 = new URL(e.request.url);
  if (u0.origin === self.location.origin && (e.request.mode === 'navigate' || /\.(html|json|png|js)$/.test(u0.pathname) || u0.pathname.endsWith('/'))) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' }).then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return resp;
      }).catch(() => caches.match(e.request).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        // Cache successful same-origin and CDN font/CSS responses.
        // Use a proper hostname check rather than a substring match —
        // url.includes('cdn.jsdelivr.net') would also match a crafted URL
        // like https://evil.com/cdn.jsdelivr.net.attacker.com/payload.js.
        const url = e.request.url;
        let isAllowedCdn = false;
        try {
          const h = new URL(url).hostname;
          isAllowedCdn = h === 'cdn.jsdelivr.net';
        } catch (err) {}
        if (resp.ok && (url.startsWith(self.location.origin) || isAllowedCdn)) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
