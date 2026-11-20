import Link from "next/link";
import { Geist } from "next/font/google";
import { getUser, isAdmin } from "@/lib/session";
import BottomNav from "@/app/components/BottomNav";
import { countUnreadChats } from "@/lib/data";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  // Makes the link preview image URL absolute. Netlify sets URL to the site's main address at build time.
  metadataBase: new URL(process.env.URL ?? "http://localhost:3000"),
  title: "Try my thing",
  description: "Builders find real testers. Testers find new tools first.",
  // Home Screen app on iOS: full screen, with this name under the icon. Matches app/manifest.js.
  appleWebApp: { capable: true, title: "try my thing", statusBarStyle: "default" },
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
  // Tab bar badge's starting value. BottomNav polls it after that (pollUnread in app/actions.js).
  const unread = user ? await countUnreadChats(user.id) : 0;

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="mx-auto w-full max-w-3xl px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            try my thing<span className="text-accent">.</span>
          </Link>
        </header>
        {/* Extra bottom padding when signed in keeps content clear of the fixed tab bar. */}
        <main className={`mx-auto w-full max-w-3xl flex-1 px-4 ${user ? "pb-32" : "pb-16"}`}>{children}</main>
        {user && <BottomNav showAdmin={isAdmin(user)} userId={user.id} userEmail={user.email} unread={unread} />}
      </body>
    </html>
  );
}
