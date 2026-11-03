import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { DEMO, DEMO_USER } from "@/lib/demo";
import { getProfile } from "@/lib/data";

export async function getUser() {
  if (DEMO) return DEMO_USER;
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function isAdmin(user) {
  if (DEMO) return true;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase());
  return Boolean(user?.email) && admins.includes(user.email.toLowerCase());
}

// Use at the top of any page or action that needs a signed-in user who finished onboarding.
export async function requireProfile() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  return { user, profile };
}

export async function requireAdmin() {
  const user = await getUser();
  if (!isAdmin(user)) redirect("/");
  return user;
}
