self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'Primoria',
      body: event.data ? event.data.text() : '你有一条新的学习提醒。',
    };
  }

  const title = payload.title || 'Primoria';
  const options = {
    body: payload.body || '你有一条新的学习提醒。',
    icon: '/primoria-logo.png',
    badge: '/primoria-logo.png',
    data: {
      url: payload.url || '/home',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const url = event.notification?.data?.url || '/home';
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client);
      if (existing) {
        existing.postMessage({ type: 'viewer-notification-click', url });
        return existing.focus().then(() => existing.navigate(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
