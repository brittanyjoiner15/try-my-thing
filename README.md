# try my thing

Tinder for trying software. Builders post what they're making, testers swipe through it, and a right swipe sends the builder a request. When the builder accepts, the two of them chat in the app. Emails are never shared between people; the app emails each side about matches and new messages (`lib/match-emails.js`).

**Stack:** Next.js 16 · Supabase (magic-link + GitHub login, Postgres) · Vercel · PostHog (analytics)

## How it works
- `/login`: Continue with GitHub, or an email magic link. Magic-link users can connect GitHub later from `/profile`. GitHub data (`github_profiles`, filled in `/auth/callback` by `lib/github.js`) fills empty profile fields, shows suggestions for the rest, and adds languages + top repos to builder cards (no links until a match).
- `/onboarding`: name, role, stack, builder fields, and a notice that name and profile are shared with matches (`consent_at` records the first save).
- `/welcome`: shown once after onboarding. Three steps on how the app works, then "Post my thing" or "Just swipe for now".
- `/products`: builders post a product and see how many testers matched.
- `/products/[id]`: the product's Hinge-style profile (logo, phone screenshot, platforms, up to 3 prompt answers). The swipe card shows the same thing. `/products/[id]/edit` lets the owner change it. Prompt and platform lists live in `lib/product-options.js`.
- `/swipe`: testers swipe. A Products / Builders toggle at the top switches decks (see below). A right swipe saves the match and opens a pending chat that the builder has to accept. Products drop out of the deck once they hit their tester limit. Each tester gets max 3 right swipes per week.
- `/matches`: every match is a chat. Builders accept or pass on testers; testers see which requests are waiting; builder matches open right away.
- `/matches/[chatId]`: the chat. It checks for new messages every 5 seconds (no realtime, see the privacy model). The first message is pre-written from `lib/intro.js`. Max 2,000 characters per message and 30 messages per 10 minutes. The other person gets one email per unread stretch, not one per message.
- `/swipe?mode=builders`: builders who opted in swipe on each other. Ranked by distance, shared problem spaces, shared stack, and what they're looking for (`lib/builder-match.js`). Mutual right swipe = match, and only then do a chat and GitHub/LinkedIn links open up. Both builders get an email. No weekly limit.
- `/profile`: edit your profile, including the builder fields and the "Show me to other builders" opt-in. City is geocoded with OpenStreetMap Nominatim (`lib/geocode.js`) and stored rounded to ~10 km. Sign out lives here.
- `/c/[code]`: someone's in-person link, from the QR code on their `/profile`. Tapping Connect opens a chat right away (same as a builder match) and emails the owner. Signed-out visitors sign up and land back here (`tmt_connect` cookie). "Reset link" on `/profile` makes a new code so the old link stops working. Logic in `lib/connect.js` and `connectInPerson` in `app/actions.js`.
- `/demo`: try the app on fake data without an account (see Demo mode).
- `/admin`: all matches, and hide/unhide products. Only emails in `ADMIN_EMAILS` can open it.

**Privacy model:** RLS is on with no policies, so the browser can't read any table. Server code checks who's logged in, then reads with the secret key. Emails are only shown to admins. Matches talk through `chats` and `messages`, which the browser reads through server actions, so realtime would need RLS policies and a browser Supabase client.

## Demo mode
Two ways in, both on the fake data in `lib/data/mock.js`, signed in as "Demo You":
- **`/demo` on the real site:** for showing the app to people without an account. It sets a `tmt_demo` cookie, gives that browser its own copy of the fake data, and opens `/swipe`. An orange banner has "Exit demo". Nothing reaches Supabase, no emails are sent, `/admin` is hidden, and PostHog events carry `is_demo: true` (visitors aren't identified). The data lives in server memory, so on Netlify it resets whenever a function instance restarts. Linked from the landing and login pages.
- **No setup (local):** `pnpm install && pnpm dev` with no `.env.local`. The whole server is one shared demo, and Demo You is also an admin. Emails print to the console.

In demo chats the other person answers a few seconds after you send a message (canned replies in `mock.js`). Product logos and screenshots are SVGs in `public/demo/`, drawn by `node scripts/generate-demo-images.mjs`.

All data access goes through `lib/data/index.js`, which picks `mock.js` or `supabase.js`. Add a function to both when you need new data.

## Run it with Supabase
1. Create a Supabase project at supabase.com.
2. In Supabase, open **SQL Editor** and run each file in `supabase/migrations/`, oldest first. The second one adds the `product-images` storage bucket.
3. In Supabase, go to **Authentication → URL Configuration** and add `http://localhost:3000/auth/callback` to Redirect URLs.
4. For GitHub login: create a GitHub OAuth App (callback `https://<project-ref>.supabase.co/auth/v1/callback`), paste its Client ID and secret into **Authentication → Sign In / Providers → GitHub**, and turn on **Manual linking** in **Authentication → Sign In / Providers**.
5. `cp .env.example .env.local` and fill it in.
6. `pnpm install && pnpm dev`, then open http://localhost:3000.

## Test it end to end (solo)
You need two logins, one builder and one tester. Gmail `+` addresses both land in your inbox:
1. Sign in as `you+builder@…`, finish onboarding, and post a product.
2. In a private window, sign in as `you+tester@…`, finish onboarding, and swipe right. You should see "Request sent".
3. Back as the builder, open `/matches` and accept the tester.
4. As the tester, open the chat from `/matches`, send the pre-written message, and check it shows up for the builder within 5 seconds.
5. Open `/admin` while signed in as an `ADMIN_EMAILS` address and confirm the match shows.

## Deploy
1. Push to GitHub, then import the repo in Vercel.
2. Add every `.env.local` value in Vercel → Settings → Environment Variables.
3. Add `https://<your-vercel-url>/auth/callback` to Supabase Redirect URLs, and set Supabase Site URL to the Vercel URL.

## Older version
`docs/mvp-form-questions.md` is the original Google Form + Claude skill version, kept for reference.
