// Presufact service worker — enables install + offline, always serving the latest version.
// Strategy: network-first for everything (fresh by default), cache only as offline fallback.
const CACHE = 'presufact-v4';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only same-origin
  if (url.pathname.startsWith('/api/')) return; // API: nunca cachear (datos privados del panel)

  // Network-first: always try the network so deploys land immediately.
  // Fall back to cache only when offline. Refresh the cache on every successful fetch.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => {
            c.put(req, copy);
            // Bundles con hash: al recibir uno nuevo, purgar los antiguos del mismo tipo
            if (url.pathname.startsWith('/assets/')) {
              c.keys().then((keys) => keys.forEach((k) => {
                const p = new URL(k.url).pathname;
                if (p.startsWith('/assets/') && p !== url.pathname && p.split('-')[0] === url.pathname.split('-')[0] && p.split('.').pop() === url.pathname.split('.').pop()) c.delete(k);
              })).catch(() => {});
            }
          }).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('/index.html') : undefined))
      )
  );
});
