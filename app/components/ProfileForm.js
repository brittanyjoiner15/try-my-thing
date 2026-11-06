"use client";

// Onboarding and /profile share this form. Pass `profile` to prefill it.
// Pass `github` (a github_profiles row) to fill empty fields from GitHub and suggest it for the rest.
import { useState } from "react";
import posthog from "posthog-js";
import { saveProfile } from "@/app/actions";
import ImageInput from "./ImageInput";
import { ROLES, TOPICS, LOOKING_FOR, TOPICS_MAX, BUILDING_MAX } from "@/lib/profile-options";

export default function ProfileForm({ profile, github, title, intro, submitLabel }) {
  const gh = githubValues(github);
  // Their own answer wins. GitHub only fills what's empty.
  const initial = (key) => profile?.[key] || gh[key] || "";
  // A suggestion shows only when GitHub says something different from what they already wrote.
  const differs = (key) => gh[key] && profile?.[key] && gh[key] !== profile[key];
  const newLanguages = missingFrom(profile?.stack, github?.languages);
  // Saved locations are geocoded ("Austin, United States") and GitHub's are free text ("Austin, TX"),
  // so compare only the city part or the suggestion would never go away.
  const city = (l) => l?.split(",")[0].trim().toLowerCase();
  const newLocation = differs("location") && city(gh.location) !== city(profile.location);

  return (
    <form
      action={saveProfile}
      className="panel mx-auto max-w-xl space-y-5"
      onSubmit={() => posthog.capture(profile ? "profile_updated" : "profile_created")}
    >
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-muted">{intro}</p>
      </div>

      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="input" defaultValue={initial("name")} />
        {differs("name") && <Suggest field="name" value={gh.name} />}
      </div>

      <ImageInput
        name="avatar"
        label="Profile photo (optional)"
        shape="round"
        hint="Shown on your builder card. PNG, JPG or WebP, under 2MB."
        currentUrl={profile?.avatar_url || gh.avatar_url}
      />
      {profile?.avatar_url && differs("avatar_url") && (
        <label className="-mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border p-2 text-sm">
          <input type="checkbox" name="use_github_avatar" onChange={(e) => e.target.checked && posthog.capture("github_suggestion_used", { field: "avatar" })} />
          {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatar URL */}
          <img src={gh.avatar_url} alt="" className="h-10 w-10 rounded-full border border-border" />
          Use my GitHub photo instead
        </label>
      )}

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
        <input id="stack" name="stack" required className="input" placeholder="Next.js, Postgres, Cursor, PostHog" defaultValue={initial("stack")} />
        {profile?.stack && newLanguages.length > 0 && <Suggest field="stack" value={newLanguages.join(", ")} append label="Add from GitHub" />}
        <p className="hint">Separate with commas. Builders who share tools rank higher in your deck.</p>
      </div>

      <div>
        <label className="label" htmlFor="interests">What kind of products do you like trying? (optional)</label>
        <input id="interests" name="interests" className="input" placeholder="dev tools, AI stuff, anything with a CLI" defaultValue={profile?.interests ?? ""} />
      </div>

      <fieldset className="space-y-5 rounded-xl border border-border p-4">
        <legend className="px-1 font-bold">Meet other builders</legend>

        <label className="flex items-start gap-3">
          <input type="checkbox" name="open_to_builders" className="mt-1" defaultChecked={profile?.open_to_builders} />
          <span>
            Show me to other builders. You match when you both swipe right, and only then can you chat.
          </span>
        </label>

        <div>
          <label className="label" htmlFor="building">What are you building, or what problem are you working on?</label>
          <textarea id="building" name="building" rows={2} maxLength={BUILDING_MAX} className="input" defaultValue={initial("building")} />
          {differs("building") && <Suggest field="building" value={gh.building} label="Your GitHub bio" />}
        </div>

        <Chips name="topics" legend="Problem spaces" options={TOPICS} selected={profile?.topics} hint={`Pick up to ${TOPICS_MAX}.`} />
        <Chips name="looking_for" legend="Looking for" options={LOOKING_FOR} selected={profile?.looking_for} />

        <div>
          <label className="label" htmlFor="location">City</label>
          <input id="location" name="location" className="input" placeholder="Austin, TX" defaultValue={initial("location")} />
          {newLocation && <Suggest field="location" value={gh.location} />}
          <p className="hint">Used to find builders near you. Only your city is shown, and we never store your exact location.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="github_url">GitHub (optional)</label>
            <input id="github_url" name="github_url" className="input" placeholder="github.com/you" defaultValue={initial("github_url")} />
            {differs("github_url") && <Suggest field="github_url" value={gh.github_url} />}
          </div>
          <div>
            <label className="label" htmlFor="linkedin_url">LinkedIn (optional)</label>
            <input id="linkedin_url" name="linkedin_url" className="input" placeholder="linkedin.com/in/you" defaultValue={profile?.linkedin_url ?? ""} />
          </div>
        </div>
        <p className="hint mt-0">Links are only shared after a match.</p>

        {github?.repos.length > 0 && <RepoPicker repos={github.repos} picked={profile?.featured_repos} />}
      </fieldset>

      {/* Sharing a profile on match is the whole service, so this is a notice, not a checkbox. consent_at records the first save. */}
      <p className="text-sm text-muted">
        When you match, that person sees your name and profile, and you chat in the app. Your email stays private. Builders also see your links after a mutual match.
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

// github_profiles row → the same keys as the profile form fields.
function githubValues(github) {
  if (!github) return {};
  return {
    name: github.name || github.username,
    avatar_url: github.avatar_url,
    stack: github.languages.join(", "),
    building: github.bio?.slice(0, BUILDING_MAX),
    location: github.location,
    github_url: `https://github.com/${github.username}`,
  };
}

// GitHub languages that aren't in their stack yet (case-insensitive).
function missingFrom(stack, languages = []) {
  const have = new Set((stack ?? "").split(/[,/]/).map((s) => s.trim().toLowerCase()));
  return languages.filter((l) => !have.has(l.toLowerCase()));
}

// "GitHub: Austin, TX · Use this" under a field. Writes into the (uncontrolled) input, so nothing saves until Save.
function Suggest({ field, value, label = "GitHub", append = false }) {
  return (
    <p className="hint flex flex-wrap items-baseline gap-x-2">
      <span className="min-w-0">
        {label}: <span className="text-foreground wrap-anywhere">{value}</span>
      </span>
      <button
        type="button"
        className="font-semibold text-accent underline"
        onClick={(e) => {
          const input = document.getElementById(field);
          input.value = append && input.value.trim() ? `${input.value.trim()}, ${value}` : value;
          e.currentTarget.parentElement.hidden = true;
          posthog.capture("github_suggestion_used", { field });
        }}
      >
        {append ? "Add" : "Use this"}
      </button>
    </p>
  );
}

const FEATURED_REPOS_MAX = 3; // also enforced in app/actions.js

// Checkboxes for the repos on their builder card. Never picked before (null): their top 3 start checked.
function RepoPicker({ repos, picked }) {
  const [selected, setSelected] = useState(() => picked ?? repos.slice(0, FEATURED_REPOS_MAX).map((r) => r.name));
  const full = selected.length >= FEATURED_REPOS_MAX;

  return (
    <fieldset>
      <legend className="label">Repos on your builder card</legend>
      <p className="hint mb-2 mt-0">
        Pick up to {FEATURED_REPOS_MAX}. Builders see the name and description, no links, until you match. Pick none to hide them.
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {repos.map((r) => {
          const on = selected.includes(r.name);
          return (
            <label
              key={r.name}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${on ? "border-accent" : "border-border"} ${!on && full ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                name="featured_repos"
                value={r.name}
                checked={on}
                disabled={!on && full}
                className="mt-1"
                onChange={() => setSelected(on ? selected.filter((n) => n !== r.name) : [...selected, r.name])}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 font-semibold wrap-anywhere">{r.name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {[r.language, r.stars > 0 && `★ ${r.stars}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {r.description && <span className="line-clamp-1 text-sm text-muted">{r.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
