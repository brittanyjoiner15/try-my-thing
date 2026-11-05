import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { getProfile, getGitHubProfile, saveGitHubProfile } from "@/lib/data";
import { fetchGitHubProfile } from "@/lib/github";
import { GITHUB_LINK_COOKIE } from "@/lib/demo";
import { captureServerError } from "@/lib/posthog-server";
import { flushPostHogLogs, logPostHogAction } from "@/lib/posthog-logs";

// Magic links, "Continue with GitHub" and "Connect GitHub" all land here.
// Swap the one-time code for a login session, then pull GitHub data if this was a GitHub sign-in.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  // Set by connectGitHub in app/actions.js, so we know to send them back to /profile.
  const linking = cookieStore.has(GITHUB_LINK_COOKIE);
  cookieStore.delete(GITHUB_LINK_COOKIE);

  const supabase = code ? await createAuthClient() : null;
  const { data, error } = code ? await supabase.auth.exchangeCodeForSession(code) : { error: true };
  if (error) {
    // e.g. that GitHub account is already linked to another try my thing account
    return NextResponse.redirect(linking ? `${origin}/profile?github=error` : `${origin}/login?error=link`);
  }

  const { user, session } = data;
  // GitHub's token comes back only on this one exchange. Magic links don't have one.
  const githubToken = session.provider_token;
  if (!githubToken || !user.identities?.some((i) => i.provider === "github")) {
    return NextResponse.redirect(`${origin}/swipe`);
  }

  // Refresh on every GitHub sign-in, so languages and repos stay current.
  const [profile, before] = await Promise.all([getProfile(user.id), getGitHubProfile(user.id)]);
  let fetched = false;
  try {
    await saveGitHubProfile({ id: user.id, ...(await fetchGitHubProfile(githubToken)) });
    fetched = true;
  } catch (e) {
    // Sign-in still works, the profile just isn't prefilled.
    await captureServerError(e, { area: "github_fetch", limit: e.code === "github_403" ? "github" : undefined });
  }
  logPostHogAction("github data fetched", {
    event: "github_data_fetched",
    ok: fetched,
    first_time: !before,
    via: linking ? "connect" : "sign_in",
    has_profile: Boolean(profile),
  });
  await flushPostHogLogs();

  if (!profile) return NextResponse.redirect(`${origin}/onboarding`); // onboarding prefills from GitHub
  // First time GitHub data shows up for an existing profile: send them to review the suggestions.
  if (linking || !before) return NextResponse.redirect(`${origin}/profile?github=${fetched ? "connected" : "error"}`);
  return NextResponse.redirect(`${origin}/swipe`);
}
