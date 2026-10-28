// Service worker: lets phones install Import Scout as an app (like Darb) and keeps the app shell
// available when the connection drops. Data (/api) always comes from the network, so prices are never stale.
const SHELL = 'import-scout-v202610281507';
// Relative to this file, so it works at / (computer) and under /import-scout/ (online copy).
const FILES = ['./', 'index.html', 'static-config.js', 'v202610281507/styles.css', 'v202610281507/app.js', 'v202610281507/lib.js', 'v202610281507/filters.js', 'v202610281507/static-api.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/api/')) return;
  // Network first, so updates show at once; the cached copy is only a fallback when offline.
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
});
