/* Service worker FAZA 3D Atelier : application installable, cache de l'interface, notifications */
const VERSION = 'v4.1.2';
const CACHE = 'faza3d-' + VERSION;
const SHELL = ['/', '/app.css', '/theme.js', '/core.js', '/v-travail.js', '/v-prod.js', '/v-ventes.js', '/v-gestion.js', '/v-gestion2.js', '/icone.svg', '/polices/Inter-Regular.otf', '/polices/Inter-SemiBold.otf', '/icones/icone-192.png', '/icones/icone-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('faza3d-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // données, photos, fichiers, PDF : toujours le réseau
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/photos/') || url.pathname.startsWith('/fichiers/') || url.pathname.startsWith('/webhook/')) return;
  // interface : réseau d'abord (toujours à jour), cache si hors ligne
  e.respondWith(fetch(e.request).then(r => { if (r.ok && (SHELL.includes(url.pathname) || url.pathname === '/')) { const c = r.clone(); caches.open(CACHE).then(x => x.put(url.pathname === '/' ? '/' : e.request, c)); } return r; })
    .catch(() => caches.match(url.pathname === '/' || url.pathname === '/index.html' ? '/' : e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('/') : Response.error()))));
});
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'FAZA 3D', body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    // si la plateforme est déjà ouverte et visible, pas de notification
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some(w => w.visibilityState === 'visible' && w.focused) && !d.force) return;
    await self.registration.showNotification(d.title || 'FAZA 3D Atelier', { body: d.body || '', icon: '/icones/icone-192.png', badge: '/icones/icone-192.png', tag: d.tag || 'faza3d', renotify: !!d.tag, data: { url: d.url || '/' }, vibrate: [100, 50, 100] });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
    for (const w of wins) { if ('focus' in w) { w.navigate(url); return w.focus(); } }
    return self.clients.openWindow(url);
  }));
});
