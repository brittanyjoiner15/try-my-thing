// Pre-written first email from the tester to the builder. Used on the match screen and the Matches page.
export function introMailto({ product, builder, tester }) {
  const builderFirst = builder.name.split(" ")[0];
  const subject = `Trying ${product.name} (via the PostHog community)`;
  const body = `Hi ${builderFirst},

I swiped right on ${product.name} on try my thing, the PostHog community matchmaker. I'm a ${tester.role} using ${tester.stack}, and I'd like to try it and send you honest feedback, especially on ${product.feedback_on}.

How do I get access?

${tester.name}`;
  return `mailto:${builder.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
