// =============================================================================
// POS Service Worker — Cache-first for assets, Network-first for API
// =============================================================================

const CACHE_VERSION = 'pos-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// API paths that should be cached for offline use
const CACHEABLE_API_PATHS = [
  '/api/products',
  '/api/payment_types',
  '/api/stores',
  '/api/taxes',
  '/api/discounts',
  '/api/categories',
  '/api/brands',
  '/api/settings',
];

// Install — pre-cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Silently skip if any precache URL fails (dev mode, etc.)
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch — route strategy based on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (POST orders, etc. go straight to network)
  if (event.request.method !== 'GET') return;

  // Skip chrome-extension, dev HMR, and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // API requests — Network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    const isCacheableApi = CACHEABLE_API_PATHS.some((path) =>
      url.pathname.startsWith(path)
    );

    if (isCacheableApi) {
      event.respondWith(networkFirstWithCache(event.request));
    }
    // Non-cacheable API calls: let them pass through to network
    return;
  }

  // Static assets (JS, CSS, images, fonts) — Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Navigation requests — Network-first (SPA — serve index.html from cache if offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
});

// ── Strategies ──

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are offline' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match('/');
    if (cached) return cached;
    return new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ── Helpers ──

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)(\?.*)?$/.test(pathname);
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
