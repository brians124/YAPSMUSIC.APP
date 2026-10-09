/* YAPS Music — Service Worker
 * Gives the app: instant repeat loads, offline app shell, cached images/fonts/CDN libs,
 * an offline fallback page, update-on-demand, and push notification handling.
 *
 * Bump VERSION on every deploy that changes index.html or other shell files —
 * that is what triggers the in-app "update available" bar.
 */
const VERSION = 'v2';
const SHELL_CACHE   = 'yaps-shell-'   + VERSION;
const RUNTIME_CACHE = 'yaps-runtime-' + VERSION;
const IMAGE_CACHE   = 'yaps-images-'  + VERSION;
const CDN_CACHE     = 'yaps-cdn-'     + VERSION;
const ALL_CACHES = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE, CDN_CACHE];

const MAX_IMAGES  = 400;   // cover art + artist photos
const MAX_RUNTIME = 80;
const NAV_TIMEOUT = 4000;  // ms to wait for network before falling back to cached shell

// Cached at install. Each is added individually, so one missing file never breaks install.
const PRECACHE = [
  './',
  'index.html',
  'studio.html',
  'manifest.json',
  'images/yaps-cover.png?v=2',
  'images/yaps-music-cover.jpg',
  'images/g2w-gospel-to-the-world.png'
];

const CDN_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];
// Never touched by the SW: live data, auth, and third-party streaming.
const BYPASS_HOSTS = /(\.supabase\.co|youtube\.com|youtu\.be|ytimg\.com|googlevideo\.com|onrender\.com)$/i;
const MEDIA_EXT = /\.(mp3|m4a|aac|wav|ogg|opus|flac|mp4|webm|mov)$/i;

const OFFLINE_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="theme-color" content="#050b22"><title>YAPS Music — Offline</title>' +
  '<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;' +
  'justify-content:center;gap:12px;background:#050b22;color:#e8eefc;font-family:system-ui,sans-serif;' +
  'text-align:center;padding:24px}h1{font-size:22px;margin:0}p{margin:0;opacity:.75;max-width:320px;' +
  'line-height:1.5}button{margin-top:8px;padding:12px 28px;border:0;border-radius:999px;' +
  'background:#2f7bff;color:#fff;font-size:15px;font-weight:600}</style></head><body>' +
  '<h1>You\'re offline</h1><p>Open the app once while connected so it can save itself for offline use. ' +
  'Downloaded tracks stay playable.</p><button onclick="location.reload()">Try again</button></body></html>';

const IMG_PLACEHOLDER = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
  '<rect width="400" height="400" fill="#0b1535"/><circle cx="200" cy="200" r="70" fill="none" stroke="#2f7bff" stroke-width="10" opacity=".5"/>' +
  '<circle cx="200" cy="200" r="14" fill="#2f7bff" opacity=".5"/></svg>';

/* ───────────── install / activate ───────────── */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(PRECACHE.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    // No skipWaiting() here on purpose: the app shows an update bar and sends SKIP_WAITING when the user agrees.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('yaps-') && !ALL_CACHES.includes(k)).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const d = event.data;
  const type = typeof d === 'string' ? d : d && d.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('yaps-')).map(k => caches.delete(k)))));
  }
});

/* ───────────── helpers ───────────── */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);   // oldest first
}

function cacheable(res) {
  return res && (res.ok || res.type === 'opaque');
}

async function staleWhileRevalidate(event, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  const network = fetch(event.request).then(res => {
    if (cacheable(res)) {
      cache.put(event.request, res.clone()).then(() => max && trim(cacheName, max)).catch(() => {});
    }
    return res;
  }).catch(() => null);
  if (cached) { event.waitUntil(network); return cached; }
  return (await network) || Response.error();
}

async function cacheFirst(event, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  try {
    const res = await fetch(event.request);
    if (cacheable(res)) {
      cache.put(event.request, res.clone()).then(() => max && trim(cacheName, max)).catch(() => {});
    }
    return res;
  } catch (e) {
    return new Response(IMG_PLACEHOLDER, { headers: { 'Content-Type': 'image/svg+xml' } });
  }
}

function shellKey(url) {
  return new URL(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname, url.origin).href;
}

async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const cache = await caches.open(SHELL_CACHE);
  const key = shellKey(url);
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const res = preload || await Promise.race([
      fetch(event.request),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), NAV_TIMEOUT))
    ]);
    if (res && res.ok) cache.put(key, res.clone()).catch(() => {});   // ?page=… / ?go=… deep links share one cached shell
    return res;
  } catch (e) {
    const hit = await cache.match(key) ||
                await cache.match(new URL('index.html', self.registration.scope).href) ||
                await cache.match(self.registration.scope);
    return hit || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

/* ───────────── fetch routing ───────────── */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;                       // audio/video seeking — let the browser handle it
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (BYPASS_HOSTS.test(url.hostname)) return;                // live data + streaming: network only
  if (req.destination === 'audio' || req.destination === 'video' || MEDIA_EXT.test(url.pathname)) return;   // downloads live in IndexedDB

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (url.origin === self.location.origin) {
    if (req.destination === 'image') {
      event.respondWith(staleWhileRevalidate(event, IMAGE_CACHE, MAX_IMAGES));
    } else {
      event.respondWith(staleWhileRevalidate(event, RUNTIME_CACHE, MAX_RUNTIME));
    }
    return;
  }

  if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, CDN_CACHE));
    return;
  }

  if (req.destination === 'image') {                          // remote cover art (e.g. Unsplash)
    event.respondWith(cacheFirst(event, IMAGE_CACHE, MAX_IMAGES));
  }
});

/* ───────────── push notifications ─────────────
 * Expected payload (JSON): { title, body, url, icon, badge, tag }
 */
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'YAPS Music', {
    body: d.body || '',
    icon: d.icon || 'images/yaps-cover.png',
    badge: d.badge || 'images/yaps-cover.png',
    tag: d.tag || undefined,
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope) && 'focus' in w) {
        await w.focus();
        if ('navigate' in w) { try { await w.navigate(target); } catch (e) {} }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
