/* ============================================================
 * RANA LEOPARDO — Corn Island Adventure
 * sw.js — Service Worker
 * ------------------------------------------------------------
 * Estrategia:
 *  - PRECACHE: app shell (HTML, CSS, JS, icons, manifest, niveles)
 *    al instalar → el juego carga offline en el primer arranque.
 *  - RUNTIME: cache-first para assets versionados; stale-while-
 *    revalidate para el resto; network-first con fallback a cache
 *    para las navegaciones (siempre HTML fresco si hay red).
 * ============================================================ */

const VERSION = 'rana-leopardo-v1';
const PRECACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/site.webmanifest',
  '/js/pwa.js',
  '/js/utils.js',
  '/js/collision.js',
  '/js/physics.js',
  '/js/camera.js',
  '/js/particles.js',
  '/js/lighting.js',
  '/js/scene.js',
  '/js/entities.js',
  '/js/renderer.js',
  '/js/audio.js',
  '/js/level-loader.js',
  '/js/input.js',
  '/js/content.js',
  '/js/ui.js',
  '/js/engine.js',
  '/js/game.js',
  '/assets/icons/favicon.ico',
  '/assets/icons/favicon.svg',
  '/assets/icons/favicon-32.png',
  '/assets/icons/favicon-16.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/levels/level1.json',
  '/levels/level2.json',
  '/levels/level3.json',
  '/levels/level4.json',
  '/levels/level5.json',
  '/levels/level6.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, caché como respaldo (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/index.html')))
    );
    return;
  }

  // Assets: caché primero, revalidación en segundo plano, fetch como fallback.
  event.respondWith(
    caches.match(request).then((hit) => {
      const fetched = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => hit);
      return hit || fetched;
    })
  );
});
