const CACHE_NAME = "zircuvia-v1";
const TILE_CACHE = "zircuvia-tiles";
const API_CACHE = "zircuvia-api";
const MAX_TILES = 500;

const PRECACHE_URLS = ["/", "/listings", "/map", "/saved", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== TILE_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache OpenStreetMap tiles
  if (url.hostname.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        const keys = await cache.keys();
        if (keys.length < MAX_TILES) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => new Response("", { status: 408 }))
    );
    return;
  }

  // Cache business directory API
  if (url.pathname === "/api/businesses" && request.method === "GET") {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(API_CACHE).then((cache) => cache.put(request, clone));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Offline message for fee payment
  if (url.pathname.startsWith("/fees/pay") || url.pathname.startsWith("/fees/checkout")) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        "<html><body style='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><div style='text-align:center'><h2>You're Offline</h2><p>Internet connection is required to pay the environmental fee.</p></div></body></html>",
        { headers: { "Content-Type": "text/html" } }
      ))
    );
    return;
  }

  // Default: network first, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
