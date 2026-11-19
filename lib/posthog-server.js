// Server-side PostHog error tracking. Browser errors already go through posthog-js (capture_exceptions);
// this covers server actions, server components and after() work: Supabase failures, email send errors, etc.
// Errors land in PostHog Error tracking, separate from the OpenTelemetry Logs in lib/posthog-logs.js.
import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// One client per server process. Netlify functions can freeze right after a response,
// so captureServerError sends immediately instead of batching.
// secretKey (a project secret API key with Transactional email: Write) is only for posthog.emails.send
// in lib/match-emails.js. Local evaluation stays off: that key can't read feature flag definitions.
const secretKey = process.env.POSTHOG_SECRET_KEY || undefined;
const client = token && host
  ? (globalThis.__posthogServer ??= new PostHog(token, { host, secretKey, enableLocalEvaluation: false }))
  : null;

// The shared client for sending transactional email, or null when it can't send (no keys).
export const emailClient = client && secretKey ? client : null;

// `limit` names the quota we think was hit (e.g. "posthog_email"), so an alert can filter on it.
export async function captureServerError(error, properties = {}) {
  if (!client) return;
  try {
    await client.captureExceptionImmediate(error, undefined, { source: "server", ...properties });
  } catch {
    // Reporting an error must never cause another one.
  }
}
