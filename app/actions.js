"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuthClient } from "@/lib/supabase/server";
import { DEMO_ENV, DEMO_GITHUB, GITHUB_LINK_COOKIE, isDemo } from "@/lib/demo";
import { getUser, requireProfile, requireAdmin } from "@/lib/session";
import * as data from "@/lib/data";
import { PLATFORMS, PROMPTS, PROMPT_SLOTS, ANSWER_MAX, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";
import { ROLES, TOPICS, LOOKING_FOR, TOPICS_MAX, BUILDING_MAX } from "@/lib/profile-options";
import { geocode } from "@/lib/geocode";
import { fetchGitHubProfile } from "@/lib/github";
import { captureServerError } from "@/lib/posthog-server";
import { flushPostHogLogs, logPostHogAction } from "@/lib/posthog-logs";
import { sendProductMatchEmails, sendBuilderMatchEmails, sendChatAcceptedEmail, sendNewMessageEmail } from "@/lib/match-emails";

// Keeps testers from right-swiping everything and flooding builders with no-shows.
const MAX_RIGHT_SWIPES_PER_WEEK = 3;
// Chat limits. Generous for a real conversation, low enough to stop a script.
const MESSAGE_MAX = 2000; // also a check constraint in the chats migration
const MAX_MESSAGES_PER_10_MIN = 30;

// Base URL for links in emails. Netlify sets URL to the site's main address.
async function appUrl() {
  return (await headers()).get("origin") ?? process.env.URL ?? "http://localhost:3000";
}

// Server logs carry is_demo so /demo visitors can be filtered out of (or into) the real numbers.
async function logAction(body, attributes) {
  logPostHogAction(body, { ...attributes, is_demo: await isDemo() });
}

// Match and message emails. /demo people have fake addresses, so nothing is sent for them.
// Local demo (no keys) still runs it, and lib/match-emails.js prints the email to the console instead.
async function emailAfterResponse(send) {
  if (DEMO_ENV || !(await isDemo())) after(send);
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

// "Continue with GitHub" on /login. New and returning users both come back through /auth/callback.
export async function signInWithGitHub() {
  if (await isDemo()) redirect("/swipe");
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
  if (await isDemo()) {
    await data.saveGitHubProfile({ id: user.id, ...DEMO_GITHUB, fetched_at: new Date().toISOString() });
    redirect("/profile?github=connected");
  }

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
  if (await isDemo()) redirect("/profile?github=refreshed"); // demo GitHub data never changes
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
  if (!(await isDemo())) {
    const supabase = await createAuthClient();
    const { data: ids } = await supabase.auth.getUserIdentities();
    const github = ids?.identities?.find((i) => i.provider === "github");
    if (github && ids.identities.length > 1) {
      const { error } = await supabase.auth.unlinkIdentity(github);
      if (error) redirect("/profile?github=error");
    }
  }
  await data.deleteGitHubProfile(user.id);
  revalidatePath("/profile");
  redirect("/profile");
}

export async function signOut() {
  if (!DEMO_ENV) {
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
  await logAction("profile saved", {
    event: "profile_saved",
    profile_state: existing ? "updated" : "created",
    role: profileRole,
  });
  await flushPostHogLogs();

  if (existing) {
    revalidatePath("/profile");
    redirect("/profile?saved=1");
  }
  redirect("/welcome"); // first save: show the short how-it-works screen once
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

export async function createProduct(formData) {
  const { user } = await requireProfile();
  const id = crypto.randomUUID(); // made here so images can be stored under the product's id
  await data.createProduct({
    id,
    owner_id: user.id,
    ...productFields(formData),
    ...(await productImages(formData, id)),
  });
  await logAction("product created", { event: "product_created" });
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

// Returns { error } or { ok, match }. A right swipe opens a pending chat that the builder has to
// accept, and both sides get an email (sent after the response).
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

  await logAction("product swipe recorded", {
    event: "product_swipe_recorded",
    direction,
  });
  await flushPostHogLogs();
  revalidatePath("/matches");
  if (direction === "left") return { ok: true };

  // The chat starts pending: the tester can't message until the builder accepts.
  const chat = await data.createChat({ user_a: user.id, user_b: product.owner_id, product_id: productId, status: "pending" });
  const chatUrl = `${await appUrl()}/matches/${chat.id}`;
  await emailAfterResponse(() => sendProductMatchEmails({ product, builder: product.owner, tester: profile, chatUrl }));
  return { ok: true, match: { product: product.name, builderName: product.owner.name, chatId: chat.id } };
}

// One-click opt-in from the Builders tab, for people who filled in builder fields but missed the checkbox.
export async function enableBuilderMatching() {
  const { profile } = await requireProfile();
  await data.saveProfile({ ...profile, open_to_builders: true });
  redirect("/swipe?mode=builders");
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

  // user_a is the lower id, so both people's swipes find the same chat.
  const [user_a, user_b] = [user.id, builderId].sort();
  const chat = await data.createChat({ user_a, user_b, status: "open" });
  revalidatePath("/matches");
  const chatUrl = `${await appUrl()}/matches/${chat.id}`;
  await emailAfterResponse(() => sendBuilderMatchEmails({ a: profile, b: other, chatUrl }));
  return { ok: true, match: { name: other.name, chatId: chat.id } };
}

export async function setProductHidden(productId, hidden) {
  await requireAdmin();
  await data.setProductHidden(productId, hidden);
  revalidatePath("/admin");
}

// --- Chat ---

const hoursSince = (iso) => Math.round(((Date.now() - new Date(iso)) / 36e5) * 10) / 10; // one decimal

// The builder accepts (opens the chat) or declines a tester's request.
export async function respondToTester(chatId, accept) {
  const { user, profile } = await requireProfile();
  const chat = await data.getChat(chatId, user.id);
  if (!chat?.product || chat.product.owner_id !== user.id || chat.status !== "pending") return { error: "That request isn't waiting on you." };

  await data.setChatStatus(chatId, accept ? "open" : "declined");
  const hoursWaiting = hoursSince(chat.created_at);
  await logAction("tester request answered", {
    event: "tester_request_answered",
    accepted: accept,
    chat_id: chatId,
    product_id: chat.product.id,
    hours_waiting: hoursWaiting,
  });
  await flushPostHogLogs();
  if (accept) {
    const [tester, chatUrl] = [await data.getProfile(chat.user_a), `${await appUrl()}/matches/${chatId}`];
    await emailAfterResponse(() => sendChatAcceptedEmail({ product: chat.product, builder: profile, tester, chatUrl }));
  }
  revalidatePath("/matches");
  revalidatePath(`/matches/${chatId}`);
  return { ok: true, stats: { product_id: chat.product.id, hours_waiting: hoursWaiting } };
}

// What every message analytics event carries, so PostHog can answer: how many matches start a chat,
// how many get a reply, who goes first, and how long after matching. Read before the insert updates the chat.
function messageStats(chat, userId) {
  return {
    chat_id: chat.id,
    chat_type: chat.product ? "product" : "builder",
    sender_side: !chat.product ? "builder_match" : chat.product.owner_id === userId ? "builder" : "tester",
    is_first_message: !chat.last_message_at, // this message starts the conversation
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
    await logAction("message rate limited", { event: "message_rate_limited", chat_id: chatId, limit: MAX_MESSAGES_PER_10_MIN });
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
    await emailAfterResponse(() => sendNewMessageEmail({ to, from: profile, body, chatUrl }));
  }

  await logAction("message sent", { event: "message_sent", ...stats });
  await flushPostHogLogs();
  return { message, stats };
}

// Called every few seconds by the open chat page. Returns messages newer than sinceIso and marks the chat read.
export async function pollChat(chatId, sinceIso) {
  const { user } = await requireProfile();
  const chat = await data.getChat(chatId, user.id);
  if (!chat) return { error: "That chat doesn't exist." };
  const messages = await data.getMessages(chatId, sinceIso);
  if (messages.some((m) => m.sender_id !== user.id)) await data.touchChat(chatId, chat.me, "read");
  return { messages, status: chat.status };
}
