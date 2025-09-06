// PWA 캐시 서비스워커 (매니페스트는 프리캐시에서 제외)
// 다음 릴리스마다 CACHE_VERSION만 올리면 됩니다.
const CACHE_VERSION = 'pwa-cache-v8';
const RUNTIME_CACHE = 'runtime-v8';

const PRECACHE_URLS = [
  './',
  './index.html',
  './icon-192-v2.png',
  './icon-512-v2.png',
];

// 설치: 핵심 파일 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// 활성화: 예전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 업데이트 즉시 적용 메시지
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' && self.skipWaiting) {
    self.skipWaiting();
  }
});

// 요청 가로채기
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // 비-GET은 패스

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // HTML 문서: 네트워크 우선, 실패 시 캐시(또는 index.html)로
  if (
    req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // 정적 리소스: 동일 출처는 캐시 우선, 없으면 네트워크 후 캐시에 저장
  if (isSameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // 교차 출처: 네트워크 우선, 실패 시 캐시
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
