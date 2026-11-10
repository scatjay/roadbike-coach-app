// 離線快取：先讀快取、背景更新（頁面是靜態的，沒有任何使用者資料）
const V = 'rbc-v5';
const FILES = ['./', 'index.html', 'index_light.html', 'start.html', 'ride.html', 'turn.html', 'post.html', 'coach.html', 'manifest.webmanifest', 'icon.svg', 'gate.js', 'motion.css', 'motion.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
