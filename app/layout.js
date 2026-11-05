import Link from "next/link";
import { Geist } from "next/font/google";
import { getUser, isAdmin } from "@/lib/session";
import BottomNav from "@/app/components/BottomNav";
import { DEMO } from "@/lib/demo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata = {
  title: "Try my thing",
  description: "Builders find real testers. Testers find new tools first. From the PostHog community.",
};

// Lets the tab bar sit above the iPhone home indicator (see safe-area padding in BottomNav).
export const viewport = { viewportFit: "cover" };

export default async function RootLayout({ children }) {
  const user = await getUser();

  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {DEMO && (
          <div className="bg-accent px-4 py-2 text-center text-sm font-semibold text-white">
            Demo mode: fake data, you&apos;re signed in as &quot;Demo You&quot;. Resets when the server restarts.
          </div>
        )}
        <header className="mx-auto w-full max-w-3xl px-4 py-4">
          <Link href="/" className="text-lg font-bold">
            try my thing<span className="text-accent">.</span>
          </Link>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16">{children}</main>
        {/* Bottom padding keeps the footer clear of the fixed tab bar. */}
        <footer className={`py-6 text-center text-xs text-muted ${user ? "pb-24" : ""}`}>from the PostHog community</footer>
        {user && <BottomNav showAdmin={isAdmin(user)} />}
      </body>
    </html>
  );
}
