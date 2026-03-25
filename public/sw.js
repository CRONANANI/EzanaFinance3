/* eslint-disable no-restricted-globals */
/* Service worker — web push for Ezana Finance (registered only from Settings → Notifications) */

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data = { title: 'Ezana Finance', body: '', url: '/' };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    try {
      data.body = event.data.text();
    } catch {
      return;
    }
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/ezana-logo.svg',
    badge: data.badge || '/ezana-logo.svg',
    image: data.image || undefined,
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: !!data.tag,
    requireInteraction: !!data.requireInteraction,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(data.title || 'Ezana Finance', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  const absolute = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(absolute);
          }
          return clients.openWindow(absolute);
        }
      }
      return clients.openWindow(absolute);
    })
  );
});

self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    fetch(self.location.origin + '/api/notifications/vapid-public-key')
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.publicKey) return null;
        return self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      })
      .then(function (subscription) {
        if (!subscription) return null;
        return fetch(self.location.origin + '/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      })
      .catch(function () {})
  );
});
