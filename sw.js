// ==========================================================
//  YAPS Music - Service Worker
//  Strategy:
//    - App shell (HTML/manifest/icons): network with a short timeout, then the
//      cached copy (refreshed in the background), so pages open fast and users
//      still get the newest build on a good connection and an app when offline.
//    - Static assets (fonts, CDN scripts/styles, images): cache-first with
//      background revalidation (stale-while-revalidate) for speed.
//    - Media (audio/video streams): NOT cached - always network, streamed.
// ==========================================================

const SW_VERSION   = 'v1.3.1';
const SHELL_CACHE   = `yaps-shell-${SW_VERSION}`;
const RUNTIME_CACHE = `yaps-runtime-${SW_VERSION}`;

// Core files needed for the app to boot offline.
const SHELL_ASSETS = [
  './',
  './index.html',
  './studio.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './images/yaps-cover.png'
];

// CDN assets (fonts/icons) worth warming up on install so real icons/type
// survive offline too, not just the emoji fallbacks baked into index.html.
// Fetched individually - unlike cache.addAll(), one failure here can't
