import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";

// Signed-in people already know the pitch. Send them straight to the deck.
export default async function Home() {
  if (await getUser()) redirect("/swipe");

  return (
    <div className="space-y-20 py-10">
      <section className="grid items-center gap-10 sm:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-accent">Tinder for SaaS</p>
          <h1 className="mt-2 text-5xl font-black leading-[1.05]">
            Swipe right
            <br />
            on software.
          </h1>
          <p className="mt-4 text-lg text-muted">Builders post. Testers swipe. Matches get emails.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary">
              Start swiping
            </Link>
            <Link href="/login" className="btn-ghost">
              Post my product
            </Link>
          </div>
        </div>
        <CardStack />
      </section>

      <section>
        <h2 className="text-center text-2xl font-bold">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          <Step n="1" title="Post it" text="Your product, who it's for, what you want feedback on." />
          <Step n="2" title="Swipe it" text="Testers flip through cards. ♥ or ✕." />
          <Step n="3" title="Match" text="Both sides get an email. Go talk." />
        </ol>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="panel">
          <p className="text-3xl">🛠️</p>
          <h2 className="mt-2 text-xl font-bold">Builders</h2>
          <p className="mt-1 text-muted">Real testers. No surveys.</p>
        </div>
        <div className="panel">
          <p className="text-3xl">🧪</p>
          <h2 className="mt-2 text-xl font-bold">Testers</h2>
          <p className="mt-1 text-muted">New tools first. Perks for helping.</p>
        </div>
        <div className="panel sm:col-span-2">
          <p className="text-3xl">🤝</p>
          <h2 className="mt-2 text-xl font-bold">Builders ↔ builders</h2>
          <p className="mt-1 text-muted">
            Swipe on other builders nearby, in your space or on your stack. Mutual ♥ only.
          </p>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-3xl font-black">
          Find your match<span className="text-accent">.</span>
        </h2>
        <p className="mt-2 text-sm text-muted">Emails are only shared when you match.</p>
        <Link href="/login" className="btn-primary mt-6 px-8 py-3 text-lg">
          Get started
        </Link>
      </section>
    </div>
  );
}

// Example cards in the same shape as the real swipe deck. The top one swings right on a loop (CSS in globals.css).
const EXAMPLES = [
  { name: "HogChat", tagline: "Product analytics answers in Slack.", chips: ["Web", "Slack"] },
  { name: "Shipshape", tagline: "Pre-flight checks for App Store submissions.", chips: ["iOS"] },
  { name: "Ledgerly", tagline: "Invoices your B2B customers can read.", chips: ["Web"] },
];

function CardStack() {
  const [top, ...rest] = EXAMPLES;
  return (
    <div className="relative mx-auto h-80 w-64" aria-hidden="true">
      {rest.reverse().map((card, i) => (
        <ExampleCard key={card.name} card={card} className={i === 0 ? "-rotate-6 scale-95" : "rotate-3 scale-[0.97]"} />
      ))}
      <ExampleCard card={top} className="landing-swipe">
        <span className="landing-stamp absolute left-4 top-4 rounded-md border-2 border-green-600 bg-card px-2 py-1 text-sm font-black text-green-600">
          TRY IT
        </span>
      </ExampleCard>
    </div>
  );
}

function ExampleCard({ card, className = "", children }) {
  return (
    <div className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg ${className}`}>
      {children}
      <div className="flex flex-1 items-center justify-center bg-accent/10">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-4xl font-black text-white">
          {card.name.charAt(0)}
        </span>
      </div>
      <div className="space-y-1 border-t border-border p-4">
        <p className="text-lg font-bold">{card.name}</p>
        <p className="text-sm text-muted">{card.tagline}</p>
        <ul className="flex gap-1 pt-1 text-xs">
          {card.chips.map((chip) => (
            <li key={chip} className="rounded-full border border-border px-2 py-0.5">
              {chip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <li className="panel">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-black text-white">{n}</span>
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </li>
  );
}
