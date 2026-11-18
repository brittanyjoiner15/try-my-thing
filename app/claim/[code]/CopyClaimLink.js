"use client";

import { useState } from "react";

// Admin only: copies this page's address to send to the builder.
export default function CopyClaimLink() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // clipboard blocked: the address bar has the same link
    }
  }

  return (
    <button type="button" className="btn-primary text-sm" onClick={copy}>
      {copied ? "Link copied" : "Copy claim link"}
    </button>
  );
}
