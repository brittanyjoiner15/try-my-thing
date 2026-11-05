import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getDeck, getBuilderCandidates } from "@/lib/data";
import { rankBuilders } from "@/lib/builder-match";
import { enableBuilderMatching } from "@/app/actions";
import SwipeDeck from "./SwipeDeck";

// /swipe = products deck, /swipe?mode=builders = other builders deck.
export default async function SwipePage({ searchParams }) {
  const { user, profile } = await requireProfile();
  const builders = (await searchParams).mode === "builders";

  let deck;
  if (!builders) deck = <SwipeDeck key="products" kind="products" initialCards={await getDeck(user.id)} />;
  else if (!profile.open_to_builders) deck = <OptIn profile={profile} />;
  else deck = <SwipeDeck key="builders" kind="builders" initialCards={rankBuilders(profile, await getBuilderCandidates(user.id))} />;

  return (
    <div>
      <nav className="mx-auto flex max-w-md rounded-full border border-border bg-card p-1 text-sm font-semibold">
        <ModeLink href="/swipe" active={!builders}>Products</ModeLink>
        <ModeLink href="/swipe?mode=builders" active={builders}>Builders</ModeLink>
      </nav>
      {deck}
    </div>
  );
}

function ModeLink({ href, active, children }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex-1 rounded-full py-1.5 text-center ${active ? "bg-accent text-white" : "text-muted hover:text-foreground"}`}
    >
      {children}
    </Link>
  );
}

// Builders only see other builders after opting in themselves, so the deck is always two-way.
function OptIn({ profile }) {
  // Already filled in the builder fields but left the checkbox off: offer a one-click turn-on.
  const ready = Boolean(profile.building || profile.topics?.length);
  return (
    <div className="panel mx-auto mt-8 max-w-md text-center">
      <h1 className="text-2xl font-bold">Meet builders like you</h1>
      {ready ? (
        <>
          <p className="mt-2 text-muted">
            Your builder profile is ready, but you&apos;re hidden from other builders. Turn it on to start swiping. You only
            see each other&apos;s email if you both swipe right.
          </p>
          <form action={enableBuilderMatching}>
            <button className="btn-primary mt-4">Show me to other builders</button>
          </form>
          <Link href="/profile" className="mt-3 block text-sm text-muted underline">
            Edit my profile first
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-muted">
            Find builders near you, working on similar problems, or using the same stack. Add a few details and turn on
            &quot;Show me to other builders&quot; to start swiping.
          </p>
          <Link href="/profile" className="btn-primary mt-4">
            Set up my builder profile
          </Link>
        </>
      )}
    </div>
  );
}
