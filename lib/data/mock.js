// Fake in-memory data for demo mode. Same function signatures as ./supabase.js.
// Resets when the server restarts. Stored on globalThis so hot reload doesn't wipe it.
import { DEMO_USER } from "@/lib/demo";

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

function seed() {
  const person = (id, name, role, stack, extra = {}) => ({
    id,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    name,
    role,
    stack,
    interests: null,
    discord_handle: null,
    shoutout_ok: true,
    consent_at: daysAgo(10),
    ...extra,
  });

  const profiles = [
    person(DEMO_USER.id, "Demo You", "founder", "Next.js, Supabase, PostHog", { email: DEMO_USER.email, interests: "dev tools" }),
    person("p-maya", "Maya Okafor", "engineer", "Postgres, Go, Terraform"),
    person("p-leo", "Leo Brandt", "founder", "Rails, Hotwire, Stripe"),
    person("p-sana", "Sana Iqbal", "engineer", "React Native, Expo, Firebase"),
    person("p-tom", "Tom Reyes", "PM", "Linear, Notion, PostHog"),
    person("p-ines", "Inês Carvalho", "designer", "Figma, Framer"),
    person("p-kai", "Kai Nakamura", "engineer", "Python, FastAPI, Claude API", { discord_handle: "kai.dev" }),
    person("p-ada", "Ada Lindqvist", "engineer", "TypeScript, Cloudflare Workers"),
  ];

  const product = (id, owner_id, name, tagline, wants, feedback_on, stage, perk, days, extra = {}) => ({
    id,
    owner_id,
    name,
    url: `https://${name.toLowerCase().replace(/[^a-z]/g, "")}.example.com`,
    tagline,
    wants,
    feedback_on,
    stage,
    perk,
    max_testers: 3,
    hidden: false,
    created_at: daysAgo(days),
    ...extra,
  });

  const products = [
    product("pr-migrately", "p-maya", "Migrately", "Postgres migrations that write and test themselves.", "backend engineers running Postgres in prod", "first-time setup", "private beta", "early access", 1),
    product("pr-invoicely", "p-leo", "Invoicely", "Stripe invoices your customers actually understand.", "founders billing B2B customers", "whether this is useful at all", "public beta", "a free plan or extended trial", 2),
    product("pr-shipcheck", "p-sana", "ShipCheck", "Catches App Store rejection reasons before you submit.", "mobile devs who've been rejected before", "the report format", "pre-launch", "early access", 3),
    product("pr-standup", "p-tom", "Standup Bot", "Writes your standup from yesterday's commits and tickets.", "engineers who hate standups", "how accurate the summaries are", "live", "a discount", 4),
    product("pr-tokens", "p-ines", "TokenSync", "Keeps Figma variables and your CSS in sync, both ways.", "design engineers with a design system", "onboarding", "private beta", "a first look before everyone else", 5),
    product("pr-evalkit", "p-kai", "EvalKit", "Unit tests for your LLM prompts, in plain YAML.", "engineers shipping LLM features", "the CLI", "public beta", "early access", 6, { max_testers: 10 }),
    product("pr-edgelog", "p-ada", "EdgeLog", "Logs for Cloudflare Workers you can actually search.", "anyone running Workers in prod", "pricing", "live", "a free plan or extended trial", 7),
    // The demo user's own product, so "My products" and "Matches" have something to show.
    product("pr-hogchat", DEMO_USER.id, "HogChat", "Ask your product analytics questions in Slack.", "PMs and founders who live in Slack", "whether the answers are right", "private beta", "early access", 8),
  ];

  const swipe = (tester_id, product_id, direction, days) => ({ tester_id, product_id, direction, created_at: daysAgo(days) });
  const swipes = [
    swipe("p-maya", "pr-hogchat", "right", 2),
    swipe("p-tom", "pr-hogchat", "right", 1),
    swipe("p-kai", "pr-hogchat", "left", 1),
    swipe(DEMO_USER.id, "pr-edgelog", "right", 3), // demo user already tried one
    swipe("p-kai", "pr-migrately", "right", 1),
    swipe("p-ada", "pr-evalkit", "right", 2),
    swipe("p-leo", "pr-standup", "left", 3),
  ];

  return { profiles, products, swipes };
}

const store = () => (globalThis.__demoStore ??= seed());
const profileById = (id) => store().profiles.find((p) => p.id === id);
const swipesFor = (productId) => store().swipes.filter((s) => s.product_id === productId);
const rightsFor = (productId) => swipesFor(productId).filter((s) => s.direction === "right");
const newest = (a, b) => b.created_at.localeCompare(a.created_at);

export async function getProfile(userId) {
  return profileById(userId) ?? null;
}

export async function saveProfile(profile) {
  const s = store();
  s.profiles = [...s.profiles.filter((p) => p.id !== profile.id), profile];
}

export async function getDeck(userId) {
  const seen = new Set(store().swipes.filter((s) => s.tester_id === userId).map((s) => s.product_id));
  return store()
    .products.filter((p) => !p.hidden && p.owner_id !== userId && !seen.has(p.id) && rightsFor(p.id).length < p.max_testers)
    .sort(newest)
    .map(({ max_testers, hidden, owner_id, created_at, ...p }) => ({ ...p, builder: profileById(owner_id).name.split(" ")[0] }));
}

export async function getMyProducts(userId) {
  return store()
    .products.filter((p) => p.owner_id === userId)
    .sort(newest)
    .map((p) => ({ ...p, matches: rightsFor(p.id).length, views: swipesFor(p.id).length }));
}

export async function createProduct(product) {
  store().products.push({ id: `pr-${crypto.randomUUID()}`, hidden: false, created_at: new Date().toISOString(), ...product });
}

export async function setProductHidden(productId, hidden, ownerId = null) {
  const p = store().products.find((p) => p.id === productId && (!ownerId || p.owner_id === ownerId));
  if (p) p.hidden = hidden;
}

export async function countRecentRightSwipes(userId, sinceIso) {
  return store().swipes.filter((s) => s.tester_id === userId && s.direction === "right" && s.created_at >= sinceIso).length;
}

export async function getProductWithOwner(productId) {
  const p = store().products.find((p) => p.id === productId);
  return p ? { ...p, owner: profileById(p.owner_id) } : null;
}

export async function insertSwipe(swipe) {
  const s = store();
  if (s.swipes.some((x) => x.tester_id === swipe.tester_id && x.product_id === swipe.product_id)) return { duplicate: true };
  s.swipes.push({ ...swipe, created_at: new Date().toISOString() });
  return {};
}

export async function getMatches(userId) {
  const { swipes, products } = store();
  const productById = (id) => products.find((p) => p.id === id);
  const rights = swipes.filter((s) => s.direction === "right").sort(newest);

  return {
    tried: rights
      .filter((s) => s.tester_id === userId)
      .map((s) => {
        const product = productById(s.product_id);
        return { created_at: s.created_at, product, builder: profileById(product.owner_id) };
      }),
    testers: rights
      .filter((s) => productById(s.product_id).owner_id === userId)
      .map((s) => ({ created_at: s.created_at, product: productById(s.product_id), tester: profileById(s.tester_id) })),
  };
}

export async function getAdminData() {
  const { profiles, products, swipes } = store();
  return {
    people: profiles.length,
    matches: swipes
      .filter((s) => s.direction === "right")
      .sort(newest)
      .map((s) => {
        const product = products.find((p) => p.id === s.product_id);
        return { created_at: s.created_at, product, builder: profileById(product.owner_id), tester: profileById(s.tester_id) };
      }),
    products: [...products]
      .sort(newest)
      .map((p) => ({ ...p, owner: profileById(p.owner_id), matches: rightsFor(p.id).length, views: swipesFor(p.id).length })),
  };
}
