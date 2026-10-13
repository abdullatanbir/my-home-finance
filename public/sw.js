const CACHE = 'my-home-finance-v27';

const APP_ROOT = '/my-home-finance/';

const PRECACHE = [
    APP_ROOT,
    `${APP_ROOT}manifest.webmanifest`,
    `${APP_ROOT}icon.svg`
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('my-home-finance-') && key !== CACHE)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((response) => {
                    const copy = response.clone();

                    caches.open(CACHE).then((cache) => {
                        cache.put(event.request, copy);
                    });

                    return response;
                })
                .catch(() => caches.match(APP_ROOT));
        })
    );
});