/* Firebase messaging service worker for SchoolVajo */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { body: event.data ? event.data.text() : "New notification" } };
  }

  const notification = payload.notification || {};
  const data = payload.data || {};

  const title = notification.title || data.title || "SchoolVajo Notification";
  const body = notification.body || data.body || "You have a new update";
  const icon = notification.icon || data.icon || "/logo.png";
  const badge = notification.badge || data.badge || "/logo.png";
  const options = {
    body,
    icon,
    badge,
    data: {
      url: data.url || (data.notificationId ? `/?markRead=${data.notificationId}` : "/"),
      notificationId: data.notificationId,
      type: data.type,
      role: data.role,
      ...data,
    },
    tag: data.notificationId || "myschool-notif",
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || (data.notificationId ? `/?markRead=${data.notificationId}` : "/");
  const notifId = data.notificationId;

  // Background mark read attempt
  if (notifId) {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notifId }),
    }).catch(() => {});
  }

  if (data.itemId && data.type) {
    fetch("/api/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: data.type, itemId: data.itemId }),
    }).catch(() => {});
  }

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there's an existing window with matching origin, focus & navigate
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
