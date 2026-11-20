"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import posthog from "posthog-js";
import { sendMagicLink, signInWithGitHub, verifyEmailCode } from "@/app/actions";
import SubmitButton from "@/app/components/SubmitButton";

function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, {});
  const linkError = useSearchParams().get("error");

  if (state.sent) return <CodeForm email={state.sent} />;

  return (
    <div className="panel">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form action={signInWithGitHub} className="mt-6" onSubmit={() => posthog.capture("github_sign_in_clicked")}>
        <SubmitButton className="btn-primary w-full" pendingLabel="Connecting to GitHub…" leavesSite>
          Continue with GitHub
        </SubmitButton>
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
          {pending ? "Sending…" : "Email me a code"}
        </button>
        <p className="hint">
          No password needed. Already signed up by email? Keep using it, and connect GitHub from your profile.
        </p>
      </form>
    </div>
  );
}

// After "Email me a code": type the code from the email, or tap the link in it.
function CodeForm({ email }) {
  const [state, action, pending] = useActionState(verifyEmailCode, {});
  return (
    <div className="panel">
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-muted">
        We sent a code to <strong className="ph-no-capture">{email}</strong>. Type it here, or tap the link in the email.
      </p>
      <form action={action} className="mt-6" onSubmit={() => posthog.capture("email_code_submitted")}>
        <input type="hidden" name="email" value={email} />
        <label className="label" htmlFor="code">
          Code
        </label>
        <input
          id="code"
          name="code"
          required
          className="input text-center text-2xl tracking-[0.3em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={12}
          autoFocus
        />
        {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary mt-4 w-full" disabled={pending}>
          {pending ? "Checking…" : "Sign in"}
        </button>
      </form>
      {/* A plain <a> does a full reload, which clears the form state. */}
      <a href="/login" className="hint mt-4 block text-center underline">
        Wrong email? Start over
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
