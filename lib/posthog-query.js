// Reads analytics back out of PostHog for the /admin dashboard, with a HogQL query.
// Needs a personal API key (scope Query: Read, limited to this project) and the project ID. Without
// them, getWeeklyGrowth returns { error } and /admin shows only the Supabase totals.
// Server-only: the key must never reach the browser.
import { captureServerError } from "@/lib/posthog-server";

const key = process.env.POSTHOG_PERSONAL_API_KEY;
const projectId = process.env.POSTHOG_PROJECT_ID;
// NEXT_PUBLIC_POSTHOG_HOST is the ingestion host (us.i.posthog.com). The query API lives on the app host.
const apiHost = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "").replace(".i.posthog.com", ".posthog.com");

async function hogql(query) {
  const res = await fetch(`${apiHost}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query }, name: "admin dashboard" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).results;
}

const WEEKS = 8;

// Signups, products posted and matches opened per week (weeks start Monday), oldest first.
// These events are server-side, so ad blockers don't drop them. History: user_signed_up and
// product_posted start 2026-11-19, match_opened starts when this shipped. Earlier weeks read 0.
export async function getWeeklyGrowth() {
  if (!key || !projectId || !apiHost) return { error: "Add POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID to see weekly growth." };
  try {
    const rows = await hogql(`
      SELECT toStartOfWeek(timestamp, 1) AS week,
             countIf(event = 'user_signed_up') AS signups,
             countIf(event = 'product_posted') AS products,
             countIf(event = 'match_opened') AS matches
      FROM events
      WHERE event IN ('user_signed_up', 'product_posted', 'match_opened')
        AND timestamp >= toStartOfWeek(now(), 1) - INTERVAL ${WEEKS - 1} WEEK
      GROUP BY week
      ORDER BY week`);
    const byWeek = new Map(rows.map(([week, signups, products, matches]) => [String(week).slice(0, 10), { signups, products, matches }]));
    return { weeks: lastWeeks(WEEKS).map((week) => ({ week, ...(byWeek.get(week) ?? { signups: 0, products: 0, matches: 0 }) })) };
  } catch (e) {
    await captureServerError(e, { area: "admin_dashboard" });
    return { error: "Couldn't load PostHog data. The error is in PostHog Error tracking." };
  }
}

// Monday dates (YYYY-MM-DD) of the last n weeks, oldest first, so weeks with no events still show.
// TODO: this uses the server's clock (UTC on Netlify) while PostHog buckets weeks in the project
// timezone, so a week can be off by one near midnight on Sunday. Fine for a growth view.
function lastWeeks(n) {
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() - 7 * (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}
