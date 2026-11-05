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
      let result;
      try {
        result = await respondToTester(chatId, accept);
      } catch (err) {
        posthog.captureException(err, { feature: "chat", action: "respondToTester", chat_id: chatId });
        return setError("Couldn't save that. Try again.");
      }
      if (result?.error) return setError(result.error);
      posthog.capture("tester_request_answered", { chat_id: chatId, accepted: accept, ...result.stats });
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
