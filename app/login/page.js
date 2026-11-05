"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import posthog from "posthog-js";
import { sendMagicLink, signInWithGitHub } from "@/app/actions";

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
    <div className="panel">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form action={signInWithGitHub} className="mt-6" onSubmit={() => posthog.capture("github_sign_in_clicked")}>
        <button className="btn-primary w-full">Continue with GitHub</button>
        <p className="hint">Fills in your profile from GitHub. You check it all before saving.</p>
      </form>
      {linkError === "github" && <p className="mt-3 text-sm text-red-600">GitHub sign-in didn&apos;t start. Try again, or use email.</p>}

      <p className="my-6 text-center text-sm text-muted">or</p>

      <form action={action} onSubmit={() => posthog.capture("magic_link_requested")}>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required className="ph-no-capture input" placeholder="you@company.com" />
        {(state.error || linkError === "link") && (
          <p className="mt-3 text-sm text-red-600">
            {state.error ?? "That link didn't work. It may have expired or been opened in another browser. Try again."}
          </p>
        )}
        <button className="btn-ghost mt-4 w-full" disabled={pending}>
          {pending ? "Sending…" : "Email me a link"}
        </button>
        <p className="hint">
          No password needed. Already signed up by email? Keep using it, and connect GitHub from your profile.
        </p>
      </form>
    </div>
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
