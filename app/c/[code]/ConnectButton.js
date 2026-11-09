"use client";

import { useActionState } from "react";
import { connectInPerson } from "@/app/actions";

// On success connectInPerson redirects into the chat, so state only ever holds an error.
export default function ConnectButton({ code, firstName }) {
  const [state, action, pending] = useActionState(() => connectInPerson(code), {});
  return (
    <form action={action} className="space-y-2 text-center">
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Connecting…" : `Connect with ${firstName}`}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : (
        <p className="hint">Opens a chat with {firstName}. They get an email that you connected.</p>
      )}
    </form>
  );
}
