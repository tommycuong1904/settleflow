self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  event.waitUntil(Promise.all([
    self.registration.showNotification(payload.title || "SettleFlow", {
      body: payload.body || "You have a workflow update.",
      icon: "/favicon.ico",
      data: { href: payload.href || "/notifications" },
    }),
    self.clients.matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => clients.forEach((client) => client.postMessage({ type: "settleflow:notification" }))),
  ]));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.href));
});
