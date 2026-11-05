"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import posthog from "posthog-js";
import { sendMagicLink } from "@/app/actions";

function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, {});
  const linkError = useSearchParams().get("error");

  if (state.sent) {
    return (
      <div className="panel">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-muted">
          We sent a login link to <strong>{state.sent}</strong>. Open it in this same browser.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="panel" onSubmit={() => posthog.capture("magic_link_requested")}>
      <h1 className="text-2xl font-bold">Sign in</h1>
      <p className="mt-2 text-muted">No password. We&apos;ll email you a link.</p>
      <label className="label mt-6" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required className="ph-no-capture input" placeholder="you@company.com" />
      {(state.error || linkError) && (
        <p className="mt-3 text-sm text-red-600">
          {state.error ?? "That link didn't work. It may have expired or been opened in another browser. Try again."}
        </p>
      )}
      <button className="btn-primary mt-4 w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Just curious?{" "}
        <a href="/demo" className="font-semibold text-accent underline">
          Try the demo
        </a>{" "}
        with fake data, no account.
      </p>
    </div>
  );
}
