// Match and chat notification emails, sent as PostHog transactional emails. The copy and design live in
// PostHog (Workflows → Transactional), one template per email below; this file only picks the template
// and passes its {{ variables.* }}. Runs on the server only, from after() in app/actions.js, so a slow
// or failed send never holds up a swipe. Supabase magic links still go through Resend SMTP.
//
// Needs POSTHOG_SECRET_KEY (project secret API key, Transactional email: Write). Without it nothing is
// sent: demo mode prints the emails to the server console, and real mode logs a warning.

import { DEMO_ENV } from "@/lib/demo";
import { logPostHogAction, flushPostHogLogs } from "@/lib/posthog-logs";
import { captureServerError, emailClient } from "@/lib/posthog-server";

// Transactional template IDs in the Try My Thing PostHog project (dev and prod share it).
// Renaming a variable here means renaming it in the template too.
const TEMPLATES = {
  productRequest: "01a1f10a-d068-0000-a4e8-749590001913", // builder: someone wants to try your product
  productRequestSent: "01a1f10b-21dc-0000-3437-127e6ec005a8", // tester: we told the builder
  chatAccepted: "01a1f10a-6366-0000-8429-6350f6466e5a", // tester: the builder accepted you
  builderMatch: "01a1f10b-6cd9-0000-400c-4b88f9132e24", // two builders swiped right on each other
  inPersonConnect: "01a1f10b-c04c-0000-21e8-889d901f4e1a", // someone used your QR code or link
  newMessage: "01a1f10c-07f6-0000-7445-60c65e75cf48", // someone messaged you (Protect sensitive data is on: it carries the message)
};

const first = (name) => (name ?? "").split(" ")[0];
const aOrAn = (word) => `${/^[aeiou]/i.test(word ?? "") ? "an" : "a"} ${word}`;
// "a designer building HogChat, based in Austin" — the bits we know about someone, for one sentence.
const blurb = (p) => `${aOrAn(p.role)}${p.building ? ` building ${p.building}` : ""}${p.location ? `, based in ${p.location}` : ""}`;

// No reply-to on the templates: matches talk in the app, so nobody's email address goes to the other person.
// idempotencyKey says what the email is for, so a retry within 24 hours never sends it twice.
async function sendEmail({ template, to, data, idempotencyKey }) {
  const message = { template, to: to.email, data };

  if (DEMO_ENV || !emailClient) {
    if (DEMO_ENV) console.info("[match email, not sent in demo mode]", message);
    else console.warn("Match email skipped: set POSTHOG_SECRET_KEY to send it.");
    return;
  }

  const { error } = await emailClient.emails.send({
    to: to.email,
    templateId: TEMPLATES[template],
    templateData: { recipient_first_name: first(to.name), ...data },
    distinctId: to.id, // same distinct ID as their browser events (BottomNav identify), so sends land on their person
    idempotencyKey,
  });
  if (error) {
    error.template = template;
    throw error; // EmailError: error.code is e.g. recipient_suppressed, quota_limited, rate_limited
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
      template: f.reason?.template,
      code: f.reason?.code,
      limit: ["quota_limited", "rate_limited"].includes(f.reason?.code) ? "posthog_email" : undefined,
    });
  }
  if (failed.length) await flushPostHogLogs();
}

// A tester swiped right on a product. The builder decides whether to chat; the tester waits.
// alreadyChatting: the pair's chat was already open, so the request was accepted right away. Only the
// builder hears about it, and there's nothing to accept.
export function sendProductMatchEmails({ requestId, product, builder, tester, chatUrl, alreadyChatting = false }) {
  const toBuilder = {
    template: "productRequest",
    to: builder,
    data: {
      tester_name: tester.name,
      tester_blurb: `${aOrAn(tester.role)} using ${tester.stack}`,
      product_name: product.name,
      already_chatting: alreadyChatting,
      chat_url: chatUrl,
    },
    idempotencyKey: `product-request:${requestId}:builder`,
  };
  if (alreadyChatting) return sendAll([toBuilder], "product");

  const toTester = {
    template: "productRequestSent",
    to: tester,
    data: { builder_first_name: first(builder.name), product_name: product.name, chat_url: chatUrl },
    idempotencyKey: `product-request:${requestId}:tester`,
  };
  return sendAll([toBuilder, toTester], "product");
}

// The builder accepted a tester, so the chat is open.
export function sendChatAcceptedEmail({ requestId, product, builder, tester, chatUrl }) {
  return sendAll(
    [
      {
        template: "chatAccepted",
        to: tester,
        data: { builder_name: builder.name, builder_first_name: first(builder.name), product_name: product.name, chat_url: chatUrl },
        idempotencyKey: `chat-accepted:${requestId}`,
      },
    ],
    "accepted",
  );
}

// Two builders swiped right on each other. The chat is open for both.
export function sendBuilderMatchEmails({ chatId, a, b, chatUrl }) {
  const note = (me, them) => ({
    template: "builderMatch",
    to: me,
    data: { match_name: them.name, match_first_name: first(them.name), match_blurb: blurb(them), chat_url: chatUrl },
    idempotencyKey: `builder-match:${chatId}:${me.id}`,
  });
  return sendAll([note(a, b), note(b, a)], "builder");
}

// Someone opened your in-person link or QR code and tapped Connect. Only you get an email:
// they're already looking at the chat.
export function sendInPersonConnectEmail({ chatId, to, from, chatUrl }) {
  return sendAll(
    [
      {
        template: "inPersonConnect",
        to,
        data: { from_name: from.name, from_first_name: first(from.name), from_blurb: blurb(from), chat_url: chatUrl },
        idempotencyKey: `in-person:${chatId}:${to.id}`,
      },
    ],
    "in_person",
  );
}

// Someone sent a message while the other person wasn't looking. Sent once per unread stretch (see app/actions.js).
export function sendNewMessageEmail({ messageId, to, from, body, chatUrl }) {
  return sendAll(
    [
      {
        template: "newMessage",
        to,
        data: { from_name: from.name, from_first_name: first(from.name), message_body: body, chat_url: chatUrl },
        idempotencyKey: `new-message:${messageId}`,
      },
    ],
    "message",
  );
}
