const CACHE_NAME = 'doorvi-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/morador.html',
    '/visitante.html',
    '/manifest.json',
    'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache aberto');
                return cache.addAll(urlsToCache);
            })
            .catch((error) => {
                console.error('Erro ao cachear recursos:', error);
            })
    );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone da requisição
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    (response) => {
                        // Verificar se resposta é válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone da resposta
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                ).catch(() => {
                    // Fallback para offline
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});

// Notificações push
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Nova chamada recebida',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'accept',
                title: 'Atender',
                icon: '/icons/icon-96x96.png'
            },
            {
                action: 'reject',
                title: 'Recusar',
                icon: '/icons/icon-96x96.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Doorvi - Nova Chamada', options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'accept') {
        event.waitUntil(
            clients.openWindow('/morador.html')
        );
    } else if (event.action === 'reject') {
        // Ação de rejeitar
    } else {
        // Clique padrão na notificação
        event.waitUntil(
            clients.openWindow('/morador.html')
        );
    }
});
