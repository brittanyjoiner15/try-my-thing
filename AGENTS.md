<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (try my thing)

Tinder for trying software, from the PostHog community. Read `README.md` first for routes and the privacy model.

### Where things run
- **Hosting:** Netlify (not Vercel, despite the README's Deploy section). Netlify caps function requests at 6MB, which is why `serverActions.bodySizeLimit` is 5MB.
- **Domain:** `trymything.app`, registered and DNS on Cloudflare. Not wired to Netlify or set as the Supabase Site URL yet.
- **Supabase:** project `try-my-thing`, ref `kwuossjlcjpzmhmlzhuu`.
- **Email:** Supabase Auth sends magic links through Resend SMTP (`smtp.resend.com:465`, user `resend`). Resend is verified on the **root** domain, so the sender must be `@trymything.app` (not `@mail.trymything.app`).
- **Match emails:** `lib/match-emails.js` emails both people on a match (tester and builder, or two builders), the tester when a builder accepts, and the other person on a new chat message, through Resend's HTTP API from `after()` so swipes don't wait on it. Needs `RESEND_API_KEY` and `MATCH_EMAIL_FROM` (an `@trymything.app` sender). Without them nothing is sent; demo mode prints the emails to the server console. No email has a Reply-To and none shows the other person's address: people never see each other's emails.
- **PostHog:** US cloud. Env vars are `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`, set in `.env.local` and Netlify (renamed from `NEXT_PUBLIC_POSTHOG_KEY` on 2026-11-04). Session replay is off for this app's project.

### Working on the code
- All data access goes through `lib/data/index.js`. Every new function needs a version in both `mock.js` (demo mode) and `supabase.js`, plus a `route("name")` line in `index.js`.
- Demo is decided per request: `isDemo()` in `lib/demo.js` is true with no Supabase keys, or when the `/demo` cookie is set on the real site. Don't use `DEMO_ENV` for that check; it only covers the no-keys case. Anything with real-world side effects (emails, Supabase auth) must skip demo visitors.
- Prompt and platform lists: `lib/product-options.js`. Profile lists (roles, problem spaces, looking for): `lib/profile-options.js`. Pre-written first chat message: `lib/intro.js`.
- `featured` products sort first in every deck. Set it by hand in SQL; there's no UI. The PostHog example product is featured and owned by Britt's personal account.
- Images: public `product-images` storage bucket, uploaded only by server code with the secret key. No SVG. Profile photos live in the same bucket under `avatars/<user id>/`.

### PostHog (analytics, errors, logs)
Added by the PostHog wizard on 2026-11-04. Review and open items: `docs/posthog-wizard-review.md`.
- Browser setup: `instrumentation-client.js`. It throws in dev if either PostHog env var is missing. Britt chose this, so demo mode also needs the keys.
- Browser events are captured in `SwipeDeck.js`, `ProfileForm.js`, `ProductForm.js` and `login/page.js` (snake_case names). `BottomNav.js` calls `identify` (user ID + email) and `reset()` on sign-out.
- Server logs go to PostHog **Logs** (not analytics events) through OpenTelemetry: `instrumentation.js` and `lib/posthog-logs.js`, called from `app/actions.js`.
- Server errors go to PostHog **Error tracking** through `posthog-node`: `onRequestError` in `instrumentation.js`, plus `captureServerError` from `lib/posthog-server.js` for work in `after()` (emails). A Resend 429 is tagged `limit: "resend"`.
- Any new element that shows an email or chat message text needs the `ph-no-capture` class, so it stays out of session replays.

### GitHub
- "Continue with GitHub" (`/login`) and "Connect GitHub" (`/profile`, `/onboarding`, through Supabase `linkIdentity`) both land in `app/auth/callback/route.js`. It reads GitHub's one-time `provider_token` and saves public data to `github_profiles` (`lib/github.js`). It refreshes on every GitHub sign-in, and "Refresh from GitHub" on `/profile` re-reads public data by username without a token (60 requests an hour per IP).
- `github_profiles` stays separate from `profiles`: it holds what GitHub says, and the profile holds what the person wrote. The form fills empty fields from it and shows a suggestion under fields that differ. `featured_repos` on profiles holds the up to 3 repos they picked for their card (null = never picked, so the form pre-checks their top 3).
- Supabase setup: GitHub provider on (OAuth App callback `https://kwuossjlcjpzmhmlzhuu.supabase.co/auth/v1/callback`), and **Manual linking** on, or Connect GitHub fails.
- People who only sign in with GitHub can't disconnect it (Supabase won't remove someone's last sign-in method).

### Database migrations
- Migrations are applied **by hand** and aren't in Supabase's migration history. Never run `supabase db push`, because it would re-run the init migration.
- Apply with `supabase db query --linked --project-ref kwuossjlcjpzmhmlzhuu -f <file>`. Run this from a scratch folder that holds a copy of `supabase/migrations/`: inside the repo, the CLI fails with "failed to parse environment file: .env.local".
- Applied so far: `20261103000000_init`, `20261104000000_product_profiles`, `20261104010000_featured_products`, `20261105000000_builder_matching`, `20261105010000_profile_photos`, `20261106000000_chat`, `20261107000000_github_profiles`, `20261107010000_featured_repos`, `20261109000000_connect_codes`.

### Testing
- Don't run `pnpm install` while the dev server is running. Turbopack keeps the old module paths, and the page gets stuck in a full-reload loop. If that happens, Britt restarts the server with `rm -rf .next && pnpm dev`.
- Britt usually has a dev server running against real Supabase. Don't kill it. `next dev` refuses to start a second server in the same folder.
- To test in demo mode, rsync the repo (without `node_modules`, `.next`, `.env.local`, or `.git`) to a scratch folder, run `pnpm install --offline`, and start it on another port. Demo mode is on when `NEXT_PUBLIC_SUPABASE_URL` is unset. Keep the PostHog env vars set, or the app throws in dev.
- To drive a browser, use `playwright-core` with the installed Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).

### Open follow-ups
- Point `trymything.app` at Netlify, then set the Supabase Site URL and Redirect URLs to it.
- Branded Supabase email templates (they still use the plain defaults).
- Chat: block/report, live unread badge (it only updates on page loads), and a "Remove" for declined requests. Declined testers still count toward a product's `max_testers`.
- "Remove image" button, and deleting replaced images from storage (TODO in `app/actions.js`).
- GitHub: ranking the Builders deck on shared GitHub languages (skipped until there are enough builders). LinkedIn's API only returns name/email/photo, so it stays a plain URL field.
- Builder matches aren't shown on `/admin` yet.
- PostHog event for card page taps, to see whether testers flip through prompts.
- PostHog follow-ups (details in `docs/posthog-wizard-review.md`): log failures in `app/actions.js` and move the log flush into `after()`; add a server-side `user_signed_in` event with `is_new_user` in `app/auth/callback/route.js`; add IDs to the match events; add a reverse proxy for ad blockers.
- Terms or a privacy note saying Britt can see account emails (they're on PostHog person profiles).
