"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { DEMO } from "@/lib/demo";
import { getUser, requireProfile, requireAdmin } from "@/lib/session";
import * as data from "@/lib/data";

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

export async function createProduct(formData) {
  const { user } = await requireProfile();
  await data.createProduct({
    owner_id: user.id,
    name: field(formData, "name"),
    url: field(formData, "url"),
    tagline: field(formData, "tagline"),
    wants: field(formData, "wants"),
    feedback_on: field(formData, "feedback_on"),
    stage: field(formData, "stage"),
    perk: field(formData, "perk"),
    max_testers: Number(formData.get("max_testers")) || 3,
  });
  revalidatePath("/products");
  redirect("/products");
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
      mailto: introMailto(product, profile),
    },
  };
}

// Pre-written first email from the tester to the builder.
function introMailto(product, tester) {
  const builderFirst = product.owner.name.split(" ")[0];
  const subject = `Trying ${product.name} (via the PostHog community)`;
  const body = `Hi ${builderFirst},

I swiped right on ${product.name} on try my thing, the PostHog community matchmaker. I'm a ${tester.role} using ${tester.stack}, and I'd like to try it and send you honest feedback, especially on ${product.feedback_on}.

How do I get access?

${tester.name}`;
  return `mailto:${product.owner.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function setProductHidden(productId, hidden) {
  await requireAdmin();
  await data.setProductHidden(productId, hidden);
  revalidatePath("/admin");
}
