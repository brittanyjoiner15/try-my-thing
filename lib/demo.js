// Demo mode: no Supabase keys → the app runs on fake in-memory data, logged in as a demo user.
export const DEMO = !process.env.NEXT_PUBLIC_SUPABASE_URL;

export const DEMO_USER = { id: "demo-you", email: "you@example.com" };
