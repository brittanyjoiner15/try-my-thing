import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { getChat, getMessages, touchChat } from "@/lib/data";
import { testerIntro, builderIntro } from "@/lib/intro";
import Avatar from "@/app/components/Avatar";
import ChatThread from "./ChatThread";
import RespondButtons from "../RespondButtons";

export default async function ChatPage({ params }) {
  const { chatId } = await params;
  const { user, profile } = await requireProfile();
  const chat = await getChat(chatId, user.id);
  if (!chat) notFound();

  const messages = await getMessages(chatId);
  await touchChat(chatId, chat.me, "read");

  const { them, product } = chat;
  const iAmBuilder = product?.owner_id === user.id;
  // Pre-write the first message for whoever usually starts: the tester, or either builder.
  const draft = messages.length > 0 || iAmBuilder ? "" : product ? testerIntro({ product, tester: profile }) : builderIntro({ me: profile });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/matches" className="text-sm text-muted underline">
        ← Matches
      </Link>
      <header className="flex items-center gap-3">
        <Avatar name={them.name} url={them.avatar_url} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{them.name}</h1>
          <p className="truncate text-sm text-muted">
            {product ? (iAmBuilder ? `wants to try ${product.name}` : `built ${product.name}`) : `${them.role} · builder match`}
          </p>
        </div>
        {product && (
          <a href={product.url} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-xs font-semibold text-accent underline">
            {product.name} ↗
          </a>
        )}
      </header>

      {chat.status === "pending" && iAmBuilder && (
        <div className="panel space-y-3 text-center">
          <p>
            {them.name.split(" ")[0]} is {/^[aeiou]/i.test(them.role) ? "an" : "a"} {them.role} using {them.stack}. Accept to start chatting.
          </p>
          <div className="flex justify-center">
            <RespondButtons chatId={chatId} />
          </div>
        </div>
      )}

      {/* key: remount when the builder accepts, so the message box shows without waiting for a poll. */}
      <ChatThread
        key={chat.status}
        chatId={chatId}
        meId={user.id}
        themName={them.name}
        initialMessages={messages}
        initialStatus={chat.status}
        iAmBuilder={iAmBuilder}
        draft={draft}
      />
    </div>
  );
}
