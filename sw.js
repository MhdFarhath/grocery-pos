/*
  sw.js
  Service worker for the app shell (HTML/CSS/JS/icons) so the app opens
  instantly and "install as app" works on phones. This does NOT cache
  Supabase API calls or the Supabase library - those always go straight
  to the network, since cached sales/inventory data would go stale
  immediately in a live POS. Live data still requires an internet
  connection; only the app's own shell works offline.
*/

const CACHE_NAME = "mla-pos-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/config.js",
  "./js/state.js",
  "./js/db.js",
  "./js/utils.js",
  "./js/dialogs.js",
  "./js/drawers.js",
  "./js/pagination.js",
  "./js/catalog.js",
  "./js/cart.js",
  "./js/checkout.js",
  "./js/sales.js",
  "./js/creditors.js",
  "./js/cheques.js",
  "./js/settings.js",
  "./js/render.js",
  "./js/events.js",
  "./js/main.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle our own GET requests - Supabase API calls and any other
  // cross-origin requests are left completely untouched, always network.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
