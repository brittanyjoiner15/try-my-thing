// Match notification emails, sent through Resend's HTTP API (the same Resend account that
// sends the Supabase magic links). Runs on the server only, from after() in app/actions.js,
// so a slow or failed send never holds up a swipe.
//
// Needs RESEND_API_KEY and MATCH_EMAIL_FROM. Without them nothing is sent: demo mode prints
// the emails to the server console, and real mode logs a warning.

import { DEMO } from "@/lib/demo";
import { logPostHogAction, flushPostHogLogs } from "@/lib/posthog-logs";

const first = (name) => (name ?? "").split(" ")[0];
const aOrAn = (word) => `${/^[aeiou]/i.test(word ?? "") ? "an" : "a"} ${word}`;
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

async function sendEmail({ to, subject, text, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MATCH_EMAIL_FROM;
  const message = { to, subject: oneLine(subject), text, replyTo };

  if (DEMO || !apiKey || !from) {
    if (DEMO) console.info("[match email, not sent in demo mode]", message);
    else console.warn("Match email skipped: set RESEND_API_KEY and MATCH_EMAIL_FROM to send it.");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: message.subject, text, reply_to: replyTo }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

// Sends every email, and logs any that fail without throwing.
async function sendAll(emails, matchType) {
  const results = await Promise.allSettled(emails.map(sendEmail));
  const failed = results.filter((r) => r.status === "rejected");
  for (const f of failed) {
    console.error("Match email failed:", f.reason);
    logPostHogAction("match email failed", { event: "match_email_failed", match_type: matchType, error: String(f.reason) });
  }
  if (failed.length) await flushPostHogLogs();
}

// A tester swiped right on a product. Both the builder and the tester hear about it.
export function sendProductMatchEmails({ product, builder, tester, appUrl }) {
  const matches = `${appUrl}/matches`;
  return sendAll(
    [
      {
        to: builder.email,
        replyTo: tester.email,
        subject: `${tester.name} wants to try ${product.name}`,
        text: `Hi ${first(builder.name)},

${tester.name} swiped right on ${product.name} on try my thing. They're ${aOrAn(tester.role)} using ${tester.stack}.

Their email is ${tester.email}. They'll usually write to you first, but you can reply to this email to reach them.

All your testers: ${matches}

try my thing`,
      },
      {
        to: tester.email,
        replyTo: builder.email,
        subject: `You matched with ${product.name}`,
        text: `Hi ${first(tester.name)},

You swiped right on ${product.name}. ${builder.name} built it and wants feedback${product.feedback_on ? `, especially on ${product.feedback_on}` : ""}.

Email ${first(builder.name)} at ${builder.email} to get access, or reply to this email. There's a pre-written intro on your matches page: ${matches}

try my thing`,
      },
    ],
    "product",
  );
}

// Two builders swiped right on each other. Each one gets the other's details.
export function sendBuilderMatchEmails({ a, b, appUrl }) {
  const matches = `${appUrl}/matches`;
  const note = (me, them) => ({
    to: me.email,
    replyTo: them.email,
    subject: `You and ${first(them.name)} matched on try my thing`,
    text: `Hi ${first(me.name)},

You and ${them.name} both swiped right. They're ${aOrAn(them.role)}${them.building ? ` building ${them.building}` : ""}${them.location ? `, based in ${them.location}` : ""}.

Their email is ${them.email}. Reply to this email to say hi, or use the pre-written intro on your matches page: ${matches}

try my thing`,
  });
  return sendAll([note(a, b), note(b, a)], "builder");
}
