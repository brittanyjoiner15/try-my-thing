import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

// "Exit demo" posts here as a plain form, not a server action: a server action's redirect keeps the
// root layout, so the demo banner and tab bar would stay on screen. This makes a full page load instead.
// The visitor's fake data is dropped from memory later; a real login (if any) takes over again.
export async function POST(request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
