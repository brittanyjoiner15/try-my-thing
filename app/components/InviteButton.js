"use client";

import { useState } from "react";
import posthog from "posthog-js";

// Shares the app's link with the phone's share sheet, or copies it where there isn't one.
// `source` says where the button was tapped, so PostHog shows which empty state brings people in.
export default function InviteButton({ source, label = "Invite someone", className = "btn-primary" }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = window.location.origin;
    const text = "I'm on try my thing, where builders find testers and each other. Come post what you're building.";
    let method = "copy";
    try {
      if (navigator.share) {
        method = "share";
        await navigator.share({ title: "try my thing", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      }
    } catch {
      return; // share sheet closed, or clipboard blocked
    }
    posthog.capture("invite_link_shared", { method, source });
  }

  return (
    <button type="button" className={className} onClick={invite}>
      {copied ? "Link copied" : label}
    </button>
  );
}
