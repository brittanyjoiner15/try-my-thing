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
    open_to_builders: true,
    building: null,
    topics: [],
    looking_for: [],
    location: null,
    lat: null,
    lng: null,
    github_url: null,
    linkedin_url: null,
    avatar_url: null,
    ...extra,
  });

  // Builder fields so the Builders deck has something to rank. Coordinates are rounded like real ones.
  const at = (location, lat, lng) => ({ location, lat, lng });
  const profiles = [
    person(DEMO_USER.id, "Demo You", "founder", "Next.js, Supabase, PostHog", {
      email: DEMO_USER.email,
      interests: "dev tools",
      building: "HogChat: product analytics answers in Slack.",
      topics: ["Analytics & data", "LLM apps", "Dev tools"],
      looking_for: ["Feedback swaps", "Coffee or co-working IRL"],
      ...at("Austin, United States", 30.3, -97.7),
    }),
    person("p-maya", "Maya Okafor", "engineer", "Postgres, Go, Terraform", {
      building: "Self-testing Postgres migrations.",
      topics: ["Dev tools", "Infra & DevOps"],
      looking_for: ["Feedback swaps", "Talking shop"],
      github_url: "https://github.com/example-maya",
      ...at("Austin, United States", 30.3, -97.8),
    }),
    person("p-leo", "Leo Brandt", "founder", "Rails, Hotwire, Stripe", {
      building: "Invoices B2B customers can read.",
      topics: ["Fintech & payments", "B2B SaaS"],
      looking_for: ["Co-founder", "Accountability buddy"],
      ...at("Berlin, Germany", 52.5, 13.4),
    }),
    person("p-sana", "Sana Iqbal", "engineer", "React Native, Expo, Firebase", {
      building: "A pre-flight check for App Store submissions.",
      topics: ["Mobile", "Dev tools"],
      looking_for: ["Feedback swaps"],
      ...at("San Antonio, United States", 29.4, -98.5),
    }),
    person("p-tom", "Tom Reyes", "PM", "Linear, Notion, PostHog", {
      building: "Standups written from commits.",
      topics: ["Productivity", "LLM apps"],
      looking_for: ["Talking shop", "Coffee or co-working IRL"],
      linkedin_url: "https://www.linkedin.com/in/example-tom",
      ...at("Houston, United States", 29.8, -95.4),
    }),
    person("p-ines", "Inês Carvalho", "designer", "Figma, Framer", { open_to_builders: false }),
    person("p-kai", "Kai Nakamura", "engineer", "Python, FastAPI, Claude API", {
      discord_handle: "kai.dev",
      building: "Unit tests for LLM prompts.",
      topics: ["LLM apps", "AI agents", "Dev tools"],
      looking_for: ["Feedback swaps", "Collaborators"],
      ...at("Tokyo, Japan", 35.7, 139.7),
    }),
    person("p-ada", "Ada Lindqvist", "engineer", "TypeScript, Cloudflare Workers", {
      building: "Searchable logs for Workers.",
      topics: ["Infra & DevOps", "Analytics & data"],
      looking_for: ["Talking shop"],
      ...at("Stockholm, Sweden", 59.3, 18.1),
    }),
  ];

  const qa = (...pairs) => pairs.map(([prompt, answer]) => ({ prompt, answer }));
  // Platforms + Hinge-style prompt answers, keyed by product id.
  const profileExtras = {
    "pr-migrately": {
      platforms: ["CLI", "API / SDK"],
      prompts: qa(
        ["My most controversial feature is…", "I refuse to run a migration on Friday after 4pm. You can override it. You shouldn't."],
        ["Don't swipe right if you…", "think ORMs should own your schema."],
        ["The bug I've learned to live with…", "Table names with emoji. Please don't."],
      ),
    },
    "pr-invoicely": {
      prompts: qa(
        ["I was built because…", "A customer paid an invoice twice because line 4 said 'misc adj.'"],
        ["Green flag: you'll love me if…", "you've ever answered 'what is this charge?' over email."],
      ),
    },
    "pr-shipcheck": {
      platforms: ["iPhone", "Android", "Mac app"],
      prompts: qa(
        ["I'm weirdly good at…", "Guideline 4.3. Ask me about guideline 4.3."],
        ["Typical Sunday for me:", "Reading App Review rejection threads so you don't have to."],
        ["First date idea: try this flow…", "Drop in your .ipa, get a report in 2 minutes."],
      ),
    },
    "pr-standup": {
      platforms: ["Slack / Discord bot"],
      prompts: qa(["My stack's love language is…", "GitHub webhooks and Linear's API, at 8:59am."]),
    },
    "pr-tokens": { platforms: ["Web app", "VS Code extension"] },
    "pr-evalkit": {
      platforms: ["CLI", "MCP server"],
      prompts: qa(
        ["2 truths and a lie about my roadmap", "Snapshot diffs. Cost tracking. A YAML-free mode."],
        ["Looking for someone who…", "has shipped a prompt change that broke prod."],
      ),
    },
    "pr-edgelog": {
      platforms: ["Web app", "CLI"],
      prompts: qa(["My changelog says I'm…", "fast now. Like, actually fast."]),
    },
    "pr-hogchat": {
      platforms: ["Slack / Discord bot", "MCP server"],
      prompts: qa(["Don't swipe right if you…", "like building dashboards by hand. (No judgment. Some judgment.)"]),
    },
  };

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
    logo_url: null,
    screenshot_url: null,
    platforms: ["Web app"],
    prompts: [],
    hidden: false,
    created_at: daysAgo(days),
    ...profileExtras[id],
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

  // Builder ↔ builder likes. Maya and Tom already like Demo You, so swiping right on them makes a match.
  // Ada and Demo You already matched, so the Matches page has one to show.
  const like = (from_id, to_id, direction, days) => ({ from_id, to_id, direction, created_at: daysAgo(days) });
  const builderLikes = [
    like("p-maya", DEMO_USER.id, "right", 1),
    like("p-tom", DEMO_USER.id, "right", 2),
    like("p-ada", DEMO_USER.id, "right", 4),
    like(DEMO_USER.id, "p-ada", "right", 3),
  ];

  return { profiles, products, swipes, builderLikes };
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
    .sort((a, b) => Boolean(b.featured) - Boolean(a.featured) || newest(a, b))
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

export async function updateProduct(productId, ownerId, fields) {
  const p = store().products.find((p) => p.id === productId && p.owner_id === ownerId);
  if (p) Object.assign(p, fields);
}

// Demo mode has no storage, so keep the image in memory as a data URL.
export async function uploadImage(_path, file) {
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return `data:${file.type};base64,${base64}`;
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

// --- Builder ↔ builder matching ---

export async function getBuilderCandidates(userId) {
  const seen = new Set(store().builderLikes.filter((l) => l.from_id === userId).map((l) => l.to_id));
  return store().profiles.filter((p) => p.open_to_builders && p.id !== userId && !seen.has(p.id));
}

export async function insertBuilderLike(like) {
  const s = store();
  if (s.builderLikes.some((l) => l.from_id === like.from_id && l.to_id === like.to_id)) return { duplicate: true };
  s.builderLikes.push({ ...like, created_at: new Date().toISOString() });
  return {};
}

export async function hasRightLike(fromId, toId) {
  return store().builderLikes.some((l) => l.from_id === fromId && l.to_id === toId && l.direction === "right");
}

export async function getBuilderMatches(userId) {
  const rights = store().builderLikes.filter((l) => l.direction === "right");
  return rights
    .filter((l) => l.from_id === userId)
    .map((mine) => [mine, rights.find((l) => l.from_id === mine.to_id && l.to_id === userId)])
    .filter(([, theirs]) => theirs)
    .map(([mine, theirs]) => ({ created_at: [mine.created_at, theirs.created_at].sort()[1], builder: profileById(mine.to_id) }))
    .sort(newest);
}
