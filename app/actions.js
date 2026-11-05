"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { DEMO } from "@/lib/demo";
import { getUser, requireProfile, requireAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { introMailto, builderIntroMailto } from "@/lib/intro";
import { PLATFORMS, PROMPTS, PROMPT_SLOTS, ANSWER_MAX, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";
import { ROLES, TOPICS, LOOKING_FOR, TOPICS_MAX, BUILDING_MAX } from "@/lib/profile-options";
import { geocode } from "@/lib/geocode";
import { flushPostHogLogs, logPostHogAction } from "@/lib/posthog-logs";

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

// Accepts "github.com/you", "https://github.com/you", etc. Anything not on the expected site is dropped.
function profileUrl(value, host) {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname === host || url.hostname.endsWith(`.${host}`) ? `https://${url.hostname}${url.pathname}` : null;
  } catch {
    return null;
  }
}

// Used by onboarding (first save) and /profile (edits). The form posts every field, so upsert replaces them all.
export async function saveProfile(formData) {
  const user = await getUser();
  if (!user) redirect("/login");

  const existing = await data.getProfile(user.id);
  const locationInput = field(formData, "location");
  // Only geocode when the location changed, so re-saving the profile doesn't hit the API.
  let place = { location: null, lat: null, lng: null };
  if (locationInput && locationInput === existing?.location) {
    place = { location: existing.location, lat: existing.lat, lng: existing.lng };
  } else if (locationInput) {
    place = (await geocode(locationInput)) ?? { location: locationInput, lat: null, lng: null };
  }

  const role = field(formData, "role");
  // Same public bucket as product images, under avatars/ so the two never collide.
  const avatarUrl = await uploadPicked(formData, "avatar", `avatars/${user.id}`);
  const profileRole = ROLES.includes(role) ? role : "other";
  await data.saveProfile({
    id: user.id,
    email: user.email,
    name: field(formData, "name"),
    role: profileRole,
    stack: field(formData, "stack"),
    interests: field(formData, "interests") || null,
    discord_handle: field(formData, "discord_handle") || null,
    consent_at: existing?.consent_at ?? new Date().toISOString(), // when they first saw the sharing notice
    open_to_builders: Boolean(formData.get("open_to_builders")),
    building: field(formData, "building").slice(0, BUILDING_MAX) || null,
    topics: formData.getAll("topics").filter((t) => TOPICS.includes(t)).slice(0, TOPICS_MAX),
    looking_for: formData.getAll("looking_for").filter((l) => LOOKING_FOR.includes(l)),
    ...place,
    github_url: profileUrl(field(formData, "github_url"), "github.com"),
    linkedin_url: profileUrl(field(formData, "linkedin_url"), "linkedin.com"),
    avatar_url: avatarUrl ?? existing?.avatar_url ?? null,
  });
  logPostHogAction("profile saved", {
    event: "profile_saved",
    profile_state: existing ? "updated" : "created",
    role: profileRole,
  });
  await flushPostHogLogs();

  if (existing) {
    revalidatePath("/profile");
    redirect("/profile?saved=1");
  }
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

// Uploads one picked image under `${folder}/${kind}-<timestamp>`. Returns its URL, or null when the
// file input was left empty (which means "keep the current one").
async function uploadPicked(formData, kind, folder) {
  const file = formData.get(kind);
  if (!(file instanceof File) || file.size === 0) return null;
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Images must be PNG, JPG, WebP or GIF.");
  if (file.size > IMAGE_MAX_BYTES) throw new Error("Images must be under 2MB.");
  // Timestamp in the path so browsers don't show a cached old image after a replace.
  // TODO: delete the replaced file from storage. It's harmless clutter for now.
  const ext = file.type.split("/")[1];
  return data.uploadImage(`${folder}/${kind}-${Date.now()}.${ext}`, file);
}

// Uploads the logo/screenshot files that were picked.
async function productImages(formData, productId) {
  const urls = {};
  for (const kind of ["logo", "screenshot"]) {
    const url = await uploadPicked(formData, kind, productId);
    if (url) urls[`${kind}_url`] = url;
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
  logPostHogAction("product created", { event: "product_created" });
  await flushPostHogLogs();
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

  logPostHogAction("product swipe recorded", {
    event: "product_swipe_recorded",
    direction,
  });
  await flushPostHogLogs();
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

// One-click opt-in from the Builders tab, for people who filled in builder fields but missed the checkbox.
export async function enableBuilderMatching() {
  const { profile } = await requireProfile();
  await data.saveProfile({ ...profile, open_to_builders: true });
  redirect("/swipe?mode=builders");
}

// Builder ↔ builder swipe. Returns { error } or { ok, match }. It's only a match when the other
// builder already swiped right on you, and only then do contact details come back.
export async function swipeBuilder(builderId, direction) {
  const { user, profile } = await requireProfile();
  if (!["left", "right"].includes(direction)) return { error: "Bad swipe." };
  if (!profile.open_to_builders) return { error: "Turn on \"Show me to other builders\" in your profile first." };

  const other = await data.getProfile(builderId);
  if (!other?.open_to_builders || other.id === user.id) return { error: "That builder isn't available." };

  const { duplicate } = await data.insertBuilderLike({ from_id: user.id, to_id: builderId, direction });
  if (duplicate) return { error: "You already swiped on this builder." };
  if (direction === "left" || !(await data.hasRightLike(builderId, user.id))) return { ok: true };

  revalidatePath("/matches");
  return {
    ok: true,
    match: {
      name: other.name,
      email: other.email,
      github_url: other.github_url,
      linkedin_url: other.linkedin_url,
      mailto: builderIntroMailto({ me: profile, them: other }),
    },
  };
}

export async function setProductHidden(productId, hidden) {
  await requireAdmin();
  await data.setProductHidden(productId, hidden);
  revalidatePath("/admin");
}
