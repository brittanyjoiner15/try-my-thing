"use client";

import { useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";

const choose = (choice) => () => posthog.capture("onboarding_completed", { choice });

export default function WelcomeActions() {
  useEffect(() => {
    posthog.capture("onboarding_welcome_viewed");
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <Link href="/products" className="btn-primary" onClick={choose("post_product")}>
        Post my thing
      </Link>
      <Link href="/swipe" className="btn-ghost" onClick={choose("swipe")}>
        Just swipe for now
      </Link>
      <Link href="/swipe?mode=builders" className="mt-1 text-center text-sm text-muted underline" onClick={choose("builders")}>
        Set up builder matching
      </Link>
    </div>
  );
}
