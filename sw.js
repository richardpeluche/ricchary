/* ═══════════════════════════════════════════════════════════════
   RICCHARY · Service Worker

   CORRIGE DOS FALLOS de la versión anterior:
   1. El index.html nunca se guardaba en caché, así que el respaldo
      sin conexión no existía: la app quedaba sin nada a lo que
      recurrir.
   2. El respaldo solo actuaba si la red FALLABA. Un 404 o un 503 son
      respuestas válidas para fetch(), así que el .catch no entraba y
      el usuario veía la página de error de GitHub en vez de su app.

   ⚠️ AL SUBIR CAMBIOS: sube el número de CACHE (v4 → v5 → ...).
   ═══════════════════════════════════════════════════════════════ */
const CACHE = 'ricchary-v5';

// Rutas relativas: funcionan en este repo y en cualquier otro.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-rh.png',
  './fondo-app.jpg',
  './logo_animado.webm',
  './logo_animado_fallback.mp4'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      // Uno por uno: si falta un archivo, se salta en vez de tumbar
      // la instalación entera (addAll falla si UNO solo da error).
      Promise.all(ASSETS.map(u => c.add(u).catch(() => null)))
    )
  );
  /* SIN skipWaiting(): la versión nueva espera a que el usuario
     toque "Actualizar" en la barra de aviso. */
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* La app pide activar la versión nueva al tocar "Actualizar" */
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // No tocar lo que va a Apps Script, Datil o el SRI
  if (url.origin !== self.location.origin) return;

  const esHTML = e.request.mode === 'navigate' ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');

  if (esHTML) {
    // RED PRIMERO, pero solo si la respuesta es BUENA.
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (!r || !r.ok) throw new Error('respuesta ' + (r && r.status));
          // Guardar copia para poder responder la próxima vez
          const copia = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copia));
          return r;
        })
        .catch(() =>
          // Sin red, o con 404/503: se sirve la última copia buena
          caches.match('./index.html').then(c => c || caches.match('./'))
        )
    );
  } else {
    // CACHÉ PRIMERO para iconos, video y fondo
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(r => {
          if (r && r.ok) {
            const copia = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copia));
          }
          return r;
        })
      )
    );
  }
});
