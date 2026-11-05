// Pre-written first messages. They prefill the chat box when a chat has no messages yet,
// so nobody has to stare at an empty thread working out what to say.

// Tester → builder, once the builder has accepted.
export function testerIntro({ product, tester }) {
  return `Hi! I'm a ${tester.role} using ${tester.stack}. I'd like to try ${product.name} and send you honest feedback${
    product.feedback_on ? `, especially on ${product.feedback_on}` : ""
  }. How do I get access?`;
}

// Builder → builder, after a mutual match.
export function builderIntro({ me }) {
  return `Hi! I'm a ${me.role} building ${me.building || "something new"}, using ${me.stack}. Want to grab a quick call${
    me.location ? ` or a coffee if you're near ${me.location}` : ""
  }? Happy to swap feedback on what we're each working on.`;
}
