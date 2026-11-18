import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getChats } from "@/lib/data";
import { pairSummary } from "@/lib/chat-summary";
import Avatar from "@/app/components/Avatar";
import RespondButtons from "./RespondButtons";

// Brand marks from Simple Icons (CC0). Filled, so they use the text color.
const BRAND_PATHS = {
  GitHub:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  LinkedIn:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 4.892v6.249zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
};

// Icon-only link; aria-label keeps it readable for screen readers, title gives a hover tooltip.
function BrandLink({ href, name }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={name} title={name} className="btn-ghost px-2.5!">
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d={BRAND_PATHS[name]} />
      </svg>
    </a>
  );
}

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const lastActive = (c) => c.last_message_at ?? c.created_at;

// One row per person: every product request and builder match between two people lives in one chat.
// "Waiting on you" = someone asked to try one of my products and I haven't answered.
export default async function MatchesPage() {
  const { user } = await requireProfile();
  const chats = (await getChats(user.id)).sort((a, b) => lastActive(b).localeCompare(lastActive(a)));
  const waiting = chats.filter((c) => c.waitingOnMe.length > 0);
  // A declined chat only shows to the tester ("not taking testers"). The builder who passed doesn't need it.
  const rest = chats.filter(
    (c) => c.waitingOnMe.length === 0 && (c.status !== "declined" || c.requests.some((r) => r.tester_id === user.id)),
  );

  return (
    <div className="space-y-10">
      {waiting.length > 0 && (
        <section>
          <h1 className="text-2xl font-bold">Waiting on you</h1>
          <p className="mt-1 text-muted">They want to try your products. Accept to start chatting, or pass if it&apos;s not a fit.</p>
          <div className="mt-4 space-y-2">
            {waiting.map((c) => (
              <ChatRow key={c.id} chat={c} meId={user.id}>
                <ul className="w-full space-y-2 border-t border-border pt-3">
                  {c.waitingOnMe.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        Wants to try <span className="font-semibold">{r.product.name}</span>
                      </span>
                      <RespondButtons requestId={r.id} />
                    </li>
                  ))}
                </ul>
              </ChatRow>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-bold">Your matches</h2>
        <p className="mt-1 text-muted">Testers, builders, and products you asked to try. One chat per person.</p>
        <div className="mt-4 space-y-2">
          {rest.map((c) => (
            <ChatRow key={c.id} chat={c} meId={user.id} />
          ))}
          {rest.length === 0 && (
            <p className="text-muted">
              No matches yet. <Link href="/swipe" className="underline">Start swiping</Link>, or{" "}
              <Link href="/products" className="underline">post a product</Link> to get testers.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// One person. "Open chat" shows once the chat is open (an accepted request, a builder match, or an in-person connect).
function ChatRow({ chat, meId, children }) {
  const { them } = chat;
  return (
    <div className={`panel flex flex-wrap items-center justify-between gap-4 py-4 ${chat.unread ? "ring-2 ring-accent" : ""}`}>
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={them.name} url={them.avatar_url} />
        <div className="min-w-0">
          <p className="font-bold">
            {them.name}
          </p>
          <p className="text-sm text-muted">
            {pairSummary(chat, meId)} · {chat.last_message_at ? `last message ${day(chat.last_message_at)}` : `matched ${day(chat.created_at)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {chat.status === "open" && (
          <>
            {them.github_url && <BrandLink href={them.github_url} name="GitHub" />}
            {them.linkedin_url && <BrandLink href={them.linkedin_url} name="LinkedIn" />}
          </>
        )}
        {chat.status === "pending" && chat.waitingOnMe.length === 0 && <span className="text-sm text-muted">Waiting to accept</span>}
        {chat.status === "declined" && <span className="text-sm text-muted">Not taking testers</span>}
        {chat.status === "open" && (
          // "Open chat", not "Message": it's where you read the conversation too, not only where you start one.
          <Link href={`/matches/${chat.id}`} className="btn-primary relative text-sm">
            {chat.unread ? "Read new message" : "Open chat"}
            {chat.unread && (
              <span className="absolute -top-2 -right-2 rounded-full bg-foreground px-1.5 text-[10px] leading-4 font-bold text-card">New</span>
            )}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
