// service-worker.js
// ✅ 배포할 때마다 CACHE_VERSION만 바꾸면 정적 리소스 캐시가 교체됩니다.
//    HTML은 네트워크 우선이므로 버전 안 올려도 최신이 반영됩니다.
const CACHE_VERSION = 'pwa-cache-v7';
const CACHE_NAME = `ptax-2025-${CACHE_VERSION}`;

// 스코프 기준 절대 URL 생성 (GitHub Pages 하위경로에서도 안전)
const toAbs = (path) => new URL(path, self.location).toString();

// 오프라인 기본 제공 파일(최소 구성)
const CORE_FILES = [
  toAbs('index.html'),
  toAbs('manifest.webmanifest?v=7'),
  toAbs('icon-192-v2.png'),
  toAbs('icon-512-v2.png'),
];

// 설치: 코어 파일 프리캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES))
      .catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리 + 즉시 클라이언트 제어
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 선택: 페이지에서 postMessage('SKIP_WAITING') 보내면 즉시 업데이트
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// 요청 가로채기
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET만 처리
  if (req.method !== 'GET') return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  // ✅ HTML: 네트워크 우선 → 실패 시 캐시 → index.html 폴백
  if (isHTML) {
    event.respondWith(networkFirstForHTML(req));
    return;
  }

  // ✅ 정적 리소스: 캐시 우선
  const isStatic = ['script', 'style', 'font', 'image', 'manifest'].includes(req.destination);
  if (isStatic) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 기타: 캐시 우선
  event.respondWith(cacheFirst(req));
});

// ---- 전략 구현 ----

// HTML 네트워크 우선
async function networkFirstForHTML(req) {
  try {
    const netRes = await fetch(req, { cache: 'no-store' });
    // 성공 시 캐시에 넣어 오프라인 대비
    caches.open(CACHE_NAME).then((cache) => cache.put(req, netRes.clone())).catch(() => {});
    return netRes;
  } catch {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fallback = await caches.match(toAbs('index.html'));
    if (fallback) return fallback;
    return new Response('<h1>오프라인입니다</h1>', {
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
      status: 503,
      statusText: 'Offline',
    });
  }
}

// 정적 리소스 캐시 우선
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const res = await fetch(req).catch(() => null);
  if (!res) return new Response('', { status: 504, statusText: 'Gateway Timeout' });

  caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone())).catch(() => {});
  return res;
}
