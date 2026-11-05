"use client";

// Connect / disconnect GitHub, shown above the profile form on /onboarding and /profile.
// It sits outside ProfileForm because forms can't be nested.
import { useFormStatus } from "react-dom";
import posthog from "posthog-js";
import { connectGitHub, disconnectGitHub, refreshGitHub } from "@/app/actions";

export default function GitHubConnect({ github, status, canDisconnect }) {
  if (!github) {
    return (
      <div className="panel mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold">Fill this in from GitHub</p>
          <p className="text-sm text-muted">
            We read your public profile and repos, then you check everything before saving. Builders see your top
            languages and repos on your card.
          </p>
          {status === "error" && (
            <p className="mt-1 text-sm text-red-600">
              That didn&apos;t work. If that GitHub account already has its own try my thing account, sign in with it instead.
            </p>
          )}
        </div>
        <form action={connectGitHub} onSubmit={() => posthog.capture("github_connect_clicked")}>
          <Submit className="btn-primary" pending="Opening GitHub…">Connect GitHub</Submit>
        </form>
      </div>
    );
  }

  return (
    <div className="panel mx-auto max-w-xl space-y-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 font-bold">GitHub connected: @{github.username}</p>
        <div className="flex gap-4">
          <form action={refreshGitHub} onSubmit={() => posthog.capture("github_refreshed")}>
            <Submit className="text-sm font-semibold text-accent underline disabled:no-underline disabled:opacity-60" pending="Refreshing from GitHub…">
              Refresh from GitHub
            </Submit>
          </form>
          {canDisconnect && (
            <form action={disconnectGitHub} onSubmit={() => posthog.capture("github_disconnected")}>
              <Submit className="text-sm text-muted underline disabled:opacity-60" pending="Disconnecting…">Disconnect</Submit>
            </form>
          )}
        </div>
      </div>
      {status === "refreshed" && <p className="text-sm text-green-700">Updated from GitHub.</p>}
      {status === "connected" ? (
        <p className="text-sm text-muted">
          We filled in the empty fields below and added GitHub suggestions under the rest. Nothing is saved until you hit Save.
        </p>
      ) : (
        <p className="text-sm text-muted">Pulls your latest public repos and languages. Your profile fields only change when you hit Save.</p>
      )}
      {status === "error" && <p className="text-sm text-red-600">We couldn&apos;t reach GitHub just now. Try again in a bit.</p>}
    </div>
  );
}

// Shows `pending` text and disables itself while its form's server action runs (the GitHub calls take a second or two).
function Submit({ className, pending, children }) {
  const status = useFormStatus();
  return (
    <button className={className} disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}
