import { requireProfile } from "@/lib/session";
import WelcomeActions from "./WelcomeActions";

// First-run screen. saveProfile sends new people here once, right after onboarding.
export default async function WelcomePage() {
  const { profile } = await requireProfile();
  const first = profile.name?.split(" ")[0];

  return (
    <div className="panel mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">You&apos;re in{first ? `, ${first}` : ""}</h1>
        <p className="mt-1 text-muted">Here&apos;s how it works.</p>
      </div>

      <ol className="space-y-4">
        <Step n="1" title="Swipe on products">
          ♥ Try it sends the builder a request. When they accept, you chat in the app. ✕ skips. You get 3 tries a week, so save
          them for things you&apos;d really use.
        </Step>
        <Step n="2" title="Post your thing">
          Building something? Add it, and testers swipe on it. Accept the testers you want on Matches, then chat.
        </Step>
        <Step n="3" title="Meet other builders">
          Turn on builder matching to swipe on each other. When you both swipe right, a chat opens.
        </Step>
      </ol>

      <p className="rounded-lg bg-accent/10 px-4 py-3 text-sm">
        We&apos;re just getting started, so the deck is small. New people show up as they join, and invites help.
      </p>

      <WelcomeActions />
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </li>
  );
}
