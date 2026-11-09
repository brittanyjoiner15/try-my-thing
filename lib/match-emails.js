// Match and chat notification emails, sent through Resend's HTTP API (the same Resend account that
// sends the Supabase magic links). Runs on the server only, from after() in app/actions.js,
// so a slow or failed send never holds up a swipe.
//
// Needs RESEND_API_KEY and MATCH_EMAIL_FROM. Without them nothing is sent: demo mode prints
// the emails to the server console, and real mode logs a warning.

import { DEMO_ENV } from "@/lib/demo";
import { logPostHogAction, flushPostHogLogs } from "@/lib/posthog-logs";
import { captureServerError } from "@/lib/posthog-server";

const first = (name) => (name ?? "").split(" ")[0];
const aOrAn = (word) => `${/^[aeiou]/i.test(word ?? "") ? "an" : "a"} ${word}`;
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

// No Reply-To: matches talk in the app, so nobody's email address goes to the other person.
async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MATCH_EMAIL_FROM;
  const message = { to, subject: oneLine(subject), text };

  if (DEMO_ENV || !apiKey || !from) {
    if (DEMO_ENV) console.info("[match email, not sent in demo mode]", message);
    else console.warn("Match email skipped: set RESEND_API_KEY and MATCH_EMAIL_FROM to send it.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: message.subject, text }),
  });
  if (!res.ok) {
    const error = new Error(`Resend ${res.status}: ${await res.text()}`);
    error.status = res.status; // 429 = Resend rate limit or daily/monthly quota
    throw error;
  }
}

// Sends every email, and logs any that fail without throwing.
async function sendAll(emails, matchType) {
  const results = await Promise.allSettled(emails.map(sendEmail));
  const failed = results.filter((r) => r.status === "rejected");
  for (const f of failed) {
    console.error("Match email failed:", f.reason);
    logPostHogAction("match email failed", { event: "match_email_failed", match_type: matchType, error: String(f.reason) });
    // These run in after(), so onRequestError never sees them. Report them to Error tracking here.
    await captureServerError(f.reason, {
      feature: "email",
      match_type: matchType,
      status: f.reason?.status,
      limit: f.reason?.status === 429 ? "resend" : undefined,
    });
  }
  if (failed.length) await flushPostHogLogs();
}

// A tester swiped right on a product. The builder decides whether to chat; the tester waits.
export function sendProductMatchEmails({ product, builder, tester, chatUrl }) {
  return sendAll(
    [
      {
        to: builder.email,
        subject: `${tester.name} wants to try ${product.name}`,
        text: `Hi ${first(builder.name)},

${tester.name} swiped right on ${product.name} on try my thing. They're ${aOrAn(tester.role)} using ${tester.stack}.

Accept to start chatting with them: ${chatUrl}

try my thing`,
      },
      {
        to: tester.email,
        subject: `You asked to try ${product.name}`,
        text: `Hi ${first(tester.name)},

You swiped right on ${product.name}. We've let ${first(builder.name)} know. When they accept, we'll email you and the chat opens: ${chatUrl}

try my thing`,
      },
    ],
    "product",
  );
}

// The builder accepted a tester, so the chat is open.
export function sendChatAcceptedEmail({ product, builder, tester, chatUrl }) {
  return sendAll(
    [
      {
        to: tester.email,
        subject: `${first(builder.name)} accepted you for ${product.name}`,
        text: `Hi ${first(tester.name)},

${builder.name} wants you to try ${product.name}. Say hi and ask how to get access: ${chatUrl}

try my thing`,
      },
    ],
    "accepted",
  );
}

// Two builders swiped right on each other. The chat is open for both.
export function sendBuilderMatchEmails({ a, b, chatUrl }) {
  const note = (me, them) => ({
    to: me.email,
    subject: `You and ${first(them.name)} matched on try my thing`,
    text: `Hi ${first(me.name)},

You and ${them.name} both swiped right. They're ${aOrAn(them.role)}${them.building ? ` building ${them.building}` : ""}${them.location ? `, based in ${them.location}` : ""}.

Say hi: ${chatUrl}

try my thing`,
  });
  return sendAll([note(a, b), note(b, a)], "builder");
}

// Someone opened your in-person link or QR code and tapped Connect. Only you get an email:
// they're already looking at the chat.
export function sendInPersonConnectEmail({ to, from, chatUrl }) {
  return sendAll(
    [
      {
        to: to.email,
        subject: `${first(from.name)} connected with you on try my thing`,
        text: `Hi ${first(to.name)},

${from.name} used your QR code or link to connect. They're ${aOrAn(from.role)}${from.building ? ` building ${from.building}` : ""}${from.location ? `, based in ${from.location}` : ""}.

Say hi: ${chatUrl}

try my thing`,
      },
    ],
    "in_person",
  );
}

// Someone sent a message while the other person wasn't looking. Sent once per unread stretch (see app/actions.js).
export function sendNewMessageEmail({ to, from, body, chatUrl }) {
  return sendAll(
    [
      {
        to: to.email,
        subject: `New message from ${first(from.name)} on try my thing`,
        text: `Hi ${first(to.name)},

${from.name} wrote:

${body}

Reply here: ${chatUrl}

try my thing`,
      },
    ],
    "message",
  );
}
