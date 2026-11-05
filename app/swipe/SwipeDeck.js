"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { swipe, swipeBuilder } from "@/app/actions";
import { Logo } from "@/app/components/ProductProfile";
import Avatar from "@/app/components/Avatar";

const THRESHOLD = 110; // px of drag before a release counts as a swipe
const TAP = 6; // px of movement still treated as a tap (flips the card's page)

// Per-deck differences. Everything else (drag, tap-through pages, keys) is shared.
const KINDS = {
  products: {
    action: swipe,
    event: "product_swiped",
    matchEvent: "product_match_created",
    eventProp: "product_id",
    yes: "♥ Try it",
    stamp: "TRY IT",
    pages: productPages,
    Footer: ProductFooter,
    Match: MatchScreen,
    Empty: ProductsEmpty,
    help: (card) => `Try it = you get ${card.builder}'s email to set it up.`,
  },
  builders: {
    action: swipeBuilder,
    event: "builder_swiped",
    matchEvent: "builder_match_created",
    eventProp: "builder_id",
    yes: "♥ Connect",
    stamp: "CONNECT",
    pages: builderPages,
    Footer: BuilderFooter,
    Match: BuilderMatchScreen,
    Empty: BuildersEmpty,
    help: (card) => `If ${card.name} swipes right on you too, you'll both get each other's email.`,
  },
};

export default function SwipeDeck({ kind, initialCards }) {
  const k = KINDS[kind];
  const [cards, setCards] = useState(initialCards);
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState(null); // "left" | "right" while the card animates out
  const [message, setMessage] = useState(null);
  const [match, setMatch] = useState(null); // builder contact details after a right swipe
  const [, startTransition] = useTransition();
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0); // which page of the current card is showing

  const card = cards[0];
  const pages = card ? k.pages(card) : [];

  function decide(direction) {
    if (!card || flying) return;
    setFlying(direction);
    setMessage(null);

    startTransition(async () => {
      const result = await k.action(card.id, direction);
      if (result?.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      posthog.capture(k.event, { direction, [k.eventProp]: card.id });
      if (result?.match) {
        posthog.capture(k.matchEvent);
        setMatch(result.match);
      }
    });

    // Let the fly-out animation play, then drop the card.
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

  if (match) return <k.Match match={match} onDone={() => setMatch(null)} />;

  if (!card) {
    return (
      <div className="panel mx-auto mt-8 max-w-md text-center">
        {message && <Message {...message} />}
        <k.Empty />
      </div>
    );
  }

  const offset = flying ? (flying === "right" ? 600 : -600) : dx;

  return (
    <div className="mx-auto max-w-md pt-4">
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
        <Stamp show={offset > 40} className="left-4 border-green-600 bg-card text-green-600">{k.stamp}</Stamp>
        <Stamp show={offset < -40} className="right-4 border-muted bg-card text-muted">SKIP</Stamp>

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
  ].filter(Boolean);
}

function CardPage({ card, page }) {
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
      className={`absolute top-6 z-20 rounded-md border-2 px-2 py-1 text-sm font-black transition-opacity ${className}`}
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

function MatchScreen({ match, onDone }) {
  const [copied, setCopied] = useState(false);
  const first = match.builderName.split(" ")[0];

  return (
    <div className="panel mx-auto mt-8 max-w-md text-center">
      <h1 className="text-3xl font-bold">It&apos;s a match</h1>
      <p className="mt-2 text-muted">
        {first} wants testers for {match.product}. Email them to get access. They&apos;ll see you on their matches page too.
      </p>

      <p className="ph-no-capture mt-6 rounded-lg border border-border px-4 py-3 font-mono text-sm">{match.builderEmail}</p>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={match.mailto}
          className="btn-primary"
          onClick={() => posthog.capture("match_outreach_started", { match_type: "product" })}
        >
          Email {first} (pre-written)
        </a>
        <button
          className="btn-ghost"
          onClick={() => {
            navigator.clipboard.writeText(match.builderEmail);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy email"}
        </button>
        <button className="mt-2 text-sm text-muted underline" onClick={onDone}>
          Keep swiping
        </button>
      </div>
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

function ProductsEmpty() {
  return (
    <>
      <h1 className="text-2xl font-bold">You&apos;ve seen everything</h1>
      <p className="mt-2 text-muted">New products show up as builders post them. Building something yourself?</p>
      <Link href="/products" className="btn-primary mt-4">
        Post my product
      </Link>
    </>
  );
}

function BuildersEmpty() {
  return (
    <>
      <h1 className="text-2xl font-bold">You&apos;ve met everyone</h1>
      <p className="mt-2 text-muted">New builders show up as they join. Check your matches in the meantime.</p>
      <Link href="/matches" className="btn-primary mt-4">
        See my matches
      </Link>
    </>
  );
}

function BuilderMatchScreen({ match, onDone }) {
  const [copied, setCopied] = useState(false);
  const first = match.name.split(" ")[0];

  return (
    <div className="panel mx-auto mt-8 max-w-md text-center">
      <h1 className="text-3xl font-bold">You and {first} matched</h1>
      <p className="mt-2 text-muted">You both swiped right. Say hi. They&apos;ll see you on their matches page too.</p>

      <p className="ph-no-capture mt-6 rounded-lg border border-border px-4 py-3 font-mono text-sm">{match.email}</p>
      <div className="mt-2 flex justify-center gap-4 text-sm">
        {match.github_url && (
          <a href={match.github_url} target="_blank" rel="noreferrer" className="text-accent underline">GitHub ↗</a>
        )}
        {match.linkedin_url && (
          <a href={match.linkedin_url} target="_blank" rel="noreferrer" className="text-accent underline">LinkedIn ↗</a>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <a
          href={match.mailto}
          className="btn-primary"
          onClick={() => posthog.capture("match_outreach_started", { match_type: "builder" })}
        >
          Email {first} (pre-written)
        </a>
        <button
          className="btn-ghost"
          onClick={() => {
            navigator.clipboard.writeText(match.email);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy email"}
        </button>
        <button className="mt-2 text-sm text-muted underline" onClick={onDone}>
          Keep swiping
        </button>
      </div>
    </div>
  );
}
