// Server-side PostHog error tracking. Browser errors already go through posthog-js (capture_exceptions);
// this covers server actions, server components and after() work: Supabase failures, Resend limits, etc.
// Errors land in PostHog Error tracking, separate from the OpenTelemetry Logs in lib/posthog-logs.js.
import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// One client per server process. Netlify functions can freeze right after a response,
// so captureServerError sends immediately instead of batching.
const client = token && host ? (globalThis.__posthogServer ??= new PostHog(token, { host })) : null;

// `limit` names the quota we think was hit (e.g. "resend"), so an alert can filter on it.
export async function captureServerError(error, properties = {}) {
  if (!client) return;
  try {
    await client.captureExceptionImmediate(error, undefined, { source: "server", ...properties });
  } catch {
    // Reporting an error must never cause another one.
  }
}
