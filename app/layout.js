import Link from "next/link";
import { Geist } from "next/font/google";
import { getUser, isAdmin } from "@/lib/session";
import BottomNav from "@/app/components/BottomNav";
import { DEMO_ENV, isDemo } from "@/lib/demo";
import { countUnreadChats } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  // Makes the link preview image URL absolute. Netlify sets URL to the site's main address at build time.
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: "Try my thing",
  description: "Builders find real testers. Testers find new tools first.",
};

// viewportFit lets the tab bar sit above the iPhone home indicator (see safe-area padding in BottomNav).
// themeColor tints the browser bar to match the page background.
export const viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#15161a" },
  ],
};

export default async function RootLayout({ children }) {
  const user = await getUser();
  const demo = await isDemo();
  // Tab bar badge. Updates on page loads and server actions, not live. TODO: poll it if people miss messages.
  const unread = user ? await countUnreadChats(user.id) : 0;

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {demo && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-accent px-4 py-2 text-center text-sm font-semibold text-white">
            <span>Demo: fake people and products. Nothing you do here is real or sent to anyone.</span>
            {/* Local demo (no Supabase keys) has nothing to exit to. */}
            {!DEMO_ENV && (
              <form action="/demo/exit" method="post" data-posthog-exit-demo>
                <button className="rounded-full bg-white/20 px-3 py-0.5 hover:bg-white/30">Exit demo</button>
              </form>
            )}
          </div>
        )}
        <header className="mx-auto w-full max-w-3xl px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            try my thing<span className="text-accent">.</span>
          </Link>
        </header>
        {/* Extra bottom padding when signed in keeps content clear of the fixed tab bar. */}
        <main className={`mx-auto w-full max-w-3xl flex-1 px-4 ${user ? "pb-32" : "pb-16"}`}>{children}</main>
        {user && <BottomNav showAdmin={isAdmin(user)} userId={user.id} userEmail={user.email} unread={unread} demo={demo} />}
      </body>
    </html>
  );
}
