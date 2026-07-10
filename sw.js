const CACHE_NAME = "powerlifting-pro-v1";

const ARCHIVOS_APP = [
  "/",
  "/index.html",
  "/rutina.html",
  "/crear.html",
  "/progreso.html",
  "/Herramientas.html",

  "/style.css",

  "/firebase.js",
  "/auth.js",
  "/inicio.js",
  "/rutina.js",
  "/crear.js",
  "/progreso.js",
  "/herramientas.js",

  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Instalar y guardar archivos principales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const archivo of ARCHIVOS_APP) {
          try {
            await cache.add(archivo);
          } catch (error) {
            console.warn("No se pudo guardar en caché:", archivo);
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Eliminar versiones antiguas del caché
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== CACHE_NAME)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Servir archivos desde caché cuando no hay internet
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // No interferir directamente con las peticiones internas de Firestore
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com")
  ) {
    return;
  }

  // Navegación HTML: intentar internet y después caché
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copia = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, copia);
          });

          return response;
        })
        .catch(async () => {
          const pagina = await caches.match(request);

          if (pagina) {
            return pagina;
          }

          return caches.match("/index.html");
        })
    );

    return;
  }

  // CSS, JS, imágenes y módulos externos:
  // usar caché primero y actualizar cuando haya internet
  event.respondWith(
    caches.match(request).then((guardado) => {
      const respuestaRed = fetch(request)
        .then((response) => {
          if (
            response &&
            (response.status === 200 || response.type === "opaque")
          ) {
            const copia = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copia);
            });
          }

          return response;
        })
        .catch(() => guardado);

      return guardado || respuestaRed;
    })
  );
});