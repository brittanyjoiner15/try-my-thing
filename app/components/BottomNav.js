"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

// App-style tab bar pinned to the bottom of the screen. Icon paths are Heroicons (outline, MIT).
const ICONS = {
  swipe:
    "M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48ZM12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z",
  matches:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
  products: "m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
  admin:
    "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  profile:
    "M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z",
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  );
}

const tab = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold";

export default function BottomNav({ showAdmin, userId, userEmail, unread = 0, demo = false }) {
  const pathname = usePathname();
  const previousUserId = useRef(null);

  useEffect(() => {
    if (previousUserId.current && previousUserId.current !== userId) {
      posthog.reset();
    }

    // Every /demo visitor is the same fake user, so identifying them would merge them all into one
    // person. Tag their events with is_demo instead and leave them anonymous.
    if (demo) {
      posthog.register({ is_demo: true });
    } else {
      posthog.unregister("is_demo");
      posthog.identify(userId, { email: userEmail });
    }
    previousUserId.current = userId;
  }, [demo, userEmail, userId]);

  useEffect(() => {
    const resetOnSignOut = (event) => {
      if (event.target.closest("[data-posthog-sign-out], [data-posthog-exit-demo]")) {
        posthog.reset();
      }
    };

    document.addEventListener("submit", resetOnSignOut);
    return () => document.removeEventListener("submit", resetOnSignOut);
  }, []);
  const tabs = [
    { href: "/swipe", label: "Swipe", icon: "swipe" },
    { href: "/matches", label: "Matches", icon: "matches", badge: unread },
    { href: "/products", label: "My products", icon: "products" },
    { href: "/profile", label: "Profile", icon: "profile" },
    ...(showAdmin ? [{ href: "/admin", label: "Admin", icon: "admin" }] : []),
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`${tab} relative ${active ? "text-accent" : "text-muted hover:text-foreground"}`}>
              <Icon name={t.icon} />
              {t.badge > 0 && (
                <span className="absolute top-1 left-1/2 ml-2 min-w-4 rounded-full bg-accent px-1 text-[10px] leading-4 text-white">
                  {t.badge > 9 ? "9+" : t.badge}
                </span>
              )}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
