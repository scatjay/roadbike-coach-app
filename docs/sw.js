// 離線快取：網路優先（3 秒逾時退回快取）；頁面是靜態的，沒有任何使用者資料
const V = 'rbc-v13';
const FILES = ['./', 'index.html', 'index_light.html', 'start.html', 'ride.html', 'turn.html', 'post.html', 'coach.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'gate.js', 'motion.css', 'layout.css', 'swipe.js', 'motion.js', 'bridge.js', 'bridge_fixtures.js',
  'fixtures/status_ok.json', 'fixtures/status_band_unconfirmed.json', 'fixtures/status_coach_silent.json', 'fixtures/status_riding.json', 'fixtures/status_bridge_down.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 跨來源（含 127.0.0.1 的樞紐 /v1/status）完全不攔：即時狀態不能被快取，也不讓 SW 代發請求（會干擾瀏覽器的本機網路權限與逾時中止）
  if (new URL(e.request.url).origin !== location.origin) return;
  // 有網路就用最新版（開一次就是新的）；3 秒沒回應或離線才退回手機裡存的那份（含網址參數不同的頁面）
  e.respondWith((async () => {
    const cached = () => caches.match(e.request, { ignoreSearch: true });
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 3000);
      const r = await fetch(e.request, { signal: ctl.signal, cache: 'no-cache' });
      clearTimeout(timer);
      if (r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }
      return (await cached()) || r;
    } catch (err) {
      return (await cached()) || Response.error();
    }
  })());
});
