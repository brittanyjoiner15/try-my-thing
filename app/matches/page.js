import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getChats } from "@/lib/data";
import Avatar from "@/app/components/Avatar";
import RespondButtons from "./RespondButtons";

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Every match is a chat. Three groups: testers asking to try my products, products I asked to try, and builder matches.
export default async function MatchesPage() {
  const { user } = await requireProfile();
  const chats = await getChats(user.id);
  const testers = chats.filter((c) => c.product?.owner_id === user.id && c.status !== "declined");
  const tried = chats.filter((c) => c.product && c.product.owner_id !== user.id);
  const builders = chats.filter((c) => !c.product);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">People who want to try your products</h1>
        <p className="mt-1 text-muted">Accept a tester to start chatting. Pass if it&apos;s not a fit.</p>
        <div className="mt-4 space-y-2">
          {testers.map((c) => (
            <ChatRow key={c.id} chat={c} subtitle={`→ ${c.product.name} · ${c.them.role} · ${c.them.stack}`}>
              {c.status === "pending" && <RespondButtons chatId={c.id} />}
            </ChatRow>
          ))}
          {testers.length === 0 && (
            <p className="text-muted">
              No testers yet. <Link href="/products" className="underline">Post a product</Link> to get some.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Products you want to try</h2>
        <p className="mt-1 text-muted">Once the builder accepts, ask them how to get access.</p>
        <div className="mt-4 space-y-2">
          {tried.map((c) => (
            <ChatRow key={c.id} chat={c} title={c.product.name} subtitle={`by ${c.them.name}`}>
              {c.status === "pending" && <span className="text-sm text-muted">Waiting to accept</span>}
              {c.status === "declined" && <span className="text-sm text-muted">Not taking testers</span>}
            </ChatRow>
          ))}
          {tried.length === 0 && (
            <p className="text-muted">
              Nothing yet. <Link href="/swipe" className="underline">Start swiping</Link>.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Builders you matched with</h2>
        <p className="mt-1 text-muted">You both swiped right. Say hi, swap feedback, or grab a coffee.</p>
        <div className="mt-4 space-y-2">
          {builders.map((c) => (
            <ChatRow key={c.id} chat={c} subtitle={[c.them.role, c.them.building, c.them.location].filter(Boolean).join(" · ")}>
              <span className="flex gap-3 text-sm">
                {c.them.github_url && (
                  <a href={c.them.github_url} target="_blank" rel="noreferrer" className="text-accent underline">
                    GitHub ↗
                  </a>
                )}
                {c.them.linkedin_url && (
                  <a href={c.them.linkedin_url} target="_blank" rel="noreferrer" className="text-accent underline">
                    LinkedIn ↗
                  </a>
                )}
              </span>
            </ChatRow>
          ))}
          {builders.length === 0 && (
            <p className="text-muted">
              No builder matches yet.{" "}
              <Link href="/swipe?mode=builders" className="underline">
                Meet some builders
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// One match. "Message" only shows once the chat is open (accepted, or a builder match).
function ChatRow({ chat, title = chat.them.name, subtitle, children }) {
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar name={chat.them.name} url={chat.them.avatar_url} />
        <div className="min-w-0">
          <p className="font-bold">
            {title}
            {chat.unread && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
          </p>
          <p className="text-sm text-muted">
            {subtitle} · {chat.last_message_at ? `last message ${day(chat.last_message_at)}` : `matched ${day(chat.created_at)}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {chat.status === "open" && (
          <Link href={`/matches/${chat.id}`} className="btn-primary text-sm">
            Message
          </Link>
        )}
      </div>
    </div>
  );
}
