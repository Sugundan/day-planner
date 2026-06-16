/* Day Planner — Service Worker (offline support) */
const CACHE = 'day-planner-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.2.0/dist/tabler-icons.min.css'
];

// Install: pre-cache the app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
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
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        // Cache successful same-origin and CDN font/CSS responses
        const url = e.request.url;
        if (resp.ok && (url.startsWith(self.location.origin) || url.includes('cdn.jsdelivr.net'))) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
