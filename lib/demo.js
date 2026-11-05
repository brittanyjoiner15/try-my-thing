import { cookies } from "next/headers";

// Two ways to be in demo mode, both on the fake data in lib/data/mock.js:
// 1. No Supabase keys (local dev): the whole server is a demo, with one shared set of data.
// 2. Visiting /demo on the real site: sets DEMO_COOKIE, and that visitor gets their own fake data
//    (a "sandbox") while everyone else keeps using Supabase.
export const DEMO_ENV = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const DEMO_USER = { id: "demo-you", email: "you@example.com" };

export const DEMO_COOKIE = "tmt_demo";
const SHARED_SANDBOX = "local";

// The visitor's sandbox id, or null when they're using the real app.
export async function demoSandbox() {
  if (DEMO_ENV) return SHARED_SANDBOX;
  const id = (await cookies()).get(DEMO_COOKIE)?.value;
  // Only ids we made (UUIDs), so a hand-edited cookie can't pick another visitor's sandbox by name.
  return id && /^[0-9a-f-]{36}$/.test(id) ? id : null;
}

export async function isDemo() {
  return Boolean(await demoSandbox());
}

// What "Connect GitHub" pulls in demo mode, where there's no real GitHub sign-in.
export const DEMO_GITHUB = {
  username: "demo-you",
  name: "Demo You",
  bio: "Building HogChat. Previously: too many dashboards.",
  location: "Austin, TX",
  avatar_url: null,
  languages: ["TypeScript", "JavaScript", "SQL"],
  repos: [
    { name: "hogchat", description: "Product analytics answers in Slack.", language: "TypeScript", stars: 86 },
    { name: "supabase-edge-starter", description: "Edge functions with auth and RLS wired up.", language: "TypeScript", stars: 21 },
    { name: "posthog-slack-digest", description: "Daily PostHog insights posted to a Slack channel.", language: "TypeScript", stars: 12 },
    { name: "til", description: "Things I learned, one Markdown file at a time.", language: null, stars: 4 },
    { name: "dotfiles", description: null, language: "Shell", stars: 1 },
  ],
};

// Short-lived marker that "Connect GitHub" was clicked, read by /auth/callback.
export const GITHUB_LINK_COOKIE = "tmt_github_link";
