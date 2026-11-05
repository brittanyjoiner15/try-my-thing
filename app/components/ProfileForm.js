// Onboarding and /profile share this form. Pass `profile` to prefill it.
import { saveProfile } from "@/app/actions";
import ImageInput from "./ImageInput";
import { ROLES, TOPICS, LOOKING_FOR, TOPICS_MAX, BUILDING_MAX } from "@/lib/profile-options";

export default function ProfileForm({ profile, title, intro, submitLabel }) {
  return (
    <form action={saveProfile} className="panel mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
      </div>

      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="input" defaultValue={profile?.name} />
      </div>

      <ImageInput
        name="avatar"
        label="Profile photo (optional)"
        shape="round"
        hint="Shown on your builder card. PNG, JPG or WebP, under 2MB."
        currentUrl={profile?.avatar_url}
      />

      <div>
        <label className="label" htmlFor="role">Role</label>
        <select id="role" name="role" required className="input" defaultValue={profile?.role}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="stack">Your stack / tools you use daily</label>
        <input id="stack" name="stack" required className="input" placeholder="Next.js, Postgres, Cursor, PostHog" defaultValue={profile?.stack} />
        <p className="hint">Separate with commas. Builders who share tools rank higher in your deck.</p>
      </div>

      <div>
        <label className="label" htmlFor="interests">What kind of products do you like trying? (optional)</label>
        <input id="interests" name="interests" className="input" placeholder="dev tools, AI stuff, anything with a CLI" defaultValue={profile?.interests ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="discord_handle">Discord or forum handle (optional)</label>
        <input id="discord_handle" name="discord_handle" className="input" defaultValue={profile?.discord_handle ?? ""} />
      </div>

      <fieldset className="space-y-5 rounded-xl border border-border p-4">
        <legend className="px-1 font-bold">Meet other builders</legend>

        <label className="flex items-start gap-3">
          <input type="checkbox" name="open_to_builders" className="mt-1" defaultChecked={profile?.open_to_builders} />
          <span>
            Show me to other builders. You match when you both swipe right, and only then do you see each other&apos;s email.
          </span>
        </label>

        <div>
          <label className="label" htmlFor="building">What are you building, or what problem are you working on?</label>
          <textarea id="building" name="building" rows={2} maxLength={BUILDING_MAX} className="input" defaultValue={profile?.building ?? ""} />
        </div>

        <Chips name="topics" legend="Problem spaces" options={TOPICS} selected={profile?.topics} hint={`Pick up to ${TOPICS_MAX}.`} />
        <Chips name="looking_for" legend="Looking for" options={LOOKING_FOR} selected={profile?.looking_for} />

        <div>
          <label className="label" htmlFor="location">City</label>
          <input id="location" name="location" className="input" placeholder="Austin, TX" defaultValue={profile?.location ?? ""} />
          <p className="hint">Used to find builders near you. Only your city is shown, and we never store your exact location.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="github_url">GitHub (optional)</label>
            <input id="github_url" name="github_url" className="input" placeholder="github.com/you" defaultValue={profile?.github_url ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="linkedin_url">LinkedIn (optional)</label>
            <input id="linkedin_url" name="linkedin_url" className="input" placeholder="linkedin.com/in/you" defaultValue={profile?.linkedin_url ?? ""} />
          </div>
        </div>
        <p className="hint mt-0">Links are only shared after a match.</p>
      </fieldset>

      {/* Sharing on match is the whole service, so this is a notice, not a checkbox. consent_at records the first save. */}
      <p className="text-sm text-muted">
        When you match, that person sees your name, email, and profile. Builders also see your links after a mutual match.
      </p>

      <button className="btn-primary w-full">{submitLabel}</button>
    </form>
  );
}

function Chips({ name, legend, options, selected = [], hint }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="checkbox" name={name} value={o} defaultChecked={selected?.includes(o)} className="peer sr-only" />
            <span className="inline-block rounded-full border border-border px-3 py-1 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
              {o}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  );
}
