import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getChats } from "@/lib/data";
import { pairSummary } from "@/lib/chat-summary";
import Avatar from "@/app/components/Avatar";
import RespondButtons from "./RespondButtons";

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

// One person. "Message" shows once the chat is open (an accepted request, a builder match, or an in-person connect).
function ChatRow({ chat, meId, children }) {
  const { them } = chat;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={them.name} url={them.avatar_url} />
        <div className="min-w-0">
          <p className="font-bold">
            {them.name}
            {chat.unread && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
          </p>
          <p className="text-sm text-muted">
            {pairSummary(chat, meId)} · {chat.last_message_at ? `last message ${day(chat.last_message_at)}` : `matched ${day(chat.created_at)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {chat.status === "open" && (
          <>
            {them.github_url && (
              <a href={them.github_url} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
                GitHub
              </a>
            )}
            {them.linkedin_url && (
              <a href={them.linkedin_url} target="_blank" rel="noreferrer" className="btn-ghost text-sm">
                LinkedIn
              </a>
            )}
          </>
        )}
        {chat.status === "pending" && chat.waitingOnMe.length === 0 && <span className="text-sm text-muted">Waiting to accept</span>}
        {chat.status === "declined" && <span className="text-sm text-muted">Not taking testers</span>}
        {chat.status === "open" && (
          <Link href={`/matches/${chat.id}`} className="btn-primary text-sm">
            Message
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
