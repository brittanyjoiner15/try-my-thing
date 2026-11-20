// Reads the latest production deploy from the Netlify API for the /admin dashboard.
// Needs NETLIFY_API_TOKEN (a Netlify personal access token) and NETLIFY_SITE_ID (Site configuration →
// Site details → Site ID). Without them, getLatestDeploy returns { error } and /admin shows a note.
// Server-only: Netlify tokens can't be scoped, so this one can change anything on the account.
import { captureServerError } from "@/lib/posthog-server";

const token = process.env.NETLIFY_API_TOKEN;
// Netlify also sets SITE_ID on its own servers, so NETLIFY_SITE_ID is mainly for local dev.
const siteId = process.env.NETLIFY_SITE_ID ?? process.env.SITE_ID;

export async function getLatestDeploy() {
  if (!token || !siteId) return { error: "Add NETLIFY_API_TOKEN and NETLIFY_SITE_ID to see the latest deploy." };
  try {
    // Deploy previews and branch deploys are mixed into this list, so take the newest production one.
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=20`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Netlify deploys request failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const d = (await res.json()).find((x) => x.context === "production");
    if (!d) return { error: "No production deploys in the last 20 deploys." };
    return {
      deploy: {
        state: d.state, // ready = live, error = failed, anything else = still building
        title: d.title, // the commit message; merges read "Merge pull request #49 from ..."
        commit: d.commit_ref?.slice(0, 7),
        commitUrl: d.commit_url,
        branch: d.branch,
        createdAt: d.created_at,
        error: d.error_message,
        logUrl: `${d.admin_url}/deploys/${d.id}`,
      },
    };
  } catch (e) {
    await captureServerError(e, { area: "admin_dashboard" });
    return { error: "Couldn't load Netlify deploys. The error is in PostHog Error tracking." };
  }
}
