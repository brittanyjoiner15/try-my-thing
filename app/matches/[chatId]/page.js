import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { getChat, getMessages, touchChat } from "@/lib/data";
import { testerIntro, builderIntro } from "@/lib/intro";
import { pairSummary } from "@/lib/chat-summary";
import Avatar from "@/app/components/Avatar";
import ChatThread from "./ChatThread";

// One chat per pair of people. Product requests show as lines in the thread, with Accept / Pass for the builder.
export default async function ChatPage({ params }) {
  const { chatId } = await params;
  const { user, profile } = await requireProfile();
  const chat = await getChat(chatId, user.id);
  if (!chat) notFound();

  const messages = await getMessages(chatId);
  await touchChat(chatId, chat.me, "read");

  // Pre-write the first message for whoever usually starts: a tester (about the first product they asked for),
  // or either person when there's no product in the picture. A builder answering a request writes their own.
  const typed = messages.some((m) => m.kind === "text");
  const myRequest = chat.requests.find((r) => r.tester_id === user.id && r.status !== "declined");
  const draft = typed ? "" : myRequest ? testerIntro({ product: myRequest.product, tester: profile }) : chat.requests.length ? "" : builderIntro({ me: profile });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href="/matches" className="text-sm text-muted underline">
        ← Matches
      </Link>
      <header className="flex items-center gap-3">
        <Link href={`/matches/${chatId}/profile`} aria-label={`${chat.them.name}'s profile`} className="shrink-0">
          <Avatar name={chat.them.name} url={chat.them.avatar_url} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">
            <Link href={`/matches/${chatId}/profile`} className="hover:underline">
              {chat.them.name}
            </Link>
          </h1>
          <p className="truncate text-sm text-muted">{pairSummary(chat, user.id)}</p>
        </div>
      </header>

      {/* key: remount when the chat opens or a request is answered, so the message box and request lines
          update without waiting for a poll. */}
      <ChatThread
        key={`${chat.status}-${chat.requests.map((r) => r.status).join()}`}
        chatId={chatId}
        meId={user.id}
        themName={chat.them.name}
        initialMessages={messages}
        initialStatus={chat.status}
        initialRequests={chat.requests}
        draft={draft}
      />
    </div>
  );
}
