// 간단한 PWA 캐시 서비스워커
// 배포할 때마다 CACHE_VERSION 숫자를 바꿔주면 캐시가 갱신됩니다.
const CACHE_VERSION = 'pwa-cache-v5';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest?v=5',
  './icon-192-v2.png',
  './icon-512-v2.png'
];

// 설치 단계: 필요한 파일 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// 활성화 단계: 이전 캐시 제거
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 가로채기: 네트워크 우선, 실패 시 캐시 응답
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
