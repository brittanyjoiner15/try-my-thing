"use client";

// Goes to the chat when someone taps a push notification. public/sw.js can't reliably do it on iOS,
// so it hands the URL to the page instead: as a message when the app is already open, or saved for
// this component to ask for when the tap launched the app. Renders nothing. Issue #48.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PushNavigator() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      const url = event.data?.type === "open-url" ? event.data.url : null;
      // Same-site paths only, so a message can't send people off the app.
      if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) router.push(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    // Only matters if a service worker exists (push turned on at some point). ready never resolves otherwise.
    navigator.serviceWorker.getRegistration().then((reg) => reg?.active?.postMessage({ type: "pending-url" }));
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [router]);

  return null;
}
