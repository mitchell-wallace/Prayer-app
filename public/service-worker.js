const CACHE_NAME = 'prayer-app-shell-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/service-worker.js', '/icons/icon.svg'];
const ASSET_PATTERN = /["'](\/assets\/[^"'>\s]+\.(?:js|css))["']/g;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(APP_SHELL);
        await precacheBuildAssets(cache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(event));
});

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(event.request);

  const networkFetch = fetch(event.request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    })
    .catch(async () => {
      if (event.request.mode === 'navigate') {
        const fallback = await cache.match('/index.html');
        if (fallback) return fallback;
      }
      return cachedResponse;
    });

  if (cachedResponse) {
    event.waitUntil(networkFetch.catch(() => undefined));
    return cachedResponse;
  }

  const response = await networkFetch;
  if (response) return response;

  if (event.request.mode === 'navigate') {
    const fallback = await cache.match('/index.html');
    if (fallback) return fallback;
  }

  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function precacheBuildAssets(cache) {
  try {
    const response = await fetch('/index.html', { cache: 'no-cache' });

    if (!response || !response.ok) return;

    const responseClone = response.clone();
    cache.put('/index.html', responseClone);

    const html = await response.text();
    const assets = Array.from(html.matchAll(ASSET_PATTERN), (match) => match[1]);
    const uniqueAssets = [...new Set(assets)];

    await Promise.all(uniqueAssets.map((asset) => cache.add(new Request(asset, { cache: 'no-cache' }))));
  } catch (error) {
    console.error('Failed to precache build assets', error);
  }
}
