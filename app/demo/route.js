import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

// /demo: try the app without an account. Gives this browser its own fake data (see lib/demo.js)
// and drops it on the swipe deck. A real login stays untouched; "Exit demo" switches back to it.
export async function GET(request) {
  const response = NextResponse.redirect(new URL("/swipe", request.url));
  if (!request.cookies.has(DEMO_COOKIE)) {
    response.cookies.set(DEMO_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // a day. The fake data rarely lives that long anyway.
    });
  }
  return response;
}
