"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { DEMO } from "@/lib/demo";
import { getUser, requireProfile, requireAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { introMailto } from "@/lib/intro";
import { PLATFORMS, PROMPTS, PROMPT_SLOTS, ANSWER_MAX, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";

// Keeps testers from right-swiping everything and flooding builders with no-shows.
const MAX_RIGHT_SWIPES_PER_WEEK = 3;

const field = (formData, name) => String(formData.get(name) ?? "").trim();

export async function sendMagicLink(_prevState, formData) {
  const email = field(formData, "email");
  if (!email) return { error: "Enter your email." };

  const origin = (await headers()).get("origin");
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { sent: email };
}

export async function signOut() {
  if (!DEMO) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function saveProfile(formData) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!formData.get("consent")) throw new Error("Consent is required to get matched.");

  await data.saveProfile({
    id: user.id,
    email: user.email,
    name: field(formData, "name"),
    role: field(formData, "role"),
    stack: field(formData, "stack"),
    interests: field(formData, "interests") || null,
    discord_handle: field(formData, "discord_handle") || null,
    shoutout_ok: Boolean(formData.get("shoutout_ok")),
    consent_at: new Date().toISOString(),
  });
  redirect("/swipe");
}

// Text fields shared by "post" and "edit". Only known platforms and prompts get through.
function productFields(formData) {
  const prompts = [];
  for (let i = 0; i < PROMPT_SLOTS; i++) {
    const prompt = field(formData, `prompt_${i}`);
    const answer = field(formData, `answer_${i}`).slice(0, ANSWER_MAX);
    if (PROMPTS.includes(prompt) && answer && !prompts.some((p) => p.prompt === prompt)) prompts.push({ prompt, answer });
  }
  return {
    name: field(formData, "name"),
    url: field(formData, "url"),
    tagline: field(formData, "tagline"),
    wants: field(formData, "wants"),
    feedback_on: field(formData, "feedback_on"),
    stage: field(formData, "stage"),
    perk: field(formData, "perk"),
    max_testers: Number(formData.get("max_testers")) || 3,
    platforms: formData.getAll("platforms").filter((p) => PLATFORMS.includes(p)),
    prompts,
  };
}

// Uploads the logo/screenshot files that were picked. An empty file input means "keep the current one".
async function productImages(formData, productId) {
  const urls = {};
  for (const kind of ["logo", "screenshot"]) {
    const file = formData.get(kind);
    if (!(file instanceof File) || file.size === 0) continue;
    if (!IMAGE_TYPES.includes(file.type)) throw new Error("Images must be PNG, JPG, WebP or GIF.");
    if (file.size > IMAGE_MAX_BYTES) throw new Error("Images must be under 2MB.");
    // Timestamp in the path so browsers don't show a cached old image after a replace.
    // TODO: delete the replaced file from storage. It's harmless clutter for now.
    const ext = file.type.split("/")[1];
    urls[`${kind}_url`] = await data.uploadImage(`${productId}/${kind}-${Date.now()}.${ext}`, file);
  }
  return urls;
}

export async function createProduct(formData) {
  const { user } = await requireProfile();
  const id = crypto.randomUUID(); // made here so images can be stored under the product's id
  await data.createProduct({
    id,
    owner_id: user.id,
    ...productFields(formData),
    ...(await productImages(formData, id)),
  });
  revalidatePath("/products");
  redirect(`/products/${id}`);
}

export async function updateProduct(productId, formData) {
  const { user } = await requireProfile();
  const product = await data.getProductWithOwner(productId);
  if (product?.owner_id !== user.id) throw new Error("You can only edit your own products.");

  await data.updateProduct(productId, user.id, {
    ...productFields(formData),
    ...(await productImages(formData, productId)),
  });
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  redirect(`/products/${productId}`);
}

// Owner pauses/unpauses their own product.
export async function toggleMyProduct(productId, hidden) {
  const { user } = await requireProfile();
  await data.setProductHidden(productId, hidden, user.id);
  revalidatePath("/products");
}

// Returns { error } or { ok, match }. On a right swipe, match holds the builder's contact details
// so the tester can reach out. No email is sent by the app.
export async function swipe(productId, direction) {
  const { user, profile } = await requireProfile();
  if (!["left", "right"].includes(direction)) return { error: "Bad swipe." };

  if (direction === "right") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if ((await data.countRecentRightSwipes(user.id, weekAgo)) >= MAX_RIGHT_SWIPES_PER_WEEK) {
      return { error: `You've hit ${MAX_RIGHT_SWIPES_PER_WEEK} matches this week. Give those builders some love first.` };
    }
  }

  const product = await data.getProductWithOwner(productId);
  if (!product || product.hidden || product.owner_id === user.id) return { error: "That product isn't available." };

  const { duplicate } = await data.insertSwipe({ tester_id: user.id, product_id: productId, direction });
  if (duplicate) return { error: "You already swiped on this one." };

  revalidatePath("/matches");
  if (direction === "left") return { ok: true };
  return {
    ok: true,
    match: {
      product: product.name,
      builderName: product.owner.name,
      builderEmail: product.owner.email,
      mailto: introMailto({ product, builder: product.owner, tester: profile }),
    },
  };
}

export async function setProductHidden(productId, hidden) {
  await requireAdmin();
  await data.setProductHidden(productId, hidden);
  revalidatePath("/admin");
}
