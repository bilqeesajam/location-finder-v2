const APP_CACHE = "findr-app-v1";
const RUNTIME_CACHE = "findr-runtime-v1";
const MAP_CACHE = "findr-map-v1";
const API_CACHE = "findr-api-v1";

const APP_SHELL_ASSETS = ["/", "/index.html", "/favicon.ico", "/placeholder.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const validCaches = [APP_CACHE, RUNTIME_CACHE, MAP_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    const cached = await cache.match(request);
    const networkFetch = fetch(request)
      .then((response) => {
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => undefined);

    return cached || networkFetch || Response.error();
  });
}

function networkFirst(request, cacheName) {
  return caches.open(cacheName).then(async (cache) => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      return cached || Response.error();
    }
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  const isMapRequest =
    url.hostname.includes("maptiler.com") || url.hostname.includes("cartocdn.com");
  const isLocationApiRequest =
    url.pathname.includes("/rest/v1/locations") ||
    url.pathname.includes("/rest/v1/live_locations");
  const isSameOrigin = url.origin === self.location.origin;

  if (isMapRequest) {
    event.respondWith(staleWhileRevalidate(request, MAP_CACHE));
    return;
  }

  if (isLocationApiRequest) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (isSameOrigin && ["document", "script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
