"use client";

import { useState, useTransition } from "react";
import posthog from "posthog-js";
import { respondToTester } from "@/app/actions";

// Accept / Pass on a tester's request. Used on the Matches page and at the top of a pending chat.
export default function RespondButtons({ chatId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const respond = (accept) =>
    startTransition(async () => {
      const result = await respondToTester(chatId, accept);
      if (result?.error) return setError(result.error);
      posthog.capture("tester_request_answered", { chat_id: chatId, accepted: accept });
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn-primary text-sm" disabled={pending} onClick={() => respond(true)}>
        Accept
      </button>
      <button className="btn-ghost text-sm" disabled={pending} onClick={() => respond(false)}>
        Pass
      </button>
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
