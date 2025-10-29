// IMPORTANT: Increment this version number with each deployment
const CACHE_VERSION = 'ai-tutor-v1.3.1'; // Change v1 to v2, v3, etc. on each deploy
const CACHE_NAME = `ai-tutor-${CACHE_VERSION}`;

const urlsToCache = [
  '/',
  '/index.html',
  '/pustakam-logo.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return Promise.resolve();
            })
          )
        );
      })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that doesn't match current version
          if (cacheName.startsWith('ai-tutor-') && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - Network First strategy for JS/CSS, Cache First for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Skip external requests and chrome extensions
  if (
    url.origin !== self.location.origin ||
    event.request.url.includes('googleapis.com') || 
    event.request.url.includes('bigmodel.cn') ||
    event.request.url.includes('api.mistral.ai') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }

  // Network First for JS/CSS assets (always get latest)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the new version
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First for other static assets (images, fonts, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        
        return fetch(event.request).then(fetchResponse => {
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          const responseToCache = fetchResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache:', event.request.url, err);
            });
          });

          return fetchResponse;
        });
      })
      .catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Listen for messages from the app (for manual updates)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
