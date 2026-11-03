import Link from "next/link";
import { getUser } from "@/lib/session";

export default async function Home() {
  const user = await getUser();
  const start = user ? "/swipe" : "/login";

  return (
    <div className="py-12">
      <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
        Real people trying your thing.
        <br />
        <span className="text-accent">Honest feedback, no surveys.</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Builders post what they&apos;re making. Testers swipe through it. Swipe right and you both get
        each other&apos;s email. You take it from there.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="panel">
          <h2 className="text-xl font-bold">Building something?</h2>
          <p className="mt-2 text-muted">
            Post your product, say who should try it and what you want feedback on. Get matched with people who
            actually want to.
          </p>
          <Link href={user ? "/products" : "/login"} className="btn-primary mt-4">
            Post my product
          </Link>
        </div>
        <div className="panel">
          <h2 className="text-xl font-bold">Like trying new tools?</h2>
          <p className="mt-2 text-muted">
            Swipe through what PostHog community members are building. Get early access and credit for helping.
          </p>
          <Link href={start} className="btn-ghost mt-4">
            Start swiping
          </Link>
        </div>
      </div>

      <p className="mt-8 text-sm text-muted">
        When you match, we share your name and email with the other person. That&apos;s the whole point, but
        you&apos;ll agree to it before anything happens.
      </p>
    </div>
  );
}
