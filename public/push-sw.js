// Se carga dentro del service worker de la app (ver vite.config.js -> workbox.importScripts).
// Recibe los avisos que manda el servidor y los muestra, también con la app cerrada.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const icon = new URL('icons/icon-192-v3.png', self.registration.scope).href;
  event.waitUntil(
    self.registration.showNotification(data.title || 'Seiri', {
      body: data.body || '',
      icon,
      badge: icon,
      tag: data.tag, // el mismo aviso no se repite
      data: { url: data.url || self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});

// Si el sistema renueva o pierde la suscripción, se recrea al momento y se avisa a la app para que la registre en la cuenta.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const old = event.oldSubscription;
    const key = old && old.options && old.options.applicationServerKey;
    if (key) {
      try { await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); } catch (e) { /* la app lo reintenta al abrirse */ }
    }
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.postMessage({ type: 'push-changed' }));
  })());
});
