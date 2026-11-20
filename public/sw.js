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

// Tap: open the chat. iOS doesn't reliably send a running Home Screen app to a new URL (WindowClient.navigate,
// openWindow's URL), and a closed one opens at start_url (/ → /swipe). So the page does the navigating:
// - app already open: message it the URL (PushNavigator in app/components listens).
// - app closed or reloaded: PushNavigator asks for the saved URL on load.
const PENDING = "push-pending";
const PENDING_MAX_AGE_MS = 60 * 1000; // an old tap shouldn't hijack a later launch

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/matches", self.location.origin);
  const path = url.pathname + url.search;
  event.waitUntil(
    (async () => {
      // Saved either way: iOS can reload a backgrounded app instead of resuming it, and then the message is lost.
      const cache = await caches.open(PENDING);
      await cache.put("/__pending", new Response(JSON.stringify({ url: path, at: Date.now() })));
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus().catch(() => {});
        open.postMessage({ type: "open-url", url: path });
        return;
      }
      await self.clients.openWindow(url.href);
    })(),
  );
});

// PushNavigator on page load: "was I opened by a notification tap?" Answers once, then forgets it.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "pending-url") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PENDING);
      const res = await cache.match("/__pending");
      await cache.delete("/__pending");
      const pending = res ? await res.json().catch(() => null) : null;
      const fresh = pending && Date.now() - pending.at < PENDING_MAX_AGE_MS;
      event.source?.postMessage({ type: "open-url", url: fresh ? pending.url : null });
    })(),
  );
});
