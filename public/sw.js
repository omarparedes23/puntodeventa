const SHELL_CACHE = 'marketpos-shell-v1'
const OFFLINE_URL = '/offline'

// Shell + offline page pre-cacheada en install
const PRECACHE_URLS = [OFFLINE_URL, '/pos', '/inventario', '/clientes']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Nunca interceptar: Supabase, rutas API, HMR, ni métodos no-GET
  if (
    request.method !== 'GET' ||
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/webpack-hmr')
  ) {
    return
  }

  // Cache-first para chunks estáticos de Next.js (tienen hash en el nombre)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
          return res
        })
      })
    )
    return
  }

  // Network-first para navegación — fallback a /offline si no hay red ni caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          return caches.match(OFFLINE_URL)
        })
    )
  }
})
