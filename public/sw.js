const CACHE = 'aivora-v1'

const PRECACHE = [
  '/',
  '/login',
  '/manifest.json',
  '/logo-aivora.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instalação: pré-cache dos assets essenciais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  )
  self.skipWaiting()
})

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: Network First para API/auth, Cache First para assets estáticos
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requisições não-GET e não-HTTP
  if (request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // API Supabase e auth → sempre rede (nunca cache)
  if (url.hostname.includes('supabase.co')) return

  // Assets estáticos (_next/static) → Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(request, clone))
          }
          return res
        })
      })
    )
    return
  }

  // Páginas e demais recursos → Network First com fallback cache
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request))
  )
})
