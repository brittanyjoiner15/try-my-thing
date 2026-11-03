import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

// The magic link lands here. Swap the one-time code for a login session.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/swipe`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
