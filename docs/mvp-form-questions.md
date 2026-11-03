# Builder matchmaker (MVP)

Matches PostHog community builders who need real feedback with people who'll try their stuff.

**How it works:** anyone signs up through a Google Form → `/match-builders` reads the sign-up Sheet and suggests pairs → Britt approves → one Gmail draft per pair goes to both people → they arrange the rest themselves → one-week check-in.

No app yet. If people actually connect and give feedback, build more. If not, we learned it cheaply.

## Config
- Sign-up Sheet ID: `TODO` ← paste the Google Sheet ID here after creating the form (the long string in the Sheet URL)
- Match log: `matches.csv` (in this folder; the skill appends to it so nobody gets matched twice). It is gitignored because it holds member emails.

## Google Form questions

Form title: **Find users for what you're building (or try new stuff)**

Form description:
> Building something and need people who'll actually try it and tell you the truth? Or like trying new tools before everyone else? Sign up and we'll match you with someone from the PostHog community. We introduce you over email, and you take it from there.

### Section 1: everyone
1. **Name** (short answer, required)
2. **Email** (short answer, required, validate as email)
3. **Discord or posthog.com forum handle** (short answer, optional)
4. **I'm signing up as a…** (multiple choice, required; use "go to section based on answer")
   - Builder: I want people to try my product → Section 2
   - Tester: I want to try new products → Section 3
   - Both → Section 2, then Section 3

### Section 2: builders
5. **Product name and link** (short answer, required)
6. **What does it do, in one sentence?** (short answer, required)
7. **Who should try it?** (paragraph, required). Hint: "Role, stack, or problem they have. For example: backend engineers running Postgres who hate writing migrations."
8. **What do you want feedback on?** (checkboxes, required)
   - First-time setup / onboarding
   - A specific feature (tell us in the next question)
   - Pricing
   - Whether this is useful at all
   - Other
9. **Anything specific?** (short answer, optional)
10. **Where is it at?** (multiple choice, required): Pre-launch · Private beta · Public beta · Live
11. **What can testers get?** (checkboxes, required)
    - Early access
    - Free plan or extended trial
    - Discount
    - Nothing extra, just first look
12. **How many testers do you want?** (multiple choice): 1 · 2–3 · As many as you'll send me

### Section 3: testers
13. **What's your role?** (multiple choice, required): Engineer · Founder · PM · Designer · Other
14. **What's your stack / tools you use daily?** (short answer, required)
15. **What kind of products do you want to try?** (paragraph, required). Hint: "Dev tools, AI stuff, analytics, anything with a CLI…"
16. **How much time can you give one product?** (multiple choice, required): ~15 min to try it and send notes · ~30 min plus a short call
17. **Want a public shoutout in the PostHog community for helping?** (multiple choice): Yes · No thanks

### Last section: everyone
18. **Consent** (checkbox, required): "I'm OK with PostHog sharing my name, email, and the answers above with the person I'm matched with."

Settings: turn on "Collect email addresses" = off (we ask directly), link responses to a new Google Sheet.

## Launch steps
1. Create the form in Google Forms with the questions above (~15 min)
2. Responses tab → link to Sheets → copy the Sheet ID into **Config** above
3. Post the form link in Discord (and the forum) with a short "what this is" note
4. Once there are a few sign-ups, run `/match-builders`
