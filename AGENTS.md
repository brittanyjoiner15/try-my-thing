<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes (try my thing)

Tinder for trying software. Read `README.md` first for routes and the privacy model.

### Where things run
- **Hosting:** Netlify (not Vercel, despite the README's Deploy section). Netlify caps function requests at 6MB, which is why `serverActions.bodySizeLimit` is 5MB.
- **Domain:** `trymything.app`, registered and DNS on Cloudflare. Not wired to Netlify or set as the Supabase Site URL yet.
- **Supabase:** project `try-my-thing`, ref `kwuossjlcjpzmhmlzhuu`.
- **Email:** Supabase Auth sends magic links through Resend SMTP (match emails moved to PostHog, see below) (`smtp.resend.com:465`, user `resend`). Resend is verified on the **root** domain, so the sender must be `@trymything.app` (not `@mail.trymything.app`).
- **Match emails:** `lib/match-emails.js` emails the builder when a tester asks to try their product, both builders on a builder match, the tester when a builder accepts, and the other person on a new chat message, as **PostHog transactional emails** sent from `after()` so swipes don't wait on it. Copy and design live in PostHog (Workflows → Transactional, 5 templates in use, tagged `try-my-thing`; "Product request sent (to tester)" is unused, sender `hello@mail.trymything.app`); the code passes a template ID and `{{ variables.* }}`, so renaming a variable means changing both. Edit wording in PostHog and publish, no deploy needed. Needs `POSTHOG_SECRET_KEY` (project secret API key, Transactional email: Write). Without it nothing is sent and the server logs a warning. Open/click events are on and land on the recipient's person. The new-message template has Protect sensitive data on. No email has a Reply-To and none shows the other person's address: people never see each other's emails.
- **PostHog:** US cloud. Env vars are `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`, set in `.env.local` and Netlify (renamed from `NEXT_PUBLIC_POSTHOG_KEY` on 2026-11-04). Session replay is off for this app's project.

### Working on the code
- All data access goes through `lib/data/index.js`. New functions go in `supabase.js`, plus a name in the export list in `index.js`.
- There is no demo mode (removed 2026-11-19). The app always runs on real Supabase data; old `/demo` links redirect to `/`.
- Prompt and platform lists: `lib/product-options.js`. Profile lists (roles, problem spaces, looking for): `lib/profile-options.js`. Pre-written first chat message: `lib/intro.js`.
- Claim links (`lib/claim.js`): admins prefill a product at `/admin/claim/new` and send the builder `/claim/<code>`. Until it's claimed the product has `owner_id` null and stays out of every deck, so code that reads `product.owner` must handle unclaimed products. Whoever taps Claim first owns it. Funnel events: `claim_link_viewed` → `product_claimed`.
- `featured` products sort first in every deck. Set it by hand in SQL; there's no UI. The PostHog example product is featured and owned by Britt's personal account.
- Images: public `product-images` storage bucket, uploaded only by server code with the secret key. No SVG. Profile photos live in the same bucket under `avatars/<user id>/`.

### PostHog (analytics, errors, logs)
Added by the PostHog wizard on 2026-11-04. Review and open items: `docs/posthog-wizard-review.md`.
- Browser setup: `instrumentation-client.js`. It throws in dev if either PostHog env var is missing. Britt chose this.
- Browser events are captured in `SwipeDeck.js`, `ProfileForm.js`, `ProductForm.js` and `login/page.js` (snake_case names). `BottomNav.js` calls `identify` (user ID + email) and `reset()` on sign-out.
- Signup attribution: `saveProfile` fires a server-side `user_signed_up` on the first profile save, with `signup_source` (`connect_link` / `claim_link` / `direct`) plus `referrer_id`/`referrer_name` or `product_id`/`product_name`, also `$set_once` on the person. Funnels: `connect_link_viewed` → `user_signed_up` → `in_person_connect`, and `claim_link_viewed` → `user_signed_up` → `product_claimed`.
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
- Apply with `supabase db query --remote=kwuossjlcjpzmhmlzhuu -f <file>` (CLI v3+; `--linked --project-ref` is deprecated). Agents must ask Britt before adding `--yes`, which the CLI requires for writes; read-only checks use `--read-only`. On the devbox the CLI token lives in `~/.supabase/access-token` (`supabase login` needs a TTY). Run this from a scratch folder that holds a copy of `supabase/migrations/`: inside the repo, the CLI fails with "failed to parse environment file: .env.local".
- Applied so far: `20261103000000_init`, `20261104000000_product_profiles`, `20261104010000_featured_products`, `20261105000000_builder_matching`, `20261105010000_profile_photos`, `20261106000000_chat`, `20261107000000_github_profiles`, `20261107010000_featured_repos`, `20261109000000_connect_codes`, `20261118000000_claim_links`, `20261118000000_one_chat_per_pair`.

### Testing
- Don't run `pnpm install` while the dev server is running. Turbopack keeps the old module paths, and the page gets stuck in a full-reload loop. If that happens, Britt restarts the server with `rm -rf .next && pnpm dev`.
- Britt usually has a dev server running against real Supabase. Don't kill it. `next dev` refuses to start a second server in the same folder.
- To drive a browser, use `playwright-core` with the installed Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).

### Open follow-ups
- Point `trymything.app` at Netlify, then set the Supabase Site URL and Redirect URLs to it.
- Branded Supabase email templates (they still use the plain defaults).
- Chat: block/report, live unread badge (it only updates on page loads), and a "Remove" for declined requests.
- "Remove image" button, and deleting replaced images from storage (TODO in `app/actions.js`).
- GitHub: ranking builder cards on shared GitHub languages (skipped until there are enough builders). LinkedIn's API only returns name/email/photo, so it stays a plain URL field.
- Builder matches aren't shown on `/admin` yet.
- PostHog event for card page taps, to see whether testers flip through prompts.
- PostHog follow-ups (details in `docs/posthog-wizard-review.md`): log failures in `app/actions.js` and move the log flush into `after()`; add a server-side `user_signed_in` event with `is_new_user` in `app/auth/callback/route.js`; add IDs to the match events; add a reverse proxy for ad blockers.
- Terms or a privacy note saying Britt can see account emails (they're on PostHog person profiles).
