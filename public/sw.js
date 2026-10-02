const CACHE = 'lattey-walla-static-v1'
const OFFLINE = '/offline'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/account') || url.pathname.startsWith('/orders') || url.pathname.startsWith('/checkout') || url.pathname.startsWith('/order-success')) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE)))
    return
  }
  if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/icons/')) return
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); return response })))
})

// Web-push receiving is intentionally not enabled until a server-side push provider is configured.
self.addEventListener('push', () => {})
