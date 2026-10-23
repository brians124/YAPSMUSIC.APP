/* Paste at the END of sw.js (same folder as index.html, so its scope covers the whole app).
   If sw.js already has a 'push' listener, merge instead of duplicating.
   After editing sw.js, bump its cache/version string so browsers install the new worker. */

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { title: 'YAPS Music', body: event.data ? event.data.text() : '' }; }

  const title = d.title || 'YAPS Music';
  const options = {
    body: d.body || '',
    icon: d.icon || 'images/yaps-music-cover.jpg',   // ← change to a square PNG (192x192+) if you have one
    badge: d.badge || 'images/yaps-music-cover.jpg',  // ← ideally a small monochrome PNG
    tag: d.tag || undefined,                          // same tag = replaces the older notification
    renotify: !!d.tag,
    data: { url: d.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin) {
        await w.focus();
        if ('navigate' in w) { try { await w.navigate(target); } catch (e) {} }
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
