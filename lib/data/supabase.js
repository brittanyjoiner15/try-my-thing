import { db } from "@/lib/supabase/server";

const fail = (error) => {
  if (error) throw new Error(error.message);
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

export async function getMatches(userId) {
  const [{ data: tried, error: e1 }, { data: testers, error: e2 }] = await Promise.all([
    db()
      .from("swipes")
      .select("created_at, product:products(name, url, feedback_on, owner:profiles!owner_id(name, email))")
      .eq("tester_id", userId)
      .eq("direction", "right")
      .order("created_at", { ascending: false }),
    db()
      .from("swipes")
      .select("created_at, product:products!inner(name, owner_id), tester:profiles(name, email, role, stack, discord_handle)")
      .eq("product.owner_id", userId)
      .eq("direction", "right")
      .order("created_at", { ascending: false }),
  ]);
  fail(e1 || e2);
  return {
    tried: tried.map((m) => ({ created_at: m.created_at, product: m.product, builder: m.product.owner })),
    testers: testers.map((m) => ({ created_at: m.created_at, product: m.product, tester: m.tester })),
  };
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
