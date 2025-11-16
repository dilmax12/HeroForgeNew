const CACHE_NAME = 'heroforge-cache-v1'
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/vite.svg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)))
  )
  self.clients && self.clients.claim && self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const isAsset = url.pathname.startsWith('/assets/') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')
  if (isAsset) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(network => {
          const clone = network.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return network
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then(r => r || caches.match('/index.html')))
  )
})