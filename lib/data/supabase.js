import { db } from "@/lib/supabase/server";

// Keeps Supabase's error code (e.g. "23505", "PGRST301") so PostHog Error tracking can group by it.
const fail = (error) => {
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
};
const rightCount = (swipes) => swipes.filter((s) => s.direction === "right").length;

export async function getProfile(userId) {
  const { data } = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function saveProfile(profile) {
  const { error } = await db().from("profiles").upsert(profile);
  fail(error);
}

// --- GitHub (see lib/github.js) ---

export async function getGitHubProfile(userId) {
  const { data } = await db().from("github_profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

export async function saveGitHubProfile(row) {
  const { error } = await db().from("github_profiles").upsert(row);
  fail(error);
}

export async function deleteGitHubProfile(userId) {
  const { error } = await db().from("github_profiles").delete().eq("id", userId);
  fail(error);
}

// Products the user hasn't swiped on, that aren't theirs and still need testers.
// Fine at pilot scale. TODO: move into a Postgres function if this grows.
export async function getDeck(userId) {
  const [{ data: products, error: e1 }, { data: mine, error: e2 }, { data: rights, error: e3 }] = await Promise.all([
    db()
      .from("products")
      .select(
        "id, name, url, tagline, wants, feedback_on, stage, perk, max_testers, logo_url, screenshot_url, platforms, prompts, owner:profiles!owner_id(name)",
      )
      .eq("hidden", false)
      .neq("owner_id", userId)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
    db().from("swipes").select("product_id").eq("tester_id", userId),
    db().from("swipes").select("product_id").eq("direction", "right"),
  ]);
  fail(e1 || e2 || e3);
  const seen = new Set(mine.map((s) => s.product_id));
  const matches = {};
  rights.forEach((s) => (matches[s.product_id] = (matches[s.product_id] ?? 0) + 1));

  return products
    .filter((p) => !seen.has(p.id) && (matches[p.id] ?? 0) < p.max_testers)
    .map(({ max_testers, owner, ...p }) => ({ ...p, builder: owner.name.split(" ")[0] }));
}

export async function getMyProducts(userId) {
  const { data, error } = await db()
    .from("products")
    .select("*, swipes(direction)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  fail(error);
  return data.map(({ swipes, ...p }) => ({ ...p, matches: rightCount(swipes), views: swipes.length }));
}

export async function createProduct(product) {
  const { error } = await db().from("products").insert(product);
  fail(error);
}

// Only the owner can update their product.
export async function updateProduct(productId, ownerId, fields) {
  const { error } = await db().from("products").update(fields).eq("id", productId).eq("owner_id", ownerId);
  fail(error);
}

// Public product images (logo, screenshot). Returns the public URL.
export async function uploadImage(path, file) {
  const bucket = db().storage.from("product-images");
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: true });
  fail(error);
  return bucket.getPublicUrl(path).data.publicUrl;
}

// ownerId set = only the owner may change it; null = admin.
export async function setProductHidden(productId, hidden, ownerId = null) {
  let q = db().from("products").update({ hidden }).eq("id", productId);
  if (ownerId) q = q.eq("owner_id", ownerId);
  const { error } = await q;
  fail(error);
}

export async function countRecentRightSwipes(userId, sinceIso) {
  const { count } = await db()
    .from("swipes")
    .select("*", { count: "exact", head: true })
    .eq("tester_id", userId)
    .eq("direction", "right")
    .gte("created_at", sinceIso);
  return count ?? 0;
}

export async function getProductWithOwner(productId) {
  const { data } = await db().from("products").select("*, owner:profiles!owner_id(*)").eq("id", productId).maybeSingle();
  return data;
}

export async function insertSwipe(swipe) {
  const { error } = await db().from("swipes").insert(swipe);
  if (error?.code === "23505") return { duplicate: true };
  fail(error);
  return {};
}

export async function getAdminData() {
  const [{ data: matches }, { data: products }, { count: people }] = await Promise.all([
    db()
      .from("swipes")
      .select("created_at, tester:profiles(name, email), product:products(name, owner:profiles!owner_id(name, email))")
      .eq("direction", "right")
      .order("created_at", { ascending: false }),
    db()
      .from("products")
      .select("id, name, url, hidden, owner:profiles!owner_id(name, email), swipes(direction)")
      .order("created_at", { ascending: false }),
    db().from("profiles").select("*", { count: "exact", head: true }),
  ]);
  return {
    people,
    matches: matches.map((m) => ({ created_at: m.created_at, product: m.product, builder: m.product.owner, tester: m.tester })),
    products: products.map(({ swipes, ...p }) => ({ ...p, matches: rightCount(swipes), views: swipes.length })),
  };
}

// --- Builder ↔ builder matching ---

const BUILDER_CARD_FIELDS = "id, name, avatar_url, role, stack, building, topics, looking_for, location, lat, lng, featured_repos";

// Opted-in builders the user hasn't swiped on yet. Ranking happens in lib/builder-match.js.
// Fine at pilot scale. TODO: move into a Postgres function if this grows.
export async function getBuilderCandidates(userId) {
  const [{ data: people, error: e1 }, { data: seen, error: e2 }] = await Promise.all([
    db().from("profiles").select(BUILDER_CARD_FIELDS).eq("open_to_builders", true).neq("id", userId),
    db().from("builder_likes").select("to_id").eq("from_id", userId),
  ]);
  fail(e1 || e2);
  const seenIds = new Set(seen.map((l) => l.to_id));
  const fresh = people.filter((p) => !seenIds.has(p.id));
  if (!fresh.length) return [];

  // Second query, not a join: github_profiles points at auth.users, so PostgREST can't see a link to profiles.
  const { data: github, error: e3 } = await db()
    .from("github_profiles")
    .select("id, languages, repos")
    .in("id", fresh.map((p) => p.id));
  fail(e3);
  const byId = new Map(github.map((g) => [g.id, g]));
  return fresh.map((p) => ({ ...p, github: byId.get(p.id) ?? null }));
}

export async function insertBuilderLike(like) {
  const { error } = await db().from("builder_likes").insert(like);
  if (error?.code === "23505") return { duplicate: true };
  fail(error);
  return {};
}

export async function hasRightLike(fromId, toId) {
  const { count } = await db()
    .from("builder_likes")
    .select("*", { count: "exact", head: true })
    .eq("from_id", fromId)
    .eq("to_id", toId)
    .eq("direction", "right");
  return Boolean(count);
}

// --- Chat ---
// A chat row is one match. user_a/user_b order matters only for the read/notify columns (a_* or b_*).

// What the other person in a chat can see. No email: matches talk in the app now.
const CHAT_PERSON_FIELDS = "id, name, avatar_url, role, stack, building, location, discord_handle, github_url, linkedin_url";
const CHAT_SELECT = `*, a:profiles!user_a(${CHAT_PERSON_FIELDS}), b:profiles!user_b(${CHAT_PERSON_FIELDS}), product:products(id, name, url, feedback_on, owner_id)`;

// Adds the fields every page uses: who "them" is, my side's read time, and whether there's something unread.
function withMyView(chat, userId) {
  const mine = chat.user_a === userId ? "a" : "b";
  const { a, b, ...rest } = chat;
  const readAt = rest[`${mine}_read_at`];
  return {
    ...rest,
    me: mine,
    them: mine === "a" ? b : a,
    unread: Boolean(rest.last_message_at && rest.last_sender_id !== userId && (!readAt || rest.last_message_at > readAt)),
  };
}

// Returns the existing chat if this match already has one (e.g. a double submit).
export async function createChat(chat) {
  const { data, error } = await db().from("chats").insert(chat).select("id").single();
  if (error?.code !== "23505") {
    fail(error);
    return data;
  }
  let q = db().from("chats").select("id").eq("user_a", chat.user_a);
  q = chat.product_id ? q.eq("product_id", chat.product_id) : q.eq("user_b", chat.user_b).is("product_id", null);
  const { data: existing, error: e2 } = await q.single();
  fail(e2);
  return existing;
}

export async function getChats(userId) {
  const { data, error } = await db()
    .from("chats")
    .select(CHAT_SELECT)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });
  fail(error);
  return data.map((c) => withMyView(c, userId));
}

// Null unless userId is in the chat, so callers can use it as the access check.
export async function getChat(chatId, userId) {
  const { data } = await db().from("chats").select(CHAT_SELECT).eq("id", chatId).maybeSingle();
  if (!data || (data.user_a !== userId && data.user_b !== userId)) return null;
  return withMyView(data, userId);
}

// Oldest first. sinceIso = only messages newer than that (for polling).
export async function getMessages(chatId, sinceIso = null) {
  let q = db().from("messages").select("id, sender_id, body, created_at").eq("chat_id", chatId);
  if (sinceIso) q = q.gt("created_at", sinceIso);
  const { data, error } = await q.order("created_at").limit(500);
  fail(error);
  return data;
}

export async function insertMessage(message) {
  const { data, error } = await db().from("messages").insert(message).select("id, sender_id, body, created_at").single();
  fail(error);
  const { error: e2 } = await db()
    .from("chats")
    .update({ last_message_at: data.created_at, last_sender_id: message.sender_id })
    .eq("id", message.chat_id);
  fail(e2);
  return data;
}

export async function setChatStatus(chatId, status) {
  const { error } = await db().from("chats").update({ status }).eq("id", chatId);
  fail(error);
}

// side = "a" | "b" (chat.me). field = "read" | "notified".
export async function touchChat(chatId, side, field) {
  const { error } = await db().from("chats").update({ [`${side}_${field}_at`]: new Date().toISOString() }).eq("id", chatId);
  fail(error);
}

export async function countRecentMessages(userId, sinceIso) {
  const { count } = await db()
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", sinceIso);
  return count ?? 0;
}

// For the tab bar badge: chats with a message I haven't read, plus tester requests waiting on me.
export async function countUnreadChats(userId) {
  const { data, error } = await db()
    .from("chats")
    .select("user_a, user_b, product_id, status, last_message_at, last_sender_id, a_read_at, b_read_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq("status", "declined");
  fail(error);
  return data.filter((c) => {
    const pendingOnMe = c.status === "pending" && c.user_b === userId;
    return pendingOnMe || withMyView(c, userId).unread;
  }).length;
}
