"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { swipe, swipeBuilder, enableBuilderMatching } from "@/app/actions";
import { Logo } from "@/app/components/ProductProfile";
import Avatar from "@/app/components/Avatar";
import InviteButton from "@/app/components/InviteButton";
import { OPT_IN_DISMISSED } from "./optin";

const THRESHOLD = 110; // px of drag before a release counts as a swipe
const TAP = 6; // px of movement still treated as a tap (flips the card's page)


// Per-card-type differences (card.type). Everything else (drag, tap-through pages, keys) is shared.
const KINDS = {
  product: {
    action: swipe,
    event: "product_swiped",
    matchEvent: "product_match_created",
    eventProp: "product_id",
    yes: "♥ Try it",
    stamp: "TRY IT",
    pages: productPages,
    Footer: ProductFooter,
    // A request isn't a match yet, so it gets a toast and the deck keeps going. Already chatting with the
    // builder: the request went straight into that chat.
    toast: (match) => ({
      text: match.accepted ? `Added to your chat with ${match.builderName.split(" ")[0]} ✓` : `Request sent to ${match.builderName.split(" ")[0]} ✓`,
      href: match.accepted ? `/matches/${match.chatId}` : "/matches",
      link: match.accepted ? "Open chat" : "See matches",
    }),
    help: (card) => `Try it = ${card.builder} gets a request. If they accept, you chat.`,
  },
  builder: {
    action: swipeBuilder,
    event: "builder_swiped",
    matchEvent: "builder_match_created",
    eventProp: "builder_id",
    yes: "♥ Connect",
    stamp: "CONNECT",
    pages: builderPages,
    Footer: BuilderFooter,
    help: (card) => `If ${card.name} swipes right on you too, a chat opens.`,
  },
  // Not a person or product: one card for people who haven't turned on builder matching.
  optin: {
    yes: "Turn it on",
    stamp: "YES",
    pages: () => [{ type: "optin" }],
    Footer: () => null,
    help: () => "Skip to keep swiping products only.",
  },
};

export default function SwipeDeck({ initialCards }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState(null); // "left" | "right" while the card animates out
  const [message, setMessage] = useState(null);
  const [match, setMatch] = useState(null); // shown after a right swipe that made a match
  const [toast, setToast] = useState(null);
  const [, startTransition] = useTransition();
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0); // which page of the current card is showing

  const card = cards[0];
  const k = card ? KINDS[card.type] : null;
  const pages = card ? k.pages(card) : [];

  function decide(direction) {
    if (!card || flying) return;
    if (card.type === "optin") return decideOptIn(direction);
    setFlying(direction);
    setMessage(null);

    // On the last card, wait for the server before showing the empty state, so the
    // "request sent" note arrives with it instead of popping in a moment later.
    const isLast = cards.length === 1;
    const dropCard = () => {
      setCards((c) => c.slice(1));
      setPage(0);
      setFlying(null);
      setDx(0);
    };

    startTransition(async () => {
      const result = await k.action(card.id, direction);
      if (isLast) dropCard();
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      posthog.capture(k.event, { direction, [k.eventProp]: card.id });
      if (result?.match) {
        posthog.capture(k.matchEvent);
        if (k.toast) setToast({ ...k.toast(result.match), id: Date.now() });
        else setMatch(result.match);
      }
    });

    // Let the fly-out animation play, then drop the card.
    if (!isLast) setTimeout(dropCard, 250);
  }

  // Right = turn on builder matching (one tap if their builder fields are filled in, else /profile). Left = not now.
  function decideOptIn(direction) {
    posthog.capture("builder_optin_card_answered", { choice: direction === "right" ? "yes" : "skip", ready: card.ready });
    if (direction === "right") {
      if (card.ready) startTransition(() => enableBuilderMatching()); // redirects to /swipe with builders in the deck
      else router.push("/profile");
      return;
    }
    // Remembered for a year in a cookie, so app/swipe/page.js leaves the card out next time.
    document.cookie = `${OPT_IN_DISMISSED}=1; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setFlying("left");
    setTimeout(() => {
      setCards((c) => c.slice(1));
      setPage(0);
      setFlying(null);
      setDx(0);
    }, 250);
  }

  useEffect(() => {
    const onKey = (e) => {
      if (match) return; // keys don't swipe behind the match screen
      if (e.key === "ArrowLeft") decide("left");
      if (e.key === "ArrowRight") decide("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Hide the toast a few seconds after it shows. A new swipe restarts the timer via the id.
  // On the empty screen the note sits inline in the panel, so it stays put.
  useEffect(() => {
    if (!toast || !cards.length) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast, cards.length]);

  // Only builder swipes make a match screen (product requests get a toast). Not k.Match: the next card may be a product.
  if (match) return <BuilderMatchScreen match={match} onDone={() => setMatch(null)} />;

  if (!card) {
    return (
      <div className="panel mx-auto mt-8 max-w-md text-center">
        {/* Inline, not the floating pill, so it can't cover the empty-state buttons. */}
        {toast && (
          <p className="mb-4 rounded-lg bg-green-100 px-4 py-3 text-sm text-green-800" role="status">
            {toast.text}{" "}
            <Link href={toast.href} className="font-semibold underline">
              {toast.link}
            </Link>
          </p>
        )}
        {message && <Message {...message} />}
        <DeckEmpty />
      </div>
    );
  }

  const offset = flying ? (flying === "right" ? 600 : -600) : dx;

  return (
    <div className="mx-auto max-w-md pt-4">
      <Toast toast={toast} />
      {message && <Message {...message} />}

      <div
        className="relative flex cursor-grab select-none flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg active:cursor-grabbing"
        style={{
          transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
          transition: dragging ? "none" : "transform 250ms ease",
          // Vertical swipes scroll the page; horizontal ones drag the card.
          touchAction: "pan-y",
          height: "clamp(420px, 62vh, 600px)",
        }}
        onPointerDown={(e) => {
          if (e.target.closest("a")) return; // let links be clicked
          dragStart.current = e.clientX;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => dragStart.current !== null && setDx(e.clientX - dragStart.current)}
        onPointerUp={(e) => {
          if (dragStart.current === null) return;
          dragStart.current = null;
          setDragging(false);
          if (Math.abs(dx) < TAP) {
            // Tap like Tinder photos: right half = next page, left half = previous.
            const rect = e.currentTarget.getBoundingClientRect();
            const forward = e.clientX > rect.left + rect.width / 2;
            setPage((p) => Math.max(0, Math.min(pages.length - 1, p + (forward ? 1 : -1))));
            setDx(0);
          } else if (dx > THRESHOLD) decide("right");
          else if (dx < -THRESHOLD) decide("left");
          else setDx(0);
        }}
        // Fires when the browser takes over the gesture to scroll. Snap the card back.
        onPointerCancel={() => {
          dragStart.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <Stamp show={offset > 40} className="left-4 -rotate-12 border-green-600 text-green-600">{k.stamp}</Stamp>
        <Stamp show={offset < -40} className="right-4 rotate-12 border-red-500 text-red-500">SKIP</Stamp>

        {pages.length > 1 && (
          <div className="absolute inset-x-3 top-2 z-10 flex gap-1">
            {pages.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i === page ? "bg-foreground" : "bg-foreground/20"}`} />
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1">
          <CardPage card={card} page={pages[page]} />
        </div>

        <k.Footer card={card} />
      </div>

      <div className="mt-6 flex justify-center gap-4">
        <button className="btn-ghost w-32" onClick={() => decide("left")}>
          ✕ Skip
        </button>
        <button className="btn-primary w-32" onClick={() => decide("right")}>
          {k.yes}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Tap the card to flip through it. Drag it, or use ← → keys, to decide. {k.help(card)}
      </p>
    </div>
  );
}

// Pages a tester taps through: screenshot (or big logo), then each prompt, then what feedback they want.
function productPages(card) {
  return [
    card.screenshot_url ? { type: "screenshot" } : { type: "logo" },
    ...(card.prompts ?? []).map((p) => ({ type: "prompt", ...p })),
    { type: "prompt", prompt: "I want honest feedback on…", answer: card.feedback_on },
  ];
}

// Builder card: photo, what they're building, what they're looking for, problem spaces.
function builderPages(card) {
  return [
    { type: "avatar" },
    card.building && { type: "prompt", prompt: "I'm building…", answer: card.building },
    card.looking_for.length > 0 && { type: "prompt", prompt: "Looking for…", answer: card.looking_for.join(" · ") },
    card.topics.length > 0 && { type: "prompt", prompt: "Problem spaces", answer: card.topics.join(" · ") },
    (card.languages.length > 0 || card.repos.length > 0) && { type: "github" },
  ].filter(Boolean);
}

function CardPage({ card, page }) {
  if (page.type === "optin") {
    return (
      <div className="flex h-full flex-col justify-center gap-3 bg-accent/10 p-6 text-center">
        <p className="text-sm font-semibold text-muted">Builders, not just products</p>
        <p className="text-2xl font-bold leading-snug">Meet other builders here too?</p>
        <p className="text-muted">
          {card.ready
            ? "Your builder profile is ready, but you're hidden from other builders. Turn it on and they'll show up in this deck."
            : "Add what you're building and what you're looking for, and other builders will show up in this deck."}{" "}
          You only chat if you both swipe right.
        </p>
      </div>
    );
  }
  if (page.type === "screenshot") {
    return (
      <div className="flex h-full items-center justify-center bg-background px-4 pb-3 pt-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL */}
        <img
          src={card.screenshot_url}
          alt={`${card.name} screenshot`}
          draggable={false}
          className="aspect-[9/19.5] h-full rounded-[1.5rem] border-[5px] border-foreground object-cover object-top"
        />
      </div>
    );
  }
  if (page.type === "avatar") {
    // A photo fills the whole page, like a dating app. No photo: big initial in a circle.
    if (card.avatar_url) {
      return (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
        <img src={card.avatar_url} alt={card.name} draggable={false} className="h-full w-full object-cover" />
      );
    }
    return (
      <div className="flex h-full items-center justify-center bg-accent/10">
        <Avatar name={card.name} url={card.avatar_url} size="h-40 w-40 text-6xl" />
      </div>
    );
  }
  if (page.type === "github") {
    return (
      <div className="flex h-full flex-col justify-center gap-4 bg-background p-6">
        <p className="text-sm font-semibold text-muted">On GitHub</p>
        {card.languages.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {card.languages.map((lang) => (
              <li key={lang} className="rounded-full border border-border px-2.5 py-0.5 text-sm font-semibold">
                {lang}
              </li>
            ))}
          </ul>
        )}
        <ul className="space-y-2">
          {card.repos.map((repo) => (
            <li key={repo.name} className="rounded-xl border border-border p-3">
              <p className="flex items-baseline justify-between gap-2">
                <span className="truncate font-bold">{repo.name}</span>
                {repo.stars > 0 && <span className="shrink-0 text-xs text-muted">★ {repo.stars}</span>}
              </p>
              {repo.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{repo.description}</p>}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (page.type === "logo") {
    return (
      <div className="flex h-full items-center justify-center bg-accent/10">
        <Logo product={card} size="h-28 w-28 text-5xl" />
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col justify-center bg-background p-6">
      <p className="text-sm font-semibold text-muted">{page.prompt}</p>
      <p className="mt-3 text-2xl font-bold leading-snug">{page.answer}</p>
    </div>
  );
}

function Stamp({ show, className, children }) {
  return (
    <span
      className={`absolute top-6 z-20 rounded-md border-4 bg-card px-3 py-1 text-2xl font-black tracking-wider transition-opacity ${className}`}
      style={{ opacity: show ? 1 : 0 }}
    >
      {children}
    </span>
  );
}

function Message({ type, text }) {
  return (
    <p
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${
        type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
      }`}
    >
      {text}
    </p>
  );
}

// Small pill that floats above the tab bar after a right swipe. Doesn't block the deck.
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4" role="status">
      <p key={toast.id} className="pointer-events-auto flex items-center gap-3 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-lg">
        {toast.text}
        <Link href={toast.href} className="text-accent underline">
          {toast.link}
        </Link>
      </p>
    </div>
  );
}

function ProductFooter({ card }) {
  return (
    <footer className="space-y-2 border-t border-border p-4">
      <div className="flex items-center gap-3">
        <Logo product={card} size="h-10 w-10 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{card.name}</h1>
          <p className="text-xs text-muted">
            by {card.builder} · {card.stage}
          </p>
        </div>
        <a href={`/products/${card.id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-accent underline">
          Full profile ↗
        </a>
      </div>
      <p className="text-sm">{card.tagline}</p>
      <ul className="flex flex-wrap gap-1 text-xs">
        {[...(card.platforms ?? []), `🎁 ${card.perk}`].map((chip) => (
          <li key={chip} className="rounded-full border border-border px-2 py-0.5">
            {chip}
          </li>
        ))}
      </ul>
      <p className="line-clamp-2 text-sm text-muted">
        <span className="font-semibold">For:</span> {card.wants}
      </p>
    </footer>
  );
}

function BuilderFooter({ card }) {
  return (
    <footer className="space-y-2 border-t border-border p-4">
      <div className="flex items-center gap-3">
        <Avatar name={card.name} url={card.avatar_url} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{card.name}</h1>
          <p className="text-xs text-muted">
            {card.role}
            {card.location && ` · ${card.location}`}
            {card.distance && ` · ${card.distance}`}
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1 text-xs">
        {card.stack.slice(0, 6).map((tool) => (
          <li
            key={tool}
            className={`rounded-full border px-2 py-0.5 ${card.sharedStack.includes(tool) ? "border-accent text-accent" : "border-border"}`}
          >
            {tool}
          </li>
        ))}
      </ul>
      {card.building && <p className="line-clamp-2 text-sm text-muted">{card.building}</p>}
    </footer>
  );
}

// Empty decks are common while the app is small, so this points at the things that refill it.
function DeckEmpty() {
  return (
    <>
      <h1 className="text-2xl font-bold">You&apos;ve seen everything</h1>
      <p className="mt-2 text-muted">
        New products and builders show up as people join. Know someone who&apos;s building something? Send them the link.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <InviteButton source="deck_empty" label="Invite a builder" />
        <Link href="/products" className="btn-ghost">
          Post my product
        </Link>
        <Link href="/matches" className="text-sm text-muted underline">
          See my matches
        </Link>
      </div>
    </>
  );
}

function BuilderMatchScreen({ match, onDone }) {
  const first = match.name.split(" ")[0];

  return (
    <div className="panel mx-auto mt-8 max-w-md text-center">
      <h1 className="text-3xl font-bold">You and {first} matched</h1>
      <p className="mt-2 text-muted">You both swiped right. Your chat is open, and we wrote a first message for you.</p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={`/matches/${match.chatId}`}
          className="btn-primary"
          onClick={() => posthog.capture("match_outreach_started", { match_type: "builder" })}
        >
          Message {first}
        </Link>
        <button className="mt-2 text-sm text-muted underline" onClick={onDone}>
          Keep swiping
        </button>
      </div>
    </div>
  );
}
