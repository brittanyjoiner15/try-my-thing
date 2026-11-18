"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import posthog from "posthog-js";
import { sendMessage, pollChat } from "@/app/actions";
import RespondButtons from "../RespondButtons";

const POLL_MS = 5000; // no realtime: the browser has no Supabase client, so we ask the server every few seconds
const MESSAGE_MAX = 2000; // same limit as app/actions.js
// After this many failed polls in a row, assume the app was redeployed: server action IDs change on every
// deploy, so a tab opened before it can't reach the new server until it reloads.
const FAILS_BEFORE_RELOAD = 3;

const time = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function ChatThread({ chatId, meId, themName, initialMessages, initialStatus, initialRequests, draft }) {
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [requests, setRequests] = useState(initialRequests);
  const [text, setText] = useState(draft);
  const [error, setError] = useState(null);
  const [fails, setFails] = useState(0); // failed polls in a row (Netlify, Supabase, the network, or a new deploy)
  const failing = useRef(false); // same thing, readable inside the interval without re-creating it
  const [sending, startSending] = useTransition();
  const bottom = useRef(null);
  const first = themName.split(" ")[0];
  const byId = new Map(requests.map((r) => [r.id, r]));
  const waitingOnMe = requests.some((r) => r.status === "pending" && r.product.owner_id === meId);

  // Keep the newest message in view.
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    posthog.capture("chat_opened", {
      chat_id: chatId,
      status: initialStatus,
      product_request_count: initialRequests.length,
      message_count: initialMessages.filter((m) => m.kind === "text").length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open, not every time a message arrives
  }, [chatId, initialStatus]);

  // Poll for new messages while the tab is visible. Also picks up accepted or passed requests.
  const latest = messages.at(-1)?.created_at ?? null;
  useEffect(() => {
    if (status === "declined") return;
    const tick = async () => {
      if (document.hidden) return;
      let result;
      try {
        result = await pollChat(chatId, latest);
      } catch (err) {
        // Report the first failure in a streak only. Otherwise an outage sends one error every 5s per open chat.
        if (!failing.current) posthog.captureException(err, { feature: "chat", action: "pollChat", chat_id: chatId });
        failing.current = true;
        setFails((n) => n + 1);
        return;
      }
      failing.current = false;
      setFails(0);
      if (result?.error) return;
      setStatus(result.status);
      setRequests(result.requests);
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
      let result;
      try {
        result = await sendMessage(chatId, body);
      } catch (err) {
        posthog.captureException(err, { feature: "chat", action: "sendMessage", chat_id: chatId });
        return setError("Couldn't send. Check your connection and try again.");
      }
      if (result?.error) return setError(result.error);
      // stats come from the server (first message? reply?). was_draft = sent the pre-written intro unedited.
      posthog.capture("message_sent", { ...result.stats, was_draft: Boolean(draft) && body === draft.trim() });
      setMessages((m) => merge(m, [result.message]));
      setText("");
    });
  }

  if (status === "declined") {
    const iAsked = requests.some((r) => r.tester_id === meId);
    return <p className="panel text-center text-muted">{iAsked ? `${first} isn't taking more testers right now.` : `You passed on ${first}'s request.`}</p>;
  }

  return (
    // pb-24: room at the end of the thread so the pinned message box doesn't cover the last message.
    <div className="space-y-4 pb-24">
      {fails > 0 && fails < FAILS_BEFORE_RELOAD && (
        <p className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">Can&apos;t reach the server. Retrying…</p>
      )}
      {fails >= FAILS_BEFORE_RELOAD && (
        <p className="flex items-center justify-between gap-3 rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
          Lost touch with the server. There may be a new version of the app.
          <button className="shrink-0 font-semibold underline" onClick={() => window.location.reload()}>
            Reload
          </button>
        </p>
      )}
      {/* ph-no-capture: message text stays out of session replays and autocapture. */}
      <ol className="ph-no-capture space-y-2">
        {messages.map((m) =>
          m.kind === "request" ? (
            <RequestLine key={m.id} message={m} request={byId.get(m.request_id)} meId={meId} first={first} />
          ) : (
            <TextMessage key={m.id} message={m} mine={m.sender_id === meId} />
          ),
        )}
        {/* scroll-mb: scrollIntoView stops above the pinned message box and tab bar, not behind them. */}
        <li ref={bottom} className="scroll-mb-40" />
      </ol>

      {status === "open" && !messages.some((m) => m.kind === "text") && (
        <p className="text-center text-sm text-muted">No messages yet. {draft ? "We wrote a first one for you. Edit it or send it as is." : `Say hi to ${first}.`}</p>
      )}

      {status === "pending" ? (
        <p className="panel text-center text-muted">
          {waitingOnMe ? "Accept a request above to start chatting." : `Waiting for ${first} to accept. We'll email you when they do.`}
        </p>
      ) : (
        // Pinned just above the tab bar (about 3.75rem tall, plus the iPhone home indicator area), even when the thread is short.
        // TODO: if the tab bar's height changes, update the 3.75rem here.
        <form
          onSubmit={send}
          className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md space-y-1 bg-background px-4 py-2"
        >
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

function TextMessage({ message, mine }) {
  return (
    <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <p
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 ${
          mine ? "bg-accent text-white" : "border border-border bg-card"
        }`}
      >
        {message.body}
      </p>
      <span className="mt-0.5 text-[11px] text-muted">{time(message.created_at)}</span>
    </li>
  );
}

// "Maya wants to try HogChat", centered in the thread. The builder answers it right here.
function RequestLine({ message, request, meId, first }) {
  const iAsked = message.sender_id === meId;
  const who = iAsked ? "You" : first;
  if (!request) {
    // Shouldn't happen (requests come with the chat), but don't break the thread if one is missing.
    return <li className="text-center text-xs text-muted">{who} {message.body}</li>;
  }
  const iOwn = request.product.owner_id === meId;
  return (
    <li className="flex flex-col items-center py-2">
      <div className="space-y-2 rounded-xl border border-dashed border-border px-4 py-3 text-center text-sm">
        <p>
          {who} {iAsked ? "want" : "wants"} to try{" "}
          <a href={request.product.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
            {request.product.name} ↗
          </a>
        </p>
        {request.status === "pending" && iOwn && <RespondButtons requestId={request.id} />}
        {request.status === "pending" && !iOwn && <p className="text-xs text-muted">Waiting for {first} to accept</p>}
        {request.status === "accepted" && <p className="text-xs text-muted">Accepted</p>}
        {request.status === "declined" && <p className="text-xs text-muted">{iOwn ? "You passed" : "Not taking testers right now"}</p>}
      </div>
      <span className="mt-0.5 text-[11px] text-muted">{time(message.created_at)}</span>
    </li>
  );
}

// Adds new messages without duplicates (a poll can return a message we just sent).
function merge(current, incoming) {
  const seen = new Set(current.map((m) => m.id));
  return [...current, ...incoming.filter((m) => !seen.has(m.id))];
}
