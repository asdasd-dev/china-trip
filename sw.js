const VERSION = '20260422-1737';
const CACHE = 'china-trip-' + VERSION;

const PRECACHE = [
    './',
    './plan.md',
    './checklist.md',
    './budget.md',
    './info.md',
    './places.md',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
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
    // Не кэшируем Firebase и не-GET запросы
    if (url.hostname.includes('firebasedatabase') || e.request.method !== 'GET') return;

    e.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(e.request).then(cached => {
                // Фоновое обновление кэша
                const fresh = fetch(e.request).then(r => {
                    if (r.ok) cache.put(e.request, r.clone());
                    return r;
                }).catch(() => null);
                // Отдаём кэш сразу, если есть — иначе ждём сеть
                return cached || fresh;
            })
        )
    );
});
