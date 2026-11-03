"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { swipe } from "@/app/actions";

const THRESHOLD = 110; // px of drag before a release counts as a swipe

export default function SwipeDeck({ initialCards }) {
  const [cards, setCards] = useState(initialCards);
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState(null); // "left" | "right" while the card animates out
  const [message, setMessage] = useState(null);
  const [match, setMatch] = useState(null); // builder contact details after a right swipe
  const [, startTransition] = useTransition();
  const dragStart = useRef(null);
  const [dragging, setDragging] = useState(false);

  const card = cards[0];

  function decide(direction) {
    if (!card || flying) return;
    setFlying(direction);
    setMessage(null);
    posthog.capture("product swiped", { direction, product_id: card.id });

    startTransition(async () => {
      const result = await swipe(card.id, direction);
      if (result?.error) setMessage({ type: "error", text: result.error });
      else if (result?.match) setMatch(result.match);
    });

    // Let the fly-out animation play, then drop the card.
    setTimeout(() => {
      setCards((c) => c.slice(1));
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

  if (match) return <MatchScreen match={match} onDone={() => setMatch(null)} />;

  if (!card) {
    return (
      <div className="panel mx-auto mt-8 max-w-md text-center">
        {message && <Message {...message} />}
        <h1 className="text-2xl font-bold">You&apos;ve seen everything</h1>
        <p className="mt-2 text-muted">New products show up as builders post them. Building something yourself?</p>
        <Link href="/products" className="btn-primary mt-4">
          Post my product
        </Link>
      </div>
    );
  }

  const offset = flying ? (flying === "right" ? 600 : -600) : dx;

  return (
    <div className="mx-auto max-w-md pt-4">
      {message && <Message {...message} />}

      <div
        className="panel relative cursor-grab touch-none select-none shadow-lg active:cursor-grabbing"
        style={{
          transform: `translateX(${offset}px) rotate(${offset / 20}deg)`,
          transition: dragging ? "none" : "transform 250ms ease",
        }}
        onPointerDown={(e) => {
          dragStart.current = e.clientX;
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => dragStart.current !== null && setDx(e.clientX - dragStart.current)}
        onPointerUp={() => {
          dragStart.current = null;
          setDragging(false);
          if (dx > THRESHOLD) decide("right");
          else if (dx < -THRESHOLD) decide("left");
          else setDx(0);
        }}
      >
        <Stamp show={offset > 40} className="left-4 border-green-600 text-green-600">TRY IT</Stamp>
        <Stamp show={offset < -40} className="right-4 border-muted text-muted">SKIP</Stamp>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {card.stage} · by {card.builder}
        </p>
        <h1 className="mt-2 text-3xl font-bold">{card.name}</h1>
        <p className="mt-2 text-lg">{card.tagline}</p>

        <dl className="mt-6 space-y-3 text-sm">
          <Row label="Looking for">{card.wants}</Row>
          <Row label="Feedback on">{card.feedback_on}</Row>
          <Row label="You get">{card.perk}</Row>
        </dl>

        <a
          href={card.url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-sm font-semibold text-accent underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          Peek at the site ↗
        </a>
      </div>

      <div className="mt-6 flex justify-center gap-4">
        <button className="btn-ghost w-32" onClick={() => decide("left")}>
          ✕ Skip
        </button>
        <button className="btn-primary w-32" onClick={() => decide("right")}>
          ♥ Try it
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        Drag the card, or use ← → keys. Try it = you get {card.builder}&apos;s email to set it up.
      </p>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div>
      <dt className="font-semibold text-muted">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Stamp({ show, className, children }) {
  return (
    <span
      className={`absolute top-4 rounded-md border-2 px-2 py-1 text-sm font-black transition-opacity ${className}`}
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

      <p className="mt-6 rounded-lg border border-border px-4 py-3 font-mono text-sm">{match.builderEmail}</p>

      <div className="mt-4 flex flex-col gap-2">
        <a href={match.mailto} className="btn-primary">
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
