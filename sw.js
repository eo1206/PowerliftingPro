const CACHE_NAME = "gymlog-v16";

const APP_SHELL = [
  "./",
  "./index.html",
  "./inicio.html",
  "./crear.html",
  "./rutina.html",
  "./progreso.html",
  "./Herramientas.html",
  "./ranking.html",
  "./style.css?v=13",
  "./firebase.js",
  "./auth.js",
  "./inicio.js",
  "./crear.js",
  "./catalogo-ejercicios.js",
  "./rutinas.js",
  "./progreso.js",
  "./herramientas.js",
  "./ranking.js",
  "./guard.js",
  "./conexion.js",
  "./utils.js",
  "./pwa.js",
  "./dialog.js",
  "./settings.js",
  "./js/pages/herramientas-page.js",
  "./js/features/herramientas/calculadoras.js",
  "./js/features/herramientas/discos.js",
  "./js/ui/settings-modal.js",
  "./js/core/settings-store.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isPage = event.request.mode === "navigate";
  const isCodeAsset = ["style", "script", "worker"].includes(event.request.destination);

  if (isPage || isCodeAsset) {
    event.respondWith(
      networkFirst(event.request).catch(async () => {
        if (isPage) return caches.match("./index.html");
        return Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    })
  );
});
