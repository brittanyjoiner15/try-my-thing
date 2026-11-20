"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { pollUnread } from "@/app/actions";

// The layout only renders on full page loads, so on its own the Matches badge goes stale while people
// tap between tabs. This keeps it live, and mirrors it into the browser tab title and favicon.
const POLL_MS = 30000; // one small query per open tab. Don't go much lower without a cheaper query.
const PREFIX = /^\(\d+\+?\) /;
const ICON_ID = "unread-favicon";

export default function useUnreadCount(initial) {
  const [count, setCount] = useState(initial);
  const pathname = usePathname();
  const router = useRouter();

  // A server render (full load, server action) has the freshest number, so take it when it changes.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setCount(initial);
  }

  // Re-check every 30s while visible, when the tab comes back into view, and on every navigation
  // (opening a chat marks it read, so the badge should drop right away).
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (document.hidden) return;
      // On /matches the rows (unread badges, last message dates) are server-rendered and go stale too.
      // A refresh re-renders the page and the layout, so the tab badge updates through `initial` above.
      // Refreshing every tick (not only when the count changes) because the count is chats, not messages:
      // a 2nd message in an already-unread chat doesn't change it.
      if (pathname === "/matches") {
        router.refresh();
        return;
      }
      try {
        const n = await pollUnread();
        if (!stopped && typeof n === "number") setCount(n);
      } catch {
        // Network blip or a new deploy (old server action IDs). Keep the last count; the next page load fixes it.
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [pathname, router]);

  useTitleCount(count);
  useFaviconDot(count);
  return count;
}

// "(2) Try my thing". Next rewrites the <title> on navigation, so watch it and put the count back.
function useTitleCount(count) {
  useEffect(() => {
    const label = count > 9 ? "(9+) " : count > 0 ? `(${count}) ` : "";
    const apply = () => {
      const next = label + document.title.replace(PREFIX, "");
      if (document.title !== next) document.title = next;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      document.title = document.title.replace(PREFIX, "");
    };
  }, [count]);
}

// Adds an orange dot to the app icon. Our own <link> goes last in <head> so browsers pick it over
// Next's, and removing it falls back to the normal favicon.
function useFaviconDot(count) {
  useEffect(() => {
    if (count <= 0) return;
    let link;
    const img = new Image();
    img.onload = () => {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      ctx.beginPath();
      ctx.arc(size - 14, 14, 13, 0, Math.PI * 2);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#f54e00";
      ctx.fill();
      link = document.createElement("link");
      link.id = ICON_ID;
      link.rel = "icon";
      link.href = canvas.toDataURL("image/png");
      document.getElementById(ICON_ID)?.remove();
      document.head.appendChild(link);
    };
    img.src = "/apple-icon.png"; // PNG, same origin, so the canvas can export it
    return () => {
      img.onload = null;
      link?.remove();
    };
  }, [count > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- the dot doesn't show the number
}
