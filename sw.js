// Servicio sin conexión de Patiperros: guarda la app completa la primera vez que
// se abre con internet y después la sirve desde el teléfono.
const CACHE = 'patiperros-v02-1';

// Al instalarse lee la página, encuentra sus archivos (código, estilos, icono)
// y los guarda todos, para que una sola visita con internet alcance.
async function guardarApp() {
  const cache = await caches.open(CACHE);
  const respuesta = await fetch('./index.html', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error('No se pudo descargar la app');
  const html = await respuesta.clone().text();
  await cache.put('./index.html', respuesta.clone());
  await cache.put('./', respuesta);
  const archivos = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll([...new Set(archivos)]);
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(guardarApp().then(() => self.skipWaiting()));
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
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(pedido, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(pedido).then((r) => r || caches.match('./index.html'))),
  );
});
