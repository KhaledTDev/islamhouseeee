// Service Worker for Islamic Content App
// Provides offline functionality and caching

const CACHE_NAME = 'islamic-content-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;600;700&display=swap'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/api3\.islamhouse\.com/
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache static files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE)
        .then(cache => {
          return fetch(request)
            .then(response => {
              // Cache successful API responses
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return cached response if network fails
              return cache.match(request);
            });
        })
    );
    return;
  }
  
  // Handle static files
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If not in cache, fetch from network
          return fetch(request)
            .then(response => {
              // Cache the response for future use
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE)
                  .then(cache => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Return offline page for navigation requests
              if (request.mode === 'navigate') {
                return caches.match('/index.html');
              }
            });
        })
    );
  }
});

// Background sync for failed requests
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // Retry failed requests here
      retryFailedRequests()
    );
  }
});

// Push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'استكشاف',
          icon: '/icon-explore.png'
        },
        {
          action: 'close',
          title: 'إغلاق',
          icon: '/icon-close.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to retry failed requests
async function retryFailedRequests() {
  // Implementation for retrying failed requests
  console.log('Retrying failed requests...');
}

// Message handler for communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
