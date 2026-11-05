# PostHog wizard review

What the PostHog wizard changed in this app, what a review (Claude Code, 2026-11-04) found wrong with it, and what's been fixed since.

**Verdict:** the browser analytics are mostly good. The main gaps were the env var rename, server-side logging that only records successes and slows down requests, and emails showing up in PostHog. Status for each is below.

## Who did what

| Who | What |
|---|---|
| **PostHog wizard** | Everything under "What the wizard added": browser setup, `identify`, events, `global-error.js`, OpenTelemetry server logs, and the env var rename. It added **no** session replay masking. |
| **Review (Claude Code)** | Found that a `pnpm install` during `next dev` caused the reload loop. Found the env var rename would silently turn off analytics in production. Found that server logs only record successes and make requests wait. Found that nothing kept emails out of replays, and **added the `ph-no-capture` masking**. Wrote this doc and updated `AGENTS.md`. |
| **Britt** | Decided to keep the dev-mode crash. Renamed the env vars on Netlify and added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` to `SECRETS_SCAN_OMIT_KEYS`. Parked the terms/privacy note. |

---

## What the wizard added

### 1. Browser setup: `instrumentation-client.js`
- Renamed the env vars from `NEXT_PUBLIC_POSTHOG_KEY` to `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and made `NEXT_PUBLIC_POSTHOG_HOST` required (no default anymore).
- Turned on `capture_exceptions: true`, so uncaught browser errors go to Error Tracking.
- Set `defaults: "2026-01-30"`, which picks PostHog's current default settings.
- Turned on `debug` in development, which logs every PostHog call to the console.
- **Throws an error in development if either env var is missing.** Before, the code skipped PostHog when no key was set.

### 2. Who the user is: `app/components/BottomNav.js`
- Calls `posthog.identify(userId, { email })` whenever a logged-in page loads, so events are tied to the Supabase user and their email.
- Calls `posthog.reset()` if the user ID changes, or when a form marked with `data-posthog-sign-out` is submitted. That attribute was added to the sign-out form in `app/profile/page.js`.
- `app/layout.js` now passes `userId` and `userEmail` into `BottomNav`.

### 3. Browser events
| Event | Where | Fires when |
|---|---|---|
| `magic_link_requested` | `app/login/page.js` | Login form submitted |
| `profile_created` / `profile_updated` | `app/components/ProfileForm.js` | Profile form submitted |
| `product_created` / `product_updated` | `app/components/ProductForm.js` | Product form submitted |
| `product_swiped` / `builder_swiped` | `app/swipe/SwipeDeck.js` | Swipe saved on the server (renamed from `product swiped` / `builder swiped`) |
| `product_match_created` / `builder_match_created` | `app/swipe/SwipeDeck.js` | A swipe returns a match |
| `match_outreach_started` | `app/swipe/SwipeDeck.js` | "Message" tapped on the builder match screen (`match_type: builder`). The product version went away with chat: testers can't message until the builder accepts. |
| `tester_request_answered` | `app/matches/RespondButtons.js` | Builder taps Accept or Pass. Props: `accepted`, `chat_id`, `product_id`, `hours_waiting` |
| `chat_opened` | `app/matches/[chatId]/ChatThread.js` | A chat page loads. Props: `chat_id`, `chat_type`, `status`, `message_count` |
| `message_sent` | `app/matches/[chatId]/ChatThread.js` | A message is saved. Props (worked out on the server): `chat_id`, `chat_type` (product/builder), `sender_side` (tester/builder/builder_match), `is_first_message`, `is_reply`, `hours_since_match`, `message_length`, plus `was_draft` (sent the pre-written intro unedited) |

`ProfileForm` and `ProductForm` became client components (`"use client"`) so they can call `posthog.capture`.

### 4. Error page: `app/global-error.js` (new)
- Next.js shows this page when the whole app crashes. It sends the error to PostHog with `posthog.captureException`.

### 5. Server "events" through OpenTelemetry logs
- New files: `instrumentation.js` and `lib/posthog-logs.js`.
- New dependencies: `@opentelemetry/api-logs`, `exporter-logs-otlp-http`, `resources`, `sdk-logs`.
- `app/actions.js` logs `profile_saved`, `product_created` and `product_swipe_recorded`, and then waits for the logs to send (`await flushPostHogLogs()`) before each action finishes.
- `instrumentation.js` also throws in development if the env vars are missing.

### 6. Config files
- `.env.example`: new variable names.
- `.gitignore`: added `.env.local`. This does nothing, because `.env*` on line 34 already ignores it.

---

## What I'd do differently

### Fix before committing

**1. Dev-mode crash when env vars are missing.** ✅ Decided: keep it.
In both `instrumentation-client.js` and `instrumentation.js`, the app throws if the PostHog vars aren't set. Britt is fine with this: a real app needs the keys anyway. The only cost is that demo mode no longer runs without PostHog keys.

**2. Rename the env vars on Netlify.** ✅ Done (2026-11-04).
The wizard renamed `NEXT_PUBLIC_POSTHOG_KEY` to `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`. Outside development, a missing token fails silently (no error, no analytics), so Netlify needed the new name. `NEXT_PUBLIC_POSTHOG_HOST` was already set there. The first deploy after the rename then failed Netlify's secret scan: the scanner flagged the PostHog token in the build output, even though the token is public by design (it ships in browser JavaScript). Fixed by adding `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` to `SECRETS_SCAN_OMIT_KEYS` in Netlify. We kept the new names in code because they match PostHog's current setup, so future wizard runs won't rename them again. Leftover: delete the empty `NEXT_PUBLIC_POSTHOG_KEY=` line from `.env.local`.

**3. Server-side logging: keep it, but log the right things.** Not started.
Logging with OpenTelemetry is a good idea. The problem is what the wizard logs and how:
- **It only logs successes** ("profile saved", "product created", "swipe recorded"). The browser analytics events already cover those. Logs are most useful when something goes wrong, and today no failure is logged: failed image uploads, Supabase errors, a swipe blocked by the weekly limit, a duplicate swipe, a geocode failure.
- **Users wait for the logs.** Every save and every swipe runs `await flushPostHogLogs()`, so the user waits for a network call to PostHog before getting a response. Next's `after()` (from `next/server`) runs the flush after the response is sent. It still needs a check that `after()` finishes reliably on Netlify.
- The comment in `lib/posthog-logs.js` says only this logger goes to PostHog. That isn't true: `register()` makes PostHog the destination for every OpenTelemetry log in the app. Fix the comment, or don't set the global provider.
- `deployment.environment` reads `VERCEL_ENV`, which doesn't exist on Netlify. Netlify sets `CONTEXT` (`production`, `deploy-preview`, `branch-deploy`) during builds. Check that it's also available while the app runs before switching to it.

**Plan:** keep the 4 OpenTelemetry packages. Add `warn`/`error` logs on the failure paths in `app/actions.js`. Move the flush into `after()`. Fix the comment and the environment name. Optional: drop the success logs that repeat analytics events.

**4. Emails in PostHog.** Partly done.
The README promises that emails are only shown to the two people in a match and to admins.
- **Session replay:** ✅ masked (2026-11-04), **added in review, not by the wizard.** The wizard set up identify and events but did nothing to keep emails out of recordings. Replay is currently **off** for this app's PostHog project (events carry `$recording_status: disabled`), but it can be turned on in the PostHog UI with no code change. Every element that shows an email now has the `ph-no-capture` class, so it shows as a blank block in recordings:
  - Match screens in `app/swipe/SwipeDeck.js` (the email box)
  - Email links on `app/matches/page.js`
  - Emails on `app/admin/page.js`
  - The email input on `app/login/page.js` (PostHog masks inputs by default, but a project setting can turn that off)
- **Still in recordings:** the "Email (pre-written)" buttons. Their link (`mailto:`) contains the email and the intro text. It isn't visible when watching a replay, but it's stored in the recording data. They're left unmasked so replays still show the main button. Add `ph-no-capture` to them too if that matters.
- **Person profiles:** `identify` still sends every user's email to PostHog. This is useful for finding people in PostHog. Britt will handle telling users with terms or a privacy note later, since that isn't a PostHog question.

### Worth doing soon

**5. Track sign-in and sign-up on the server.**
There's no event for "signed in" or "created an account" today. Add `user_signed_in` with `is_new_user` in `app/auth/callback/route.js` after the code exchange succeeds. That's the only place that knows the login actually worked.

**6. Capture form events after the server save succeeds, not on submit.**
`profile_created` and `product_created` fire when the form is submitted, even if validation fails or the server action throws. Fix: capture on the server after the save succeeds (with `posthog-node`, like item 5).

**7. Capture server errors too.**
`capture_exceptions` and `global-error.js` only catch browser-side crashes. Errors in server actions and server components (Supabase failures, upload errors) aren't tracked. Add `onRequestError` in `instrumentation.js` and send the error with `posthog-node`'s `captureException`.

**Done (2026-11-05, chat PR):** `instrumentation.js` exports `onRequestError`, which sends server errors to Error tracking through `lib/posthog-server.js`. Failed Resend emails (they run in `after()`, so `onRequestError` doesn't see them) are reported from `lib/match-emails.js` with `limit: "resend"` on a 429. The chat page reports the first failed poll in a streak (`feature: "chat"`), not one per 5s. Supabase errors keep their `code`. Our own message rate limit goes to Logs as `message_rate_limited`.

**8. Add properties to the match events.**
`product_match_created` and `builder_match_created` have no properties. Add `product_id` or `builder_id` so you can see which products get matches.

### Nice to have

**9. Turn off `debug` in development.**
It logs every PostHog call in the browser, and Next forwards browser logs to the dev-server log. That's why the log file reached 41k lines during today's reload loop. Turn it on only while debugging.

**10. Add a reverse proxy.**
Ad blockers block `*.i.posthog.com`, and dev-tool users (your audience) run a lot of ad blockers. A Next.js rewrite from `/ingest` to PostHog fixes this. It's about 10 lines in `next.config.mjs`.

**11. Make sign-out reset less fragile.**
The `data-posthog-sign-out` listener works, but only for that one form. Calling `posthog.reset()` in a small client sign-out button, or when the user ID becomes null, is easier to follow.

**12. Remove the extra `.env.local` line in `.gitignore`.** `.env*` already covers it.

---

## What the wizard got right
- Swipe events now fire **after** the server accepts the swipe, so blocked and duplicate swipes aren't counted. That's better than before.
- Event names now use one style (`snake_case`).
- Users are identified, and `reset()` on sign-out means two people sharing a browser aren't merged into one person.
- `match_outreach_started` is a good addition: it measures whether a match leads to an email.
- `global-error.js` follows PostHog's official Next.js pattern.
