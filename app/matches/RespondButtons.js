"use client";

import { useState, useTransition } from "react";
import posthog from "posthog-js";
import { respondToRequest } from "@/app/actions";
import { Spinner } from "@/app/components/SubmitButton";

// Accept / Pass on one product request. Used on the Matches page and on the request line inside a chat.
export default function RespondButtons({ requestId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const respond = (accept) =>
    startTransition(async () => {
      let result;
      try {
        result = await respondToRequest(requestId, accept);
      } catch (err) {
        posthog.captureException(err, { feature: "chat", action: "respondToRequest", request_id: requestId });
        return setError("Couldn't save that. Try again.");
      }
      if (result?.error) return setError(result.error);
      posthog.capture("tester_request_answered", { accepted: accept, ...result.stats });
    });

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button className="btn-primary text-sm" disabled={pending} onClick={() => respond(true)}>
        Accept
      </button>
      <button className="btn-ghost text-sm" disabled={pending} onClick={() => respond(false)}>
        Pass
      </button>
      {pending && <Spinner className="h-4 w-4 text-muted" />}
      {error && <span className="text-sm text-red-700">{error}</span>}
    </div>
  );
}
