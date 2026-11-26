// offline support: the game page is fetched fresh when online (so updates show up), everything else is cached
const CACHE = 'pest-panic-v1.248.750';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/ext2-192.png', 'icons/ext2-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/supabase\.co$/.test(url.hostname) || url.pathname.includes('/rest/v1/')) return;   // leaderboard and other live data: always from the network, never a saved copy
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    const net = fetch(req.url, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; });
    const saved = () => caches.match(req).then(r => r || caches.match('index.html'));
    // a weak or dead connection used to leave the app stuck on its splash screen: after 4 seconds the saved copy opens instead (the fresh one is saved for next time)
    e.respondWith(new Promise(res => { let done = false; const go = r => { if (!done && r) { done = true; res(r); } };
      const t = setTimeout(() => saved().then(r => r ? go(r) : null), 4000);
      net.then(r => { clearTimeout(t); go(r); }).catch(() => { clearTimeout(t); saved().then(r => go(r || Response.error())); }); }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; })));
});
