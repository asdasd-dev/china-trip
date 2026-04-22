const VERSION = '20260422-2156';
const CACHE = 'china-trip-' + VERSION;

// Только локальные файлы — CDN кэшируется через fetch handler при первом обращении
const PRECACHE = [
    './',
    './plan.md',
    './checklist.md',
    './budget.md',
    './info.md',
    './places.md',
    './manifest.json',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(PRECACHE))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);
    // Не кэшируем Firebase, version.txt и не-GET запросы
    if (url.hostname.includes('firebasedatabase') || url.pathname.endsWith('version.txt') || e.request.method !== 'GET') return;

    e.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(e.request).then(cached => {
                // Всегда идём в сеть для обновления кэша в фоне
                const networkFetch = fetch(e.request).then(r => {
                    if (r.ok) cache.put(e.request, r.clone());
                    return r;
                });
                if (cached) {
                    // Есть кэш — отдаём сразу, сеть обновляет в фоне (не блокирует)
                    networkFetch.catch(() => {});
                    return cached;
                }
                // Нет кэша — ждём сеть (если упадёт, браузер получит нормальную сетевую ошибку)
                return networkFetch;
            })
        )
    );
});
