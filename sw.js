/* FrancoRoute Prépa — service worker : mise en cache de l'app shell pour un
   accès hors ligne. Incrémenter CACHE_NAME à chaque nouvelle mise en ligne
   de index.html pour forcer les élèves à recevoir la nouvelle version. */
const CACHE_NAME = 'francoroute-prepa-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

/* Réseau d'abord pour index.html (pour recevoir les mises à jour dès que
   possible), cache d'abord pour le reste (police, icônes) — avec repli sur
   le cache si l'élève est hors ligne. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isAppShell = event.request.mode === 'navigate' ||
    event.request.url.endsWith('/index.html');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
