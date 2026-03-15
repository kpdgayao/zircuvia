const CACHE_VERSION = 2;
const CACHE_NAME = `zircuvia-v${CACHE_VERSION}`;
const TILE_CACHE = `zircuvia-tiles-v${CACHE_VERSION}`;
const API_CACHE = `zircuvia-api-v${CACHE_VERSION}`;
const MAX_TILES = 500;

const PRECACHE_URLS = [
  "/",
  "/listings",
  "/map",
  "/saved",
  "/offline",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fonts/geist-latin.woff2",
];

// Install: precache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean all old versioned caches
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, TILE_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Notify clients that a new SW version is available
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for saved items
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-saved") {
    event.waitUntil(syncSavedItems());
  }
});

async function syncSavedItems() {
  try {
    const db = await openSyncDB();
    const tx = db.transaction("pending-saves", "readonly");
    const store = tx.objectStore("pending-saves");
    const items = await idbGetAll(store);

    for (const item of items) {
      try {
        const res = await fetch("/api/saved", {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });
        if (res.ok) {
          const delTx = db.transaction("pending-saves", "readwrite");
          delTx.objectStore("pending-saves").delete(item.id);
        }
      } catch {
        // Will retry on next sync
      }
    }
  } catch {
    // IndexedDB not available
  }
}

function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("zircuvia-sync", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("pending-saves", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Fetch handler with smart routing
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET for caching (except sync-related POSTs)
  if (request.method !== "GET") return;

  // Cache OpenStreetMap tiles: cache-first (tiles don't change often)
  if (url.hostname.includes("tile.openstreetmap.org")) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          const keys = await cache.keys();
          if (keys.length < MAX_TILES) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response("", { status: 408 });
        }
      })
    );
    return;
  }

  // Cache business directory API: network-first
  if (url.pathname === "/api/businesses" && request.method === "GET") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Payment routes: network-only with offline message
  if (
    url.pathname.startsWith("/fees/pay") ||
    url.pathname.startsWith("/fees/checkout")
  ) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div style="text-align:center"><h2>You\'re Offline</h2><p>Internet connection is required to pay the environmental fee.</p><a href="/" style="color:#2E7D32;margin-top:1rem;display:inline-block">Go Home</a></div></body></html>',
            { headers: { "Content-Type": "text/html" } }
          )
      )
    );
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache navigated pages for offline use
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Serve offline page as last resort
          const offlinePage = await caches.match("/offline");
          if (offlinePage) return offlinePage;
          return new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Static assets: cache-first for fonts/images, network-first for others
  const isStaticAsset =
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(woff2?|ttf|png|jpg|svg|ico)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }

  // Default: network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
