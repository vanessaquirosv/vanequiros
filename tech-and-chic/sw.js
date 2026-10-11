// ═══════════════════════════════════════════════════════════════
// Tech & Chic — service worker
// Hace la tienda instalable como app (Android exige un SW con
// manejador de fetch) y permite abrirla sin señal.
//  · Archivos propios: red primero, caché de respaldo → cada
//    despliegue se ve de inmediato y sin conexión sigue abriendo.
//  · Tailwind / fuentes: caché primero y se refresca en segundo plano.
//  · Firebase, Apps Script e imágenes de productos: NO se tocan
//    (el catálogo ya se cachea por versión en localStorage).
// ═══════════════════════════════════════════════════════════════
const VERSION = 'tc-v1';
const SHELL = `${VERSION}-shell`;
const CDN = `${VERSION}-cdn`;

const PRECACHE = [
  './',
  './index.html',
  './css/tc.css',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  '../img/T%26C%20Logo_WebReTouch.png',
];

const CDN_HOSTS = new Set(['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(PRECACHE))
      .catch(() => { /* sin red al instalar: se llenará al navegar */ })
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // firebase-config.js lo genera el deploy: nunca servirlo desde caché vieja
    if (url.pathname.endsWith('/firebase-config.js')) return;
    event.respondWith(networkFirst(req));
    return;
  }
  if (CDN_HOSTS.has(url.hostname)) event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CDN);
  const hit = await cache.match(req);
  const fresh = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || fresh;
}
