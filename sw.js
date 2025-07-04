// ===== SERVICE WORKER - DRINKS APP PWA =====

const CACHE_NAME = 'drinks-app-v1.2';
const STATIC_CACHE = 'drinks-static-v1.2';
const DYNAMIC_CACHE = 'drinks-dynamic-v1.2';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/drinks-data.js',
    '/manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
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
                console.error('Service Worker: Cache failed', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => {
                        if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cache);
                            return caches.delete(cache);
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

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip cross-origin requests
    if (url.origin !== location.origin && !isAllowedCDN(url.origin)) {
        return;
    }
    
    event.respondWith(
        cacheFirst(request)
    );
});

// Cache strategies
async function cacheFirst(request) {
    try {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('Service Worker: Serving from cache', request.url);
            return cachedResponse;
        }
        
        // If not in cache, fetch from network
        console.log('Service Worker: Fetching from network', request.url);
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put(request, responseClone);
            console.log('Service Worker: Added to cache', request.url);
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Service Worker: Fetch failed', error);
        
        // Return offline fallback if available
        return await getOfflineFallback(request);
    }
}

async function getOfflineFallback(request) {
    const url = new URL(request.url);
    
    // Return main page for navigation requests when offline
    if (request.mode === 'navigate') {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) {
            return cachedIndex;
        }
    }
    
    // Return offline page for other requests
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'Esta funcionalidade não está disponível offline'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'application/json'
            })
        }
    );
}

function isAllowedCDN(origin) {
    const allowedCDNs = [
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
        'https://unpkg.com'
    ];
    
    return allowedCDNs.some(cdn => origin.startsWith(cdn));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

async function syncFavorites() {
    try {
        // Sync favorites with server when back online
        const favorites = await getStoredFavorites();
        if (favorites.length > 0) {
            console.log('Service Worker: Syncing favorites', favorites);
            // Here you would sync with your backend API
        }
    } catch (error) {
        console.error('Service Worker: Sync failed', error);
    }
}

async function getStoredFavorites() {
    // This would get favorites from IndexedDB or localStorage
    return [];
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    console.log('Service Worker: Push received', event);
    
    const options = {
        body: event.data ? event.data.text() : 'Nova receita disponível!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Ver receita',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Fechar',
                icon: '/icons/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Drinks App', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_NAMES') {
        event.ports[0].postMessage({
            cacheNames: [STATIC_CACHE, DYNAMIC_CACHE]
        });
    }
});

// Update available notification
self.addEventListener('updatefound', () => {
    console.log('Service Worker: Update found');
    
    const newWorker = self.registration.installing;
    newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('Service Worker: Update available');
            // Notify the main thread about update
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'UPDATE_AVAILABLE'
                    });
                });
            });
        }
    });
});

console.log('Service Worker: Loaded successfully'); 