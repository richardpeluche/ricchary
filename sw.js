const CACHE = 'ricchary-v3';
const ASSETS = [
  '/ricchary/manifest.json',
  '/ricchary/icon-192.png',
  '/ricchary/icon-512.png',
  '/ricchary/logo-rh.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const esHTML = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');

  if (esHTML) {
    // RED PRIMERO para el HTML: siempre trae la versión más reciente
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/ricchary/index.html'))
    );
  } else {
    // Caché primero para imágenes y assets estáticos
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
