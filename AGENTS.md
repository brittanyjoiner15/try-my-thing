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
- **Email:** Supabase Auth sends magic links through Resend SMTP (`smtp.resend.com:465`, user `resend`). Resend is verified on the **root** domain, so the sender must be `@trymything.app` (not `@mail.trymything.app`). The app sends no other email.

### Working on the code
- All data access goes through `lib/data/index.js`. Every new function needs a version in both `mock.js` (demo mode) and `supabase.js`.
- Prompt and platform lists: `lib/product-options.js`. Profile lists (roles, problem spaces, looking for): `lib/profile-options.js`. Pre-written intro email: `lib/intro.js`.
- `featured` products sort first in every deck. Set it by hand in SQL; there's no UI. The PostHog example product is featured and owned by Britt's personal account.
- Images: public `product-images` storage bucket, uploaded only by server code with the secret key. No SVG. Profile photos live in the same bucket under `avatars/<user id>/`.

### Database migrations
- Migrations are applied **by hand** and aren't in Supabase's migration history. Never run `supabase db push`, because it would re-run the init migration.
- Apply with `supabase db query --linked --project-ref kwuossjlcjpzmhmlzhuu -f <file>`. Run this from a scratch folder that holds a copy of `supabase/migrations/`: inside the repo, the CLI fails with "failed to parse environment file: .env.local".
- Applied so far: `20261103000000_init`, `20261104000000_product_profiles`, `20261104010000_featured_products`, `20261105000000_builder_matching`, `20261105010000_profile_photos`.

### Testing
- Britt usually has a dev server running against real Supabase. Don't kill it. `next dev` refuses to start a second server in the same folder.
- To test in demo mode, rsync the repo (without `node_modules`, `.next`, `.env.local`, or `.git`) to a scratch folder, run `pnpm install --offline`, and start it on another port. Demo mode is on when `NEXT_PUBLIC_SUPABASE_URL` is unset.
- To drive a browser, use `playwright-core` with the installed Chrome (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).

### Open follow-ups
- Point `trymything.app` at Netlify, then set the Supabase Site URL and Redirect URLs to it.
- Branded Supabase email templates (they still use the plain defaults).
- Builder-side pre-written email to testers on the Matches page.
- "Remove image" button, and deleting replaced images from storage (TODO in `app/actions.js`).
- Connect GitHub (Supabase identity linking) to pre-fill stack, bio and location. LinkedIn's API only returns name/email/photo, so it stays a plain URL field.
- Builder matches aren't shown on `/admin` yet.
- The first person to swipe right on a builder isn't told when it becomes a match. They only see it on `/matches`.
- PostHog event for card page taps, to see whether testers flip through prompts.
