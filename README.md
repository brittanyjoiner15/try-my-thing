# try my thing

Tinder for trying software, from the PostHog community. Builders post what they're making, testers swipe through it, and a right swipe shows the tester the builder's email (with a pre-written intro), and shows the builder the tester's email on their Matches page. Both sides also get an email when they match (`lib/match-emails.js`).

**Stack:** Next.js 16 · Supabase (magic-link login + Postgres) · Vercel · PostHog (analytics)

## How it works
- `/login`: email magic link.
- `/onboarding`: name, role, stack, builder fields, and a notice that name, email, and profile are shared with matches (`consent_at` records the first save).
- `/products`: builders post a product and see how many testers matched.
- `/products/[id]`: the product's Hinge-style profile (logo, phone screenshot, platforms, up to 3 prompt answers). The swipe card shows the same thing. `/products/[id]/edit` lets the owner change it. Prompt and platform lists live in `lib/product-options.js`.
- `/swipe`: testers swipe. A Products / Builders toggle at the top switches decks (see below). A right swipe saves the match and shows the builder's email plus a pre-written intro email. Products drop out of the deck once they hit their tester limit. Each tester gets max 3 right swipes per week.
- `/matches`: builders see who wants to try their stuff; testers see what they matched with. Both with emails.
- `/swipe?mode=builders`: builders who opted in swipe on each other. Ranked by distance, shared problem spaces, shared stack, and what they're looking for (`lib/builder-match.js`). Mutual right swipe = match, and only then are emails and GitHub/LinkedIn links shared. Both builders get an email. No weekly limit.
- `/profile`: edit your profile, including the builder fields and the "Show me to other builders" opt-in. City is geocoded with OpenStreetMap Nominatim (`lib/geocode.js`) and stored rounded to ~10 km. Sign out lives here.
- `/admin`: all matches, and hide/unhide products. Only emails in `ADMIN_EMAILS` can open it.

**Privacy model:** RLS is on with no policies, so the browser can't read any table. Server code checks who's logged in, then reads with the secret key. Emails are only shown to the two people in a match (and admins).

## Demo mode (no setup)
`pnpm install && pnpm dev` with no `.env.local`. The app runs on fake data in `lib/data/mock.js`, signed in as "Demo You" (who is also an admin). Swipes and new products are kept in memory until the server restarts.

All data access goes through `lib/data/index.js`, which picks `mock.js` or `supabase.js`. Add a function to both when you need new data.

## Run it with Supabase
1. Create a Supabase project at supabase.com.
2. In Supabase, open **SQL Editor** and run each file in `supabase/migrations/`, oldest first. The second one adds the `product-images` storage bucket.
3. In Supabase, go to **Authentication → URL Configuration** and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. `cp .env.example .env.local` and fill it in.
5. `pnpm install && pnpm dev`, then open http://localhost:3000.

## Test it end to end (solo)
You need two logins, one builder and one tester. Gmail `+` addresses both land in your inbox:
1. Sign in as `you+builder@…`, finish onboarding, and post a product.
2. In a private window, sign in as `you+tester@…`, finish onboarding, and swipe right. You should see the builder's email.
3. Back as the builder, open `/matches`. The tester should be listed.
4. Open `/admin` while signed in as an `ADMIN_EMAILS` address and confirm the match shows.

## Deploy
1. Push to GitHub, then import the repo in Vercel.
2. Add every `.env.local` value in Vercel → Settings → Environment Variables.
3. Add `https://<your-vercel-url>/auth/callback` to Supabase Redirect URLs, and set Supabase Site URL to the Vercel URL.

## Older version
`docs/mvp-form-questions.md` is the original Google Form + Claude skill version, kept for reference.
