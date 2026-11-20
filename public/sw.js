// Brewed With Code: service worker (installable app). Deliberately small and safe:
//  · pages (HTML) are NETWORK-FIRST: you always get the newest deploy; the cached copy is only a fallback offline
//  · the game's code bundles (/assets/<name>-<hash>.js|css) are CACHE-FIRST: their names change every build, so a cached
//    one can never be stale; old ones are pruned
//  · 3D models / textures are NOT cached here (they're big): the browser's normal HTTP cache handles them
// No claim of full offline play: without a connection the 3D assets still need the network.
const PAGES = 'bwc-pages-v1', CODE = 'bwc-code-v1', MAX_CODE = 40
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (![PAGES, CODE].includes(k)) await caches.delete(k)
  await self.clients.claim()
})()))
const isCode = (u) => /\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(u.pathname)
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return
  const u = new URL(req.url); if (u.origin !== location.origin) return
  if (req.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/')) {
    e.respondWith((async () => {
      try { const res = await fetch(req); if (res.ok) (await caches.open(PAGES)).put(req, res.clone()); return res }
      catch { return (await caches.match(req)) || new Response('<h1 style="font-family:sans-serif;color:#5e2a75">You\u2019re offline ☕</h1><p style="font-family:sans-serif">Brewed With Code needs a connection to load. Try again in a moment.</p>', { headers: { 'content-type': 'text/html' } }) }
    })())
    return
  }
  if (isCode(u)) {
    e.respondWith((async () => {
      const c = await caches.open(CODE), hit = await c.match(req); if (hit) return hit
      const res = await fetch(req); if (res.ok) { await c.put(req, res.clone()); const keys = await c.keys(); for (const k of keys.slice(0, Math.max(0, keys.length - MAX_CODE))) await c.delete(k) }
      return res
    })())
  }
})
