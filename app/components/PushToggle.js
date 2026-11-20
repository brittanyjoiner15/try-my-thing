"use client";

// "Turn on notifications" on /profile. Registers public/sw.js, asks permission (iOS only asks after a tap),
// and saves this device's subscription. Each device is separate: turning it on on a phone doesn't affect a laptop.
// Issue #48.
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { enablePush, disablePush } from "@/app/actions";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// The browser wants the key as raw bytes, not base64url.
function keyBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function detect() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  // iOS only has push inside a home screen app (iOS 16.4+). In Safari, PushManager is missing.
  if (isIOS && !standalone) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !PUBLIC_KEY) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return null; // supported: check for an existing subscription
}

export default function PushToggle() {
  const [state, setState] = useState("loading"); // loading | install | unsupported | denied | off | on | working
  const [error, setError] = useState(null);

  useEffect(() => {
    const early = detect();
    if (early) return setState(early);
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        posthog.capture("push_permission_denied", { permission });
        return setState(permission === "denied" ? "denied" : "off");
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) });
      const result = await enablePush(sub.toJSON());
      if (result?.error) throw new Error(result.error);
      posthog.capture("push_enabled");
      setState("on");
    } catch (e) {
      setError("That didn't work. Try again.");
      posthog.captureException?.(e);
      setState("off");
    }
  }

  async function turnOff() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await disablePush(sub.endpoint);
        await sub.unsubscribe();
      }
      posthog.capture("push_disabled");
    } finally {
      setState("off");
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  return (
    <div className="panel mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-bold">Notifications</p>
        <p className="text-sm text-muted">
          {state === "install" && "Add try my thing to your Home Screen first: tap Share, then Add to Home Screen. Then open it from there and come back here."}
          {state === "denied" && "Notifications are blocked for this app. Turn them on in your phone or browser settings, then reload."}
          {(state === "off" || state === "working") && "Get a notification on this device for new messages and matches. You'll still get emails."}
          {state === "on" && "On for this device. You'll hear about new messages and matches."}
        </p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      {(state === "off" || state === "working") && (
        <button className="btn-primary" onClick={turnOn} disabled={state === "working"}>
          {state === "working" ? "Turning on…" : "Turn on"}
        </button>
      )}
      {state === "on" && (
        <button className="text-sm font-semibold text-accent underline" onClick={turnOff}>
          Turn off
        </button>
      )}
    </div>
  );
}
