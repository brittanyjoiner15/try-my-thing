// Fake in-memory data for demo mode. Same function signatures as ./supabase.js.
// Each demo visitor gets their own copy (a sandbox), picked by lib/data/index.js through inSandbox().
// Resets when the server restarts (on Netlify, whenever a function instance is recycled).
import { AsyncLocalStorage } from "node:async_hooks";
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
    featured_repos: null,
    connect_code: id.replace(/^p-/, "").replace(/-/g, ""), // /c/leo is Leo's in-person link in demo mode, /c/demoyou is yours
    ...extra,
  });

  // Builder fields so builder cards have something to rank. Coordinates are rounded like real ones.
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
      featured_repos: ["migrately", "pg-lint-rules"],
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
      featured_repos: ["evalkit", "prompt-diff"],
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
    // Drawn by scripts/generate-demo-images.mjs.
    logo_url: `/demo/${id}-logo.svg`,
    screenshot_url: `/demo/${id}-screenshot.svg`,
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

  // One chat per pair (user_a < user_b, like the real table). Product requests live inside the pair's chat.
  // Maya's request for HogChat waits on Demo You. Ada and Demo You have one chat for both their builder match
  // and Demo You's EdgeLog request.
  const chat = (id, x, y, status, days) => {
    const [user_a, user_b] = [x, y].sort();
    return {
      id, user_a, user_b, status, created_at: daysAgo(days),
      last_message_at: null, last_sender_id: null, a_read_at: null, b_read_at: null, a_notified_at: null, b_notified_at: null,
    };
  };
  const chats = [
    chat("c-maya-demo", "p-maya", DEMO_USER.id, "pending", 2),
    chat("c-tom-demo", "p-tom", DEMO_USER.id, "open", 1),
    chat("c-demo-ada", DEMO_USER.id, "p-ada", "open", 4),
    chat("c-kai-maya", "p-kai", "p-maya", "open", 1),
    chat("c-ada-kai", "p-ada", "p-kai", "open", 2),
  ];
  const request = (id, chat_id, tester_id, product_id, status, days) => ({ id, chat_id, tester_id, product_id, status, created_at: daysAgo(days) });
  const requests = [
    request("r-maya-hogchat", "c-maya-demo", "p-maya", "pr-hogchat", "pending", 2),
    request("r-tom-hogchat", "c-tom-demo", "p-tom", "pr-hogchat", "accepted", 1),
    request("r-demo-edgelog", "c-demo-ada", DEMO_USER.id, "pr-edgelog", "accepted", 3),
    request("r-kai-migrately", "c-kai-maya", "p-kai", "pr-migrately", "accepted", 1),
    request("r-ada-evalkit", "c-ada-kai", "p-ada", "pr-evalkit", "accepted", 2),
  ];
  const message = (chat_id, sender_id, body, hours, extra = {}) => ({
    id: crypto.randomUUID(), chat_id, sender_id, body, kind: "text", request_id: null,
    created_at: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(), ...extra,
  });
  const productName = (id) => products.find((p) => p.id === id).name;
  const messages = [
    // The "wants to try" line for each request, at the time it was made.
    ...requests.map((r) =>
      message(r.chat_id, r.tester_id, `wants to try ${productName(r.product_id)}`, (Date.now() - new Date(r.created_at)) / 36e5, { kind: "request", request_id: r.id }),
    ),
    message("c-tom-demo", "p-tom", "Hey! Swiped right on HogChat. I live in Slack, so this is very my thing. How do I get in?", 20),
    message("c-demo-ada", "p-ada", "Hi! Saw you're building HogChat. Want to swap feedback? I'll trade you EdgeLog access.", 30),
    message("c-demo-ada", DEMO_USER.id, "Deal. Sending you an invite now.", 29),
    message("c-demo-ada", "p-ada", "Got it, thanks! First impressions coming tomorrow.", 2),
  ];
  for (const m of messages.filter((m) => m.kind === "text")) {
    const c = chats.find((c) => c.id === m.chat_id);
    if (!c.last_message_at || m.created_at > c.last_message_at) Object.assign(c, { last_message_at: m.created_at, last_sender_id: m.sender_id });
  }

  // replies: fake answers waiting to "arrive" (see queueReply).
  // A couple of builders "connected GitHub", so cards show the languages + repos page.
  const ghRepo = (name, description, language, stars) => ({ name, description, language, stars });
  const githubProfiles = [
    {
      id: "p-maya",
      username: "example-maya",
      name: "Maya Okafor",
      bio: "Databases, mostly.",
      location: "Austin, TX",
      avatar_url: null,
      languages: ["Go", "PLpgSQL", "HCL"],
      repos: [
        ghRepo("migrately", "Self-testing Postgres migrations.", "Go", 412),
        ghRepo("pg-lint-rules", "Opinionated lint rules for schema changes.", "Go", 58),
        ghRepo("dotfiles", null, "Shell", 3),
      ],
      fetched_at: daysAgo(2),
    },
    {
      id: "p-kai",
      username: "example-kai",
      name: "Kai Nakamura",
      bio: "Making LLM apps boring (in a good way).",
      location: "Tokyo",
      avatar_url: null,
      languages: ["Python", "TypeScript"],
      repos: [ghRepo("evalkit", "Unit tests for LLM prompts.", "Python", 1290), ghRepo("prompt-diff", "Diff two prompts' outputs side by side.", "TypeScript", 77)],
      fetched_at: daysAgo(5),
    },
  ];

  return { profiles, products, swipes, builderLikes, chats, requests, messages, githubProfiles, replies: [] };
}

// So demo chats feel alive: when Demo You sends a message, the other person answers a few seconds later.
// Replies wait in s.replies and land on the first request after they're due (the chat polls every 5s),
// which works on serverless where a setTimeout could be frozen or lost.
const FAKE_REPLIES = [
  "Ha, love that. Trying it tonight, I'll send notes after.",
  "Good question. Honestly, onboarding is where I'd start. Took me a sec to find the main thing.",
  "Just signed up! First impression: fast. The empty state could use a nudge though.",
  "This is exactly the kind of feedback I was hoping for, thank you 🙌",
  "Want to hop on a quick call this week? Easier to show than type.",
  "Noted! Shipping a fix for that tomorrow. I'll ping you when it's live.",
];

function queueReply(s, chat) {
  const replierId = chat.user_a === DEMO_USER.id ? chat.user_b : chat.user_a;
  const sent = s.messages.filter((m) => m.chat_id === chat.id && m.sender_id === DEMO_USER.id && m.kind === "text").length;
  const delayMs = 3000 + Math.random() * 3000;
  s.replies.push({ due: Date.now() + delayMs, chat_id: chat.id, sender_id: replierId, body: FAKE_REPLIES[(sent - 1) % FAKE_REPLIES.length] });
}

function deliverDueReplies(s) {
  const now = Date.now();
  for (const r of s.replies.filter((r) => r.due <= now)) {
    const row = { id: crypto.randomUUID(), chat_id: r.chat_id, sender_id: r.sender_id, body: r.body, kind: "text", request_id: null, created_at: new Date(r.due).toISOString() };
    s.messages.push(row);
    Object.assign(s.chats.find((c) => c.id === r.chat_id), { last_message_at: row.created_at, last_sender_id: row.sender_id });
  }
  s.replies = s.replies.filter((r) => r.due > now);
}

// Stored on globalThis so hot reload doesn't wipe it. Capped so bots hitting /demo can't fill the memory:
// past the cap, the least recently used sandbox is dropped (that visitor just gets fresh data).
const MAX_SANDBOXES = 200;
const sandboxes = (globalThis.__demoSandboxes ??= new Map());
const current = new AsyncLocalStorage();

export function inSandbox(id, fn) {
  let data = sandboxes.get(id);
  if (data) sandboxes.delete(id); // re-insert below so Map order = least recently used first
  else data = seed();
  sandboxes.set(id, data);
  if (sandboxes.size > MAX_SANDBOXES) sandboxes.delete(sandboxes.keys().next().value);
  return current.run(data, fn);
}

const store = () => {
  const data = current.getStore();
  if (!data) throw new Error("Demo data read outside inSandbox(). Call it through lib/data.");
  if (data.replies.length) deliverDueReplies(data);
  return data;
};
const profileById = (id) => store().profiles.find((p) => p.id === id);
const swipesFor = (productId) => store().swipes.filter((s) => s.product_id === productId);
// Pending + accepted requests: what counts toward max_testers (passed testers free up a spot).
const openRequestsFor = (productId) => store().requests.filter((r) => r.product_id === productId && r.status !== "declined");
const rightsFor = (productId) => swipesFor(productId).filter((s) => s.direction === "right");
const newest = (a, b) => b.created_at.localeCompare(a.created_at);

export async function getProfile(userId) {
  return profileById(userId) ?? null;
}

// Merges like Supabase's upsert, which keeps columns the form doesn't send (e.g. connect_code).
export async function saveProfile(profile) {
  const s = store();
  s.profiles = [...s.profiles.filter((p) => p.id !== profile.id), { ...profileById(profile.id), ...profile }];
}

// --- GitHub ---

export async function getGitHubProfile(userId) {
  return store().githubProfiles.find((g) => g.id === userId) ?? null;
}

export async function saveGitHubProfile(row) {
  const s = store();
  s.githubProfiles = [...s.githubProfiles.filter((g) => g.id !== row.id), row];
}

export async function deleteGitHubProfile(userId) {
  const s = store();
  s.githubProfiles = s.githubProfiles.filter((g) => g.id !== userId);
}

export async function getDeck(userId) {
  const seen = new Set(store().swipes.filter((s) => s.tester_id === userId).map((s) => s.product_id));
  return store()
    .products.filter((p) => !p.hidden && p.owner_id !== userId && !seen.has(p.id) && openRequestsFor(p.id).length < p.max_testers)
    .sort((a, b) => Boolean(b.featured) - Boolean(a.featured) || newest(a, b))
    .map(({ max_testers, hidden, owner_id, created_at, ...p }) => ({ ...p, builder: profileById(owner_id).name.split(" ")[0] }));
}

export async function getMyProducts(userId) {
  return store()
    .products.filter((p) => p.owner_id === userId)
    .sort(newest)
    .map((p) => ({ ...p, matches: openRequestsFor(p.id).length, views: swipesFor(p.id).length }));
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
  const github = (id) => store().githubProfiles.find((g) => g.id === id) ?? null;
  return store()
    .profiles.filter((p) => p.open_to_builders && p.id !== userId && !seen.has(p.id))
    .map((p) => ({ ...p, github: github(p.id) }));
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

// --- In-person connect ---

export async function getProfileByConnectCode(code) {
  return store().profiles.find((p) => p.connect_code === code) ?? null;
}

export async function setConnectCode(userId, code) {
  const p = profileById(userId);
  if (p) p.connect_code = code;
}

// --- Chat ---

const productFor = (id) => {
  const p = store().products.find((p) => p.id === id);
  return { id: p.id, name: p.name, url: p.url, feedback_on: p.feedback_on, owner_id: p.owner_id };
};
const withProduct = ({ product_id, ...r }) => ({ ...r, product: productFor(product_id) });

// Mirrors withMyView in ./supabase.js. "them" leaves out email, same as the real query.
function withMyView(chat, userId) {
  const mine = chat.user_a === userId ? "a" : "b";
  const { email, ...them } = profileById(mine === "a" ? chat.user_b : chat.user_a);
  const readAt = chat[`${mine}_read_at`];
  const requests = store()
    .requests.filter((r) => r.chat_id === chat.id)
    .sort((x, y) => x.created_at.localeCompare(y.created_at))
    .map(withProduct);
  return {
    ...chat,
    requests,
    me: mine,
    them,
    waitingOnMe: requests.filter((r) => r.status === "pending" && r.product.owner_id === userId),
    unread: Boolean(chat.last_message_at && chat.last_sender_id !== userId && (!readAt || chat.last_message_at > readAt)),
  };
}
const isIn = (chat, userId) => chat.user_a === userId || chat.user_b === userId;

export async function createChat({ user_a, user_b, status }) {
  const s = store();
  const [lo, hi] = [user_a, user_b].sort();
  const existing = s.chats.find((c) => c.user_a === lo && c.user_b === hi);
  if (existing) return { id: existing.id, status: existing.status, created: false };
  const row = {
    id: crypto.randomUUID(), user_a: lo, user_b: hi, status, created_at: new Date().toISOString(),
    last_message_at: null, last_sender_id: null, a_read_at: null, b_read_at: null, a_notified_at: null, b_notified_at: null,
  };
  s.chats.push(row);
  return { id: row.id, status, created: true };
}

export async function getChats(userId) {
  return store().chats.filter((c) => isIn(c, userId)).sort(newest).map((c) => withMyView(c, userId));
}

export async function getChat(chatId, userId) {
  const c = store().chats.find((c) => c.id === chatId);
  return c && isIn(c, userId) ? withMyView(c, userId) : null;
}

export async function createProductRequest(request) {
  const s = store();
  if (s.requests.some((r) => r.tester_id === request.tester_id && r.product_id === request.product_id)) return { duplicate: true };
  const row = { id: crypto.randomUUID(), status: "pending", created_at: new Date().toISOString(), ...request };
  s.requests.push(row);
  return withProduct(row);
}

export async function getProductRequest(requestId) {
  const r = store().requests.find((r) => r.id === requestId);
  return r ? withProduct(r) : null;
}

export async function setProductRequestStatus(requestId, status) {
  const r = store().requests.find((r) => r.id === requestId);
  if (r) Object.assign(r, { status, answered_at: new Date().toISOString() });
}

export async function getMessages(chatId, sinceIso = null) {
  return store()
    .messages.filter((m) => m.chat_id === chatId && (!sinceIso || m.created_at > sinceIso))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(({ chat_id, ...m }) => m);
}

export async function insertMessage(message) {
  const s = store();
  const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), kind: "text", request_id: null, ...message };
  s.messages.push(row);
  const chat = s.chats.find((c) => c.id === message.chat_id);
  if (row.kind === "text") Object.assign(chat, { last_message_at: row.created_at, last_sender_id: row.sender_id }); // same rule as supabase.js
  if (row.sender_id === DEMO_USER.id && row.kind === "text") queueReply(s, chat);
  const { chat_id, ...m } = row;
  return m;
}

export async function setChatStatus(chatId, status) {
  const c = store().chats.find((c) => c.id === chatId);
  if (c) c.status = status;
}

export async function touchChat(chatId, side, field) {
  const c = store().chats.find((c) => c.id === chatId);
  if (c) c[`${side}_${field}_at`] = new Date().toISOString();
}

export async function countRecentMessages(userId, sinceIso) {
  return store().messages.filter((m) => m.sender_id === userId && m.kind === "text" && m.created_at >= sinceIso).length;
}

export async function countUnreadChats(userId) {
  return (await getChats(userId)).filter((c) => c.status !== "declined" && (c.unread || c.waitingOnMe.length > 0)).length;
}
