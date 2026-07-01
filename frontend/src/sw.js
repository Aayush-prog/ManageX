import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// API calls — network first, fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 10 })
);

// Static assets — stale-while-revalidate
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'static-assets' })
);

// Images — cache first, 30 days
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { return; }

  const { title = 'ManageX', body = '', url = '/', icon = '/logo.png', badge = '/logo.png', type } = data;

  const notifyClients = (type === 'clock_in' || type === 'clock_out')
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
        list.forEach((client) => client.postMessage({ type: 'ATTENDANCE_UPDATED' }));
      })
    : Promise.resolve();

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        vibrate: [200, 100, 200],
        data: { url },
        actions: [{ action: 'open', title: 'Open' }],
      }),
      notifyClients,
    ])
  );
});

// Notification clicked — open the app at the right page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
