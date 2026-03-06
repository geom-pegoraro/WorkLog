const CACHE = 'worklog-v12';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: pre-cache assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches immediately
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) {
    e.respondWith(fetch(e.request).catch(() => new Response('')));
    return;
  }

  // NETWORK FIRST for HTML — always try to get fresh version
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // CACHE FIRST for other assets (icons, manifest)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});

// Listen for skip-waiting message from client
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
