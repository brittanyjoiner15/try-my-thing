// Web push to phones and browsers that turned on notifications (/profile → PushToggle). Server only.
// Sent next to the match emails (lib/match-emails.js), so people with push on get both. Issue #48.
// Encryption and signing live in lib/web-push.js.
//
// Needs NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY. Without them nothing is sent and a warning is logged.
import { PUBLIC_KEY, PRIVATE_KEY, vapidAuthHeader, encryptPayload } from "@/lib/web-push";
import { getPushSubscriptions, deletePushSubscription } from "@/lib/data";

async function sendToSubscription(sub, payload) {
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuthHeader(sub.endpoint),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(24 * 3600), // drop it if the phone is offline for a day
      Urgency: "high",
    },
    body: encryptPayload(JSON.stringify(payload), sub),
  });
  // 404/410: the browser unsubscribed or the app was deleted. Forget it so we stop trying.
  if (res.status === 404 || res.status === 410) {
    await deletePushSubscription(sub.endpoint);
    return;
  }
  if (!res.ok) throw Object.assign(new Error(`Push failed: ${res.status} ${await res.text().catch(() => "")}`.trim()), { code: `push_${res.status}` });
}

// Sends one notification to every device the user turned push on for. No-op if they have none.
// payload: { title, body, url, tag } (see public/sw.js). Never put an email address or message text in it:
// it shows on the lock screen.
export async function sendPush(userId, payload) {
  if (!PUBLIC_KEY || !PRIVATE_KEY) {
    console.warn("Push skipped: set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to send it.");
    return;
  }
  const subs = await getPushSubscriptions(userId);
  const results = await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
}
