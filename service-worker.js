const CACHE_NAME = 'fxcalcos-cache-v1';

// Archivos propios de la app: se guardan en caché apenas se instala
const ARCHIVOS_PROPIOS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_PROPIOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(nombre => nombre !== CACHE_NAME)
          .map(nombre => caches.delete(nombre))
      )
    )
  );
  self.clients.claim();
});

// Estrategia: primero caché, y si no está, va a la red y lo guarda para la próxima.
// Esto cubre tanto los archivos propios como recursos externos (jsPDF, tipografías),
// que quedan disponibles offline después de usarse una vez con conexión.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cacheado => {
      if (cacheado) return cacheado;

      return fetch(event.request)
        .then(respuestaRed => {
          if (respuestaRed && respuestaRed.status === 200) {
            const copia = respuestaRed.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
          }
          return respuestaRed;
        })
        .catch(() => {
          // sin caché y sin red: si pedían la página principal, mostramos igual el shell guardado
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
