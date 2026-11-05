"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import posthog from "posthog-js";
import { sendMessage, pollChat } from "@/app/actions";

const POLL_MS = 5000; // no realtime: the browser has no Supabase client, so we ask the server every few seconds
const MESSAGE_MAX = 2000; // same limit as app/actions.js

const time = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function ChatThread({ chatId, meId, themName, initialMessages, initialStatus, iAmBuilder, draft }) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [text, setText] = useState(draft);
  const [error, setError] = useState(null);
  const [sending, startSending] = useTransition();
  const bottom = useRef(null);
  const first = themName.split(" ")[0];

  // Keep the newest message in view.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    posthog.capture("chat_opened", { chat_id: chatId, status: initialStatus });
  }, [chatId, initialStatus]);

  // Poll for new messages while the tab is visible. Also picks up the builder accepting a pending chat.
  const latest = messages.at(-1)?.created_at ?? null;
  useEffect(() => {
    if (status === "declined") return;
    const tick = async () => {
      if (document.hidden) return;
      const result = await pollChat(chatId, latest);
      if (result?.error) return;
      setStatus(result.status);
      if (result.messages.length) setMessages((m) => merge(m, result.messages));
    };
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [chatId, latest, status]);

  function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setError(null);
    startSending(async () => {
      const result = await sendMessage(chatId, body);
      if (result?.error) return setError(result.error);
      posthog.capture("message_sent", { chat_id: chatId, was_draft: body === draft.trim() });
      setMessages((m) => merge(m, [result.message]));
      setText("");
    });
  }

  if (status === "declined") {
    return <p className="panel text-center text-muted">{iAmBuilder ? "You passed on this tester." : `${first} isn't taking more testers right now.`}</p>;
  }

  return (
    <div className="space-y-4">
      {/* ph-no-capture: message text stays out of session replays and autocapture. */}
      <ol className="ph-no-capture space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${
                  mine ? "bg-accent text-white" : "border border-border bg-card"
                }`}
              >
                {m.body}
              </p>
              <span className="mt-0.5 text-[11px] text-muted">{time(m.created_at)}</span>
            </li>
          );
        })}
        <li ref={bottom} />
      </ol>

      {messages.length === 0 && status === "open" && (
        <p className="text-center text-sm text-muted">No messages yet. {draft ? "We wrote a first one for you. Edit it or send it as is." : `Say hi to ${first}.`}</p>
      )}

      {status === "pending" ? (
        !iAmBuilder && <p className="panel text-center text-muted">Waiting for {first} to accept. We&apos;ll email you when they do.</p>
      ) : (
        <form onSubmit={send} className="sticky bottom-20 space-y-1 rounded-2xl bg-background pt-2">
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) send(e); // Shift+Enter for a new line
              }}
              maxLength={MESSAGE_MAX}
              rows={text.length > 80 ? 4 : 1}
              placeholder={`Message ${first}`}
              className="ph-no-capture input flex-1 resize-none"
            />
            <button className="btn-primary" disabled={sending || !text.trim()}>
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Adds new messages without duplicates (a poll can return a message we just sent).
function merge(current, incoming) {
  const seen = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !seen.has(m.id))];
}
