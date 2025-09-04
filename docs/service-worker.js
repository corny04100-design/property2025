// 아주 단순한 캐시 SW (버전 바꿔 캐시 무효화)
const CACHE = 'ptax-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest?v=2',
  './icon-192-v2.png',
  './icon-512-v2.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
