"use client";

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
export default function SubmitButton({ className, pendingLabel, children }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
