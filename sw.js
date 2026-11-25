// Servicio sin conexión de Barrio Vivo: guarda la app la primera vez que se abre
// con internet y después la sirve desde el teléfono.
const CACHE = 'barrio-vivo-v1';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  // Primero la red (para recibir versiones nuevas); si no hay conexión, la copia guardada.
  evento.respondWith(
    fetch(pedido)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE).then((c) => c.put(pedido, copia));
        return respuesta;
      })
      .catch(() => caches.match(pedido).then((r) => r || caches.match('./index.html'))),
  );
});
