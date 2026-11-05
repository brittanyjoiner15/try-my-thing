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

// Pre-written first email between two builders who matched. Used on the match screen and the Matches page.
export function builderIntroMailto({ me, them }) {
  const first = them.name.split(" ")[0];
  const subject = `We matched on try my thing (PostHog community)`;
  const body = `Hi ${first},

We matched as builders on try my thing, the PostHog community matchmaker. I'm a ${me.role} building ${me.building || "something new"}, using ${me.stack}.

Want to grab a quick call${me.location ? ` or a coffee if you're near ${me.location}` : ""}? Happy to swap feedback on what we're each working on.

${me.name}`;
  return `mailto:${them.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
