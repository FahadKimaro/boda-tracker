// ============================================================
// Boda Tracker — Service Worker
// Enables offline support and "Add to Home Screen" install
// ============================================================

const CACHE = 'boda-v1';

// Files to cache for offline use
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700&display=swap'
];

// Install — cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for static assets, network-first for Supabase API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go to network for Supabase API calls
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({ error: 'You are offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
