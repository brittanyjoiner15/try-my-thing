import { redirect } from "next/navigation";
import { getUser } from "@/lib/session";
import { getProfile } from "@/lib/data";
import { saveProfile } from "@/app/actions";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect("/swipe");

  return (
    <form action={saveProfile} className="panel mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">About you</h1>
        <p className="mt-1 text-muted">Builders see this when you match, so they know who&apos;s trying their thing.</p>
      </div>

      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="input" />
      </div>

      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" required className="input">
          <option>engineer</option>
          <option>founder</option>
          <option>PM</option>
          <option>designer</option>
          <option>other</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="stack">Your stack / tools you use daily</label>
        <input id="stack" name="stack" required className="input" placeholder="Next.js, Postgres, Cursor, PostHog" />
      </div>

      <div>
        <label className="label" htmlFor="interests">What kind of products do you like trying? (optional)</label>
        <input id="interests" name="interests" className="input" placeholder="dev tools, AI stuff, anything with a CLI" />
      </div>

      <div>
        <label className="label" htmlFor="discord_handle">Discord or forum handle (optional)</label>
        <input id="discord_handle" name="discord_handle" className="input" />
      </div>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="shoutout_ok" className="mt-1" />
        <span>Shout me out in the PostHog community when I help a builder.</span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I&apos;m OK with my name, email, and the answers above being shared with the people I match with.
        </span>
      </label>

      <button className="btn-primary w-full">Let&apos;s go</button>
    </form>
  );
}
