// Paste at the END of your sw.js (keep your existing install/activate/fetch code).
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data && event.data.text() }; }
  event.waitUntil(self.registration.showNotification(d.title || 'YAPS Music', {
    body: d.body || '',
    icon: d.icon || 'images/yaps-cover.png',
    badge: 'images/yaps-cover.png',
    tag: d.tag || 'yaps',
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil((async () => {
    const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) { await c.focus(); return; } }
    await clients.openWindow(url);
  })());
});
