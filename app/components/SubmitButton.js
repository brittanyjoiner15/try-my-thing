"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

// Small spinning ring. Inherits the text color, so it works on primary and ghost buttons.
export function Spinner({ className = "h-4 w-4" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

// Drop-in <button> for forms with a server action: disables itself and shows a spinner while the action runs,
// so people don't click twice or wonder if anything happened. Must be rendered inside the <form>.
//
// `leavesSite`: for actions that redirect to another site (GitHub sign-in). The action finishes before the
// browser has loaded the new page, so plain `pending` would flip the button back for a second or two.
// This keeps the spinner on until the page is gone, and resets it if they come back with the Back button.
export default function SubmitButton({ className, pendingLabel, children, leavesSite = false }) {
  const { pending } = useFormStatus();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leavesSite) return;
    // Back from GitHub restores this page from the back/forward cache with the spinner still on.
    const reset = (e) => e.persisted && setLeaving(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, [leavesSite]);

  // `disabled` follows only the real pending state: disabling a button inside its own click handler can cancel
  // the submit. A second click while `leaving` just re-runs the redirect, which is harmless.
  const busy = pending || leaving;
  return (
    <button
      className={className}
      disabled={pending}
      aria-busy={busy}
      onClick={leavesSite ? () => setLeaving(true) : undefined}
    >
      {busy && <Spinner />}
      {busy && pendingLabel ? pendingLabel : children}
    </button>
  );
}
