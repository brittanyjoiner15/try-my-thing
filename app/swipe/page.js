import { cookies } from "next/headers";
import { requireProfile } from "@/lib/session";
import { getDeck, getBuilderCandidates } from "@/lib/data";
import { rankBuilders } from "@/lib/builder-match";
import SwipeDeck from "./SwipeDeck";
import { OPT_IN_DISMISSED } from "./optin";

const BUILDERS_EVERY = 3; // 2 products, then 1 builder
const OPT_IN_AT = 3; // where the "meet builders too?" card goes for people who haven't opted in

// One deck with products and builders mixed: featured products first, then 2 products for every builder,
// each in its own ranking order. Builders only show to people who opted in themselves, so it stays two-way.
// Everyone else gets one card in the deck that offers to turn it on, until they skip it.
export default async function SwipePage() {
  const { user, profile } = await requireProfile();
  const products = (await getDeck(user.id)).map((p) => ({ ...p, type: "product" }));
  const builders = profile.open_to_builders
    ? rankBuilders(profile, await getBuilderCandidates(user.id)).map((b) => ({ ...b, type: "builder" }))
    : [];

  const cards = mix(products, builders);
  if (!profile.open_to_builders && !(await cookies()).has(OPT_IN_DISMISSED)) {
    // Builder fields filled in but the checkbox left off: one tap turns it on. Otherwise it links to /profile.
    const ready = Boolean(profile.building || profile.topics?.length);
    cards.splice(Math.min(OPT_IN_AT, cards.length), 0, { type: "optin", id: "optin", ready });
  }

  return <SwipeDeck initialCards={cards} />;
}

function mix(products, builders) {
  const out = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);
  let [p, b] = [0, 0];
  while (p < rest.length || b < builders.length) {
    // Builders fill in once products run out, and the other way round.
    const builderTurn = (out.length + 1) % BUILDERS_EVERY === 0;
    if ((builderTurn && b < builders.length) || p >= rest.length) out.push(builders[b++]);
    else out.push(rest[p++]);
  }
  return out;
}
