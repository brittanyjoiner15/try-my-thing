// Service worker: only shows push notifications and opens the app when one is tapped. No offline caching.
// Registered by app/components/PushToggle.js. Payload comes from lib/push.js: { title, body, url, tag }.
// Issue #48.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not JSON: still show something, since iOS can revoke push for pushes that show nothing.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "try my thing", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag, // same tag replaces the older notification (e.g. several messages in one chat)
      data: { url: data.url || "/matches" },
    }),
  );
});

// Tap: focus an open window and go to the chat, or open the app there.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/matches", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        try {
          await open.focus();
          // navigate only works on windows this worker controls, so fall back to a new window.
          if (await open.navigate(url)) return;
        } catch {}
      }
      await self.clients.openWindow(url);
    })(),
  );
});
