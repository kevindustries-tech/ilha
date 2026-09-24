const CACHE = 'ilha-v4.2';
const APP = ['./', './index.html', './app.js', './scene.js', './state.js', './nuvem.js', './manifest.json', './icon-180.png', './icon-512.png'];
// Bibliotecas de CDN com versao fixa: nao mudam, entao vale guardar pra funcionar offline.
const CDN_FIXO = ['cdn.jsdelivr.net/npm/three@', 'cdn.jsdelivr.net/npm/@supabase/'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;            // POST/PATCH do Supabase passam direto
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // arquivos do app: rede primeiro (pega atualizacoes), cache se estiver offline
    e.respondWith(
      fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
                .catch(() => caches.match(req)));
    return;
  }

  if (CDN_FIXO.some(p => (url.host + url.pathname).startsWith(p))) {
    e.respondWith(
      caches.match(req).then(hit => hit ||
        fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
    return;
  }

  // Todo o resto — e principalmente a API do Supabase — passa direto, sem cache.
  // A versao antiga fazia "cache primeiro" pra tudo que nao era do proprio site:
  // a gravacao ia pro banco certinho, mas a leitura seguinte vinha do cache do
  // service worker, entao o app enxergava sempre o mesmo save velho.
});
