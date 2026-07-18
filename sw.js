// ══════════════════════════════════════════════════════════
//  YAPS Music — Service Worker
//  Strategy:
//    - App shell (HTML/manifest/icons): network-first, falls back to cache,
//      so users always get the newest build when online but still get an
//      app when offline.
//    - Static assets (fonts, CDN scripts/styles, images): cache-first with
//      background revalidation (stale-while-revalidate) for speed.
//    - Media (audio/video streams): NOT cached — always network, streamed.
// ══════════════════════════════════════════════════════════

const SW_VERSION   = 'v1.1.0';
const SHELL_CACHE   = `yaps-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `yaps-runtime-${SW_VERSION}`;

// Core files needed for the app to boot offline.
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './images/yaps-cover.png'
];

// CDN assets (fonts/icons) worth warming up on install so real icons/type
// survive offline too, not just the emoji fallbacks baked into index.html.
// Fetched individually — unlike cache.addAll(), one failure here can't
// cancel caching of everything else.
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Narrow:wght@400;500;600;700&display=swap'
];

// File types we're happy to cache aggressively (fonts, css, js, images/icons).
const CACHEABLE_DEST = new Set(['style', 'script', 'font', 'image']);

// Never cache/interfere with streaming media, API calls, or Supabase realtime.
const NEVER_CACHE = [
  /\/rest\/v1\//,
  /\/auth\/v1\//,
  /\/realtime\/v1\//,
  /\/storage\/v1\/object\/sign/,
  /supabase\.co/,
  /\.(mp3|mp4|m4a|wav|ogg|webm|mov)(\?|$)/i
];

// Cache each URL independently so one bad fetch doesn't block the rest.
async function warmCache(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(
    urls.map(async url => {
      try {
        const req = new Request(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) {
          await cache.put(url, res);
        }
      } catch (err) {
        console.log('[SW] Skipped caching (will retry via runtime cache):', url);
      }
    })
  );
}

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      warmCache(SHELL_CACHE, SHELL_ASSETS),
      warmCache(RUNTIME_CACHE, CDN_ASSETS)
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isNeverCache(url) {
  return NEVER_CACHE.some(rx => rx.test(url));
}

// Network-first for navigations (HTML) so users always get the latest app,
// with an offline fallback to the cached shell.
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put('./index.html', fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    const cached = await cache.match('./index.html') || await cache.match('./');
    if (cached) return cached;
    return new Response(
      '<h1>YAPS Music</h1><p>You are offline and no cached version is available yet. Reconnect and reload once to enable offline mode.</p>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Stale-while-revalidate for static assets: serve cached instantly, update in background.
async function handleStatic(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || networkFetch;
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;
  if (isNeverCache(url)) return; // let it hit the network untouched

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (CACHEABLE_DEST.has(request.destination)) {
    event.respondWith(handleStatic(request));
  }
});

// Allow the page to trigger an immediate update (e.g. from an "update available" toast).
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
