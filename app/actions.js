"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { GITHUB_LINK_COOKIE } from "@/lib/github";
import { getUser, requireProfile, requireAdmin, isAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { PLATFORMS, PROMPTS, PROMPT_SLOTS, ANSWER_MAX, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";
import { ROLES, TOPICS, LOOKING_FOR, TOPICS_MAX, BUILDING_MAX } from "@/lib/profile-options";
import { geocode } from "@/lib/geocode";
import { fetchGitHubProfile } from "@/lib/github";
import { captureServerError, captureServerEvent } from "@/lib/posthog-server";
import { flushPostHogLogs, logPostHogAction } from "@/lib/posthog-logs";
import { sendProductMatchEmails, sendBuilderMatchEmails, sendChatAcceptedEmail, sendNewMessageEmail, sendInPersonConnectEmail } from "@/lib/match-emails";
import { CONNECT_COOKIE, CONNECT_CODE, newConnectCode } from "@/lib/connect";
import { CLAIM_COOKIE, CLAIM_CODE, newClaimCode } from "@/lib/claim";
import { signInReturnTo } from "@/lib/return-to";

// Keeps testers from right-swiping everything and flooding builders with no-shows.
const MAX_RIGHT_SWIPES_PER_WEEK = 3;
// Chat limits. Generous for a real conversation, low enough to stop a script.
const MESSAGE_MAX = 2000; // also a check constraint in the chats migration
const MAX_MESSAGES_PER_10_MIN = 30;

// Base URL for links in emails. Netlify sets URL to the site's main address.
async function appUrl() {
  return (await headers()).get("origin") ?? process.env.URL ?? "http://localhost:3000";
}

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

// The same email also has a one-time code (the Magic Link template shows {{ .Token }}). Typing it in
// signs people in on this device, which matters for the home screen app: on iOS it has its own
// cookies, so tapping the link would sign them in to Safari instead. Issue #48.
export async function verifyEmailCode(_prevState, formData) {
  const email = field(formData, "email");
  const token = field(formData, "code").replace(/\s/g, "");
  // Supabase's code length is configurable (6 to 10 digits), so don't hardcode 6.
  if (!email || !/^\d{6,10}$/.test(token)) return { error: "Enter the code from the email." };

  const supabase = await createAuthClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "That code didn't work. It may have expired, or a newer email replaced it." };
  redirect(signInReturnTo(await cookies()) ?? "/swipe");
}

// "Continue with GitHub" on /login. New and returning users both come back through /auth/callback.
export async function signInWithGitHub() {
  const origin = (await headers()).get("origin");
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/login?error=github");
  redirect(data.url);
}

// "Connect GitHub" on /profile, for people who signed up with a magic link. Adds GitHub as a second
// way to sign in to the same account (needs "Manual linking" on in Supabase Auth settings).
export async function connectGitHub() {
  const user = await getUser(); // not requireProfile: onboarding offers this before the first save
  if (!user) redirect("/login");
  const origin = (await headers()).get("origin");
  const supabase = await createAuthClient();
  const { data: link, error } = await supabase.auth.linkIdentity({
    provider: "github",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/profile?github=error");
  (await cookies()).set(GITHUB_LINK_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: origin?.startsWith("https"), maxAge: 600 });
  redirect(link.url);
}

// "Refresh from GitHub" on /profile: re-reads their public profile and repos by username, no sign-in needed.
export async function refreshGitHub() {
  const { user } = await requireProfile();
  const current = await data.getGitHubProfile(user.id);
  if (!current) redirect("/profile");
  try {
    await data.saveGitHubProfile({ id: user.id, ...(await fetchGitHubProfile(null, current.username)) });
  } catch (e) {
    await captureServerError(e, { area: "github_refresh", limit: e.code === "github_403" ? "github" : undefined });
    redirect("/profile?github=error");
  }
  revalidatePath("/profile");
  redirect("/profile?github=refreshed");
}

// Removes GitHub data from the profile and, when they have another way to sign in, unlinks GitHub too.
// People who only sign in with GitHub keep the link (Supabase won't remove someone's last sign-in method),
// so their data comes back on next sign-in. They can still pick no repos to keep them off their card.
export async function disconnectGitHub() {
  const { user } = await requireProfile();
  const supabase = await createAuthClient();
  const { data: ids } = await supabase.auth.getUserIdentities();
  const github = ids?.identities?.find((i) => i.provider === "github");
  if (github && ids.identities.length > 1) {
    const { error } = await supabase.auth.unlinkIdentity(github);
    if (error) redirect("/profile?github=error");
  }
  await data.deleteGitHubProfile(user.id);
  revalidatePath("/profile");
  redirect("/profile");
}

// "Turn on notifications" on /profile (PushToggle). Saves this device's push subscription. Issue #48.
export async function enablePush(subscription) {
  const user = await getUser();
  if (!user) return { error: "Sign in first." };
  const { endpoint, keys } = subscription ?? {};
  // Push services are always https. Anything else isn't a real subscription.
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !keys?.p256dh || !keys?.auth) {
    return { error: "That didn't work. Try again." };
  }
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await data.savePushSubscription({ userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent });
  return { ok: true };
}

export async function disablePush(endpoint) {
  const user = await getUser();
  if (!user || typeof endpoint !== "string") return { ok: false };
  await data.deletePushSubscription(endpoint, user.id);
  return { ok: true };
}

export async function signOut() {
  const supabase = await createAuthClient();
  await supabase.auth.signOut();
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

  const [existing, github] = await Promise.all([data.getProfile(user.id), data.getGitHubProfile(user.id)]);
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
  const githubAvatar = formData.get("use_github_avatar") ? github?.avatar_url : null;
  const profileRole = ROLES.includes(role) ? role : "other";
  await data.saveProfile({
    id: user.id,
    email: user.email,
    name: field(formData, "name"),
    role: profileRole,
    stack: field(formData, "stack"),
    interests: field(formData, "interests") || null,
    discord_handle: existing?.discord_handle ?? null, // no longer on the form, kept for people who set one
    consent_at: existing?.consent_at ?? new Date().toISOString(), // when they first saw the sharing notice
    open_to_builders: Boolean(formData.get("open_to_builders")),
    building: field(formData, "building").slice(0, BUILDING_MAX) || null,
    topics: formData.getAll("topics").filter((t) => TOPICS.includes(t)).slice(0, TOPICS_MAX),
    looking_for: formData.getAll("looking_for").filter((l) => LOOKING_FOR.includes(l)),
    ...place,
    github_url: profileUrl(field(formData, "github_url"), "github.com"),
    linkedin_url: profileUrl(field(formData, "linkedin_url"), "linkedin.com"),
    // A new upload wins. Then their GitHub photo if they picked it, then the current photo.
    // No photo at all: GitHub's fills the gap, same as the other prefilled fields.
    avatar_url: avatarUrl ?? githubAvatar ?? existing?.avatar_url ?? github?.avatar_url ?? null,
    // The repo picker only renders when GitHub is connected. Otherwise keep what they picked before.
    featured_repos: github ? pickedRepos(formData, github) : (existing?.featured_repos ?? null),
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
  // Signed up from someone's in-person link or a claim link: take them back to it. They skip /welcome,
  // which is fine since they're about to land in a chat or on their product.
  const cookieStore = await cookies();
  const connectCode = [cookieStore.get(CONNECT_COOKIE)?.value].find((c) => c && CONNECT_CODE.test(c));
  const claimCode = [cookieStore.get(CLAIM_COOKIE)?.value].find((c) => c && CLAIM_CODE.test(c));
  // First save = signup. Tag where they came from, after the response so the redirect doesn't wait.
  // The "New signup" workflow in PostHog emails Britt on this event, using the profile fields below.
  const profileFields = {
    name: field(formData, "name"),
    stack: field(formData, "stack"),
    building: field(formData, "building") || null,
    location: place.location,
  };
  after(() => trackSignup(user.id, { connectCode, claimCode, role: profileRole, hasGitHub: Boolean(github), email: user.email, ...profileFields }));
  if (connectCode) redirect(`/c/${connectCode}`);
  if (claimCode) redirect(`/claim/${claimCode}`);
  redirect("/welcome"); // first save: show the short how-it-works screen once
}

// user_signed_up with how they joined, so PostHog can show which links drive signups.
// The cookies last a day, so someone who signs up later than that counts as "direct".
// Connect wins over claim, same as the redirect above. The "Invite someone" button shares the
// plain homepage, so those signups are "direct" too (TODO: add a ?ref= if we want to count them).
async function trackSignup(userId, { connectCode, claimCode, role, hasGitHub, email, ...profileFields }) {
  let attribution = { signup_source: "direct" };
  if (connectCode) {
    const referrer = await data.getProfileByConnectCode(connectCode);
    attribution = { signup_source: "connect_link", referrer_id: referrer?.id ?? null, referrer_name: referrer?.name ?? null };
  } else if (claimCode) {
    const product = await data.getProductByClaimCode(claimCode);
    attribution = { signup_source: "claim_link", product_id: product?.id ?? null, product_name: product?.name ?? null };
  }
  await captureServerEvent(userId, "user_signed_up", {
    ...attribution,
    role,
    has_github: hasGitHub,
    ...profileFields, // name, stack, building, location: for the signup alert email
    $set: { email, name: profileFields.name },
    $set_once: attribution, // person properties, so any later event can be broken down by how they joined
  });
}

// Only names that are really in their GitHub repo list, max 3.
const FEATURED_REPOS_MAX = 3;
function pickedRepos(formData, github) {
  const names = new Set(github.repos.map((r) => r.name));
  return formData.getAll("featured_repos").filter((n) => names.has(n)).slice(0, FEATURED_REPOS_MAX);
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

// What the "New product" workflow in PostHog puts in the email to Britt.
async function productPostedProps(product, owner, via) {
  return {
    product_id: product.id,
    product_name: product.name,
    product_url: product.url,
    product_tagline: product.tagline,
    product_page: `${await appUrl()}/products/${product.id}`,
    owner_name: owner.name,
    via, // "posted" (builder made it) or "claimed" (claim link Britt prefilled)
  };
}

export async function createProduct(formData) {
  const { user, profile } = await requireProfile();
  const id = crypto.randomUUID(); // made here so images can be stored under the product's id
  const fields = productFields(formData);
  await data.createProduct({
    id,
    owner_id: user.id,
    ...fields,
    ...(await productImages(formData, id)),
  });
  const props = await productPostedProps({ id, ...fields }, profile, "posted");
  after(() => captureServerEvent(user.id, "product_posted", props));
  logPostHogAction("product created", { event: "product_created" });
  await flushPostHogLogs();
  revalidatePath("/products");
  redirect(`/products/${id}`);
}

export async function updateProduct(productId, formData) {
  const { user } = await requireProfile();
  const product = await data.getProductWithOwner(productId);
  // Unclaimed products (claim links) have no owner yet, so only an admin can edit them.
  const unclaimed = product && !product.owner_id;
  if (unclaimed ? !isAdmin(user) : product?.owner_id !== user.id) throw new Error("You can only edit your own products.");

  await data.updateProduct(productId, unclaimed ? null : user.id, {
    ...productFields(formData),
    ...(await productImages(formData, productId)),
  });
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  if (unclaimed) {
    revalidatePath(`/claim/${product.claim_code}`);
    redirect(`/claim/${product.claim_code}`);
  }
  redirect(`/products/${productId}`);
}

// Owner pauses/unpauses their own product.
export async function toggleMyProduct(productId, hidden) {
  const { user } = await requireProfile();
  await data.setProductHidden(productId, hidden, user.id);
  revalidatePath("/products");
}

// Owner deletes their own product for good. Admins use deleteProductAsAdmin.
export async function deleteMyProduct(productId) {
  const { user } = await requireProfile();
  const deleted = await data.deleteProduct(productId, user.id);
  if (!deleted) throw new Error("You can only delete your own products.");
  logPostHogAction("product deleted", { event: "product_deleted", product_id: productId, by: "owner" });
  await flushPostHogLogs();
  revalidatePath("/products");
  revalidatePath("/admin");
  redirect("/products");
}

// Returns { error } or { ok, match }. A right swipe adds a product request to the pair's chat.
// New chat: it starts pending and the builder has to accept. Chat already open (builder match, or an
// earlier accepted request): the request is accepted right away and shows up as a line in the thread.
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

  const chat = await data.createChat({ user_a: user.id, user_b: product.owner_id, status: "pending" });
  const accepted = chat.status === "open";
  const request = await data.createProductRequest({
    chat_id: chat.id,
    tester_id: user.id,
    product_id: productId,
    status: accepted ? "accepted" : "pending",
  });
  if (request.duplicate) return { error: "You already asked to try this one." };
  if (chat.status === "declined") await data.setChatStatus(chat.id, "pending"); // a new ask, so it's waiting again
  await data.insertMessage({ chat_id: chat.id, sender_id: user.id, kind: "request", request_id: request.id, body: `wants to try ${product.name}` });

  const chatUrl = `${await appUrl()}/matches/${chat.id}`;
  after(() => sendProductMatchEmails({ requestId: request.id, product, builder: product.owner, tester: profile, chatUrl, alreadyChatting: accepted }));
  return { ok: true, match: { product: product.name, builderName: product.owner.name, chatId: chat.id, accepted } };
}

// One-click opt-in from the card in the swipe deck, for people who filled in builder fields but missed the checkbox.
export async function enableBuilderMatching() {
  const { profile } = await requireProfile();
  await data.saveProfile({ ...profile, open_to_builders: true });
  redirect("/swipe");
}

// Builder ↔ builder swipe. Returns { error } or { ok, match }. It's only a match when the other
// builder already swiped right on you, and only then does a chat open.
export async function swipeBuilder(builderId, direction) {
  const { user, profile } = await requireProfile();
  if (!["left", "right"].includes(direction)) return { error: "Bad swipe." };
  if (!profile.open_to_builders) return { error: "Turn on \"Show me to other builders\" in your profile first." };

  const other = await data.getProfile(builderId);
  if (!other?.open_to_builders || other.id === user.id) return { error: "That builder isn't available." };

  const { duplicate } = await data.insertBuilderLike({ from_id: user.id, to_id: builderId, direction });
  if (duplicate) return { error: "You already swiped on this builder." };
  if (direction === "left" || !(await data.hasRightLike(builderId, user.id))) return { ok: true };

  // The pair may already have a chat from a product request. A builder match opens it.
  const chat = await data.createChat({ user_a: user.id, user_b: builderId, status: "open" });
  const opened = chat.created || chat.status !== "open";
  if (chat.status !== "open") await data.setChatStatus(chat.id, "open");
  if (opened) after(() => trackMatchOpened(user.id, chat.id, "builder"));
  revalidatePath("/matches");
  const chatUrl = `${await appUrl()}/matches/${chat.id}`;
  after(() => sendBuilderMatchEmails({ chatId: chat.id, a: profile, b: other, chatUrl }));
  return { ok: true, match: { name: other.name, chatId: chat.id } };
}

// --- In-person connect (/c/<code>, see lib/connect.js) ---

// Not signed up yet: remember the link for a day, then send them through login and onboarding.
// /auth/callback and saveProfile send them back to /c/<code> afterwards.
export async function startConnect(code) {
  if (!CONNECT_CODE.test(code)) redirect("/login");
  (await cookies()).set(CONNECT_COOKIE, code, { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", path: "/" });
  redirect((await getUser()) ? "/onboarding" : "/login");
}

// Tapping Connect on someone's /c/<code> page. Returns { error }, or redirects into the new chat.
export async function connectInPerson(code) {
  const { user, profile } = await requireProfile();
  (await cookies()).delete(CONNECT_COOKIE);
  const other = CONNECT_CODE.test(code) ? await data.getProfileByConnectCode(code) : null;
  if (!other) return { error: "This link doesn't work anymore. Ask them to show you their QR code again." };
  if (other.id === user.id) return { error: "That's your own link. Show it to someone else to connect." };

  // Count it as a mutual right swipe, so they drop out of each other's swipe deck.
  // An earlier swipe either way already has a row, and the duplicate is ignored.
  await data.insertBuilderLike({ from_id: user.id, to_id: other.id, direction: "right" });
  await data.insertBuilderLike({ from_id: other.id, to_id: user.id, direction: "right" });
  // Same chat as everything else between these two. Connecting opens it.
  const chat = await data.createChat({ user_a: user.id, user_b: other.id, status: "open" });
  const alreadyOpen = !chat.created && chat.status === "open";
  if (!alreadyOpen && !chat.created) await data.setChatStatus(chat.id, "open");
  revalidatePath("/matches");

  logPostHogAction("in person connect", { event: "in_person_connect", already_matched: alreadyOpen });
  await flushPostHogLogs();
  if (!alreadyOpen) {
    after(() => trackMatchOpened(user.id, chat.id, "in_person"));
    const chatUrl = `${await appUrl()}/matches/${chat.id}`;
    after(() => sendInPersonConnectEmail({ chatId: chat.id, to: other, from: profile, chatUrl }));
  }
  redirect(`/matches/${chat.id}`);
}

// Makes a new link and QR code, so the old one stops working (e.g. it got posted somewhere public).
export async function resetConnectCode() {
  const { user } = await requireProfile();
  await data.setConnectCode(user.id, newConnectCode());
  logPostHogAction("connect link reset", { event: "connect_link_reset" });
  await flushPostHogLogs();
  revalidatePath("/profile");
}

// --- Claim links (/claim/<code>, see lib/claim.js) ---

// Admin prefills a product for a builder. It has no owner, so no deck shows it until they claim it.
export async function createUnclaimedProduct(formData) {
  await requireAdmin();
  const id = crypto.randomUUID();
  const claimCode = newClaimCode();
  await data.createProduct({
    id,
    owner_id: null,
    claim_code: claimCode,
    ...productFields(formData),
    ...(await productImages(formData, id)),
  });
  logPostHogAction("unclaimed product created", { event: "unclaimed_product_created", product_id: id });
  await flushPostHogLogs();
  revalidatePath("/admin");
  redirect(`/claim/${claimCode}`); // the admin preview there has the link to copy
}

// Not signed up yet: remember the link for a day, then send them through login and onboarding.
// /auth/callback and saveProfile send them back to /claim/<code> afterwards.
export async function startClaim(code) {
  if (!CLAIM_CODE.test(code)) redirect("/login");
  (await cookies()).set(CLAIM_COOKIE, code, { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", path: "/" });
  redirect((await getUser()) ? "/onboarding" : "/login");
}

// Tapping Claim on /claim/<code>. Returns { error } or { ok, productId }; the button then opens the edit
// page. It goes live in the deck right away: claiming is the builder saying yes.
export async function claimProduct(code) {
  const { user, profile } = await requireProfile();
  (await cookies()).delete(CLAIM_COOKIE);
  const productId = CLAIM_CODE.test(code) ? await data.claimProduct(code, user.id) : null;
  if (!productId) return { error: "Someone already claimed this one, or the link changed. Ask whoever sent it to you." };

  const product = await data.getProductWithOwner(productId);
  if (product) {
    const props = await productPostedProps(product, profile, "claimed");
    after(() => captureServerEvent(user.id, "product_posted", props));
  }
  logPostHogAction("product claimed", { event: "product_claimed", product_id: productId });
  await flushPostHogLogs();
  revalidatePath("/products");
  revalidatePath("/admin");
  return { ok: true, productId };
}

export async function setProductHidden(productId, hidden) {
  await requireAdmin();
  await data.setProductHidden(productId, hidden);
  revalidatePath("/admin");
}

// Any product, including unclaimed claim-link ones.
export async function deleteProductAsAdmin(productId) {
  await requireAdmin();
  await data.deleteProduct(productId);
  logPostHogAction("product deleted", { event: "product_deleted", product_id: productId, by: "admin" });
  await flushPostHogLogs();
  revalidatePath("/admin");
  revalidatePath("/products");
  redirect("/admin"); // also used from an unclaimed product's edit page, which no longer exists
}

// --- Chat ---

// A pair's chat just opened, so both sides are connected. Fired once per chat, the first time it opens,
// from whichever path opened it. The admin dashboard counts these per week (lib/posthog-query.js).
// match_type: "product_request" (builder accepted a tester), "builder" (mutual swipe), "in_person" (QR/link).
function trackMatchOpened(userId, chatId, matchType) {
  return captureServerEvent(userId, "match_opened", { chat_id: chatId, match_type: matchType });
}

const hoursSince = (iso) => Math.round(((Date.now() - new Date(iso)) / 36e5) * 10) / 10; // one decimal

// The builder accepts or passes on one product request. Accepting opens the chat. Passing closes it
// only when nothing else keeps it open (another request, or a builder match).
export async function respondToRequest(requestId, accept) {
  const { user, profile } = await requireProfile();
  const request = await data.getProductRequest(requestId);
  if (!request || request.product.owner_id !== user.id || request.status !== "pending") return { error: "That request isn't waiting on you." };
  const chat = await data.getChat(request.chat_id, user.id);

  await data.setProductRequestStatus(requestId, accept ? "accepted" : "declined");
  if (accept && chat.status !== "open") {
    await data.setChatStatus(chat.id, "open");
    after(() => trackMatchOpened(user.id, chat.id, "product_request"));
  }
  if (!accept && chat.status === "pending" && !chat.requests.some((r) => r.id !== requestId && r.status !== "declined")) {
    await data.setChatStatus(chat.id, "declined");
  }

  const hoursWaiting = hoursSince(request.created_at);
  logPostHogAction("tester request answered", {
    event: "tester_request_answered",
    accepted: accept,
    chat_id: chat.id,
    request_id: requestId,
    product_id: request.product.id,
    hours_waiting: hoursWaiting,
  });
  await flushPostHogLogs();
  if (accept) {
    const [tester, chatUrl] = [await data.getProfile(request.tester_id), `${await appUrl()}/matches/${chat.id}`];
    after(() => sendChatAcceptedEmail({ requestId, product: request.product, builder: profile, tester, chatUrl }));
  }
  revalidatePath("/matches");
  revalidatePath(`/matches/${chat.id}`);
  return { ok: true, stats: { chat_id: chat.id, request_id: requestId, product_id: request.product.id, hours_waiting: hoursWaiting } };
}

// What every message analytics event carries, so PostHog can answer: how many matches start a chat,
// how many get a reply, who goes first, and how long after matching. Read before the insert updates the chat.
// Chats are per pair now, so there's no chat_type: product_request_count > 0 means a product brought them together.
function messageStats(chat, userId) {
  return {
    chat_id: chat.id,
    product_request_count: chat.requests.length,
    is_first_message: !chat.last_message_at, // this message starts the conversation (request lines don't count)
    is_reply: Boolean(chat.last_sender_id) && chat.last_sender_id !== userId, // answering the other person
    hours_since_match: hoursSince(chat.created_at),
  };
}

// Returns { error } or { message, stats }. Emails the other person only if this is the first message
// since they last opened the chat, so a burst of messages sends one email.
export async function sendMessage(chatId, text) {
  const { user, profile } = await requireProfile();
  const body = String(text ?? "").trim();
  if (!body) return { error: "Write something first." };
  if (body.length > MESSAGE_MAX) return { error: `Messages max out at ${MESSAGE_MAX} characters.` };

  const chat = await data.getChat(chatId, user.id);
  if (!chat) return { error: "That chat doesn't exist." };
  if (chat.status !== "open") return { error: chat.status === "pending" ? "The builder hasn't accepted yet." : "This chat is closed." };

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  if ((await data.countRecentMessages(user.id, tenMinAgo)) >= MAX_MESSAGES_PER_10_MIN) {
    // Our own limit, not an outage. Logged so we can see if it's set too low for real conversations.
    logPostHogAction("message rate limited", { event: "message_rate_limited", chat_id: chatId, limit: MAX_MESSAGES_PER_10_MIN });
    await flushPostHogLogs();
    return { error: "You're sending a lot of messages. Take a breather and try again in a few minutes." };
  }

  const stats = { ...messageStats(chat, user.id), message_length: body.length };
  const message = await data.insertMessage({ chat_id: chatId, sender_id: user.id, body });
  await data.touchChat(chatId, chat.me, "read"); // sending counts as reading

  const them = chat.me === "a" ? "b" : "a";
  const [readAt, notifiedAt] = [chat[`${them}_read_at`], chat[`${them}_notified_at`]];
  if (!notifiedAt || (readAt && readAt > notifiedAt)) {
    await data.touchChat(chatId, them, "notified");
    const [to, chatUrl] = [await data.getProfile(chat.them.id), `${await appUrl()}/matches/${chatId}`];
    after(() => sendNewMessageEmail({ messageId: message.id, to, from: profile, body, chatUrl }));
  }

  logPostHogAction("message sent", { event: "message_sent", ...stats });
  await flushPostHogLogs();
  return { message, stats };
}

// Called every few seconds by the open chat page. Returns messages newer than sinceIso, the chat status,
// and every product request (so request cards pick up an accept or pass), and marks the chat read.
export async function pollChat(chatId, sinceIso) {
  const { user } = await requireProfile();
  const chat = await data.getChat(chatId, user.id);
  if (!chat) return { error: "That chat doesn't exist." };
  const messages = await data.getMessages(chatId, sinceIso);
  if (messages.some((m) => m.sender_id !== user.id)) await data.touchChat(chatId, chat.me, "read");
  return { messages, status: chat.status, requests: chat.requests };
}

// Polled by the tab bar so the Matches badge and the browser tab title stay current between page loads.
// Returns null when signed out, so a tab left open after sign-out stops showing a count.
export async function pollUnread() {
  const user = await getUser();
  if (!user) return null;
  return data.countUnreadChats(user.id);
}
