// Ranks other builders for the Builders deck and explains why each one showed up.
// Plain scoring, no AI: easy to reason about and tweak. Runs on the server only.

const WEIGHTS = { topic: 2, stack: 1, lookingFor: 1 };

// Distance bonus. Being in the same area is the strongest signal for an IRL coffee.
const DISTANCE_BONUS = [
  [50, 4],
  [200, 2],
  [1000, 0.5],
];

// Great-circle distance in km between two lat/lng points (haversine formula).
export function distanceKm(a, b) {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Coordinates are rounded to ~10 km, so anything closer than that reads as "near you".
export function distanceLabel(km) {
  if (km == null) return null;
  if (km < 25) return "Near you";
  if (km < 1000) return `~${Math.round(km / 10) * 10} km away`;
  return `~${Math.round(km / 100) * 100} km away`;
}

const stackTags = (stack) =>
  (stack ?? "")
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean);

const overlap = (a = [], b = []) => {
  const lower = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => lower.has(x.toLowerCase()));
};

// Returns cards sorted best match first. Only card-safe fields go out: no email, coordinates, or links.
// Those are only shared after a mutual match.
export function rankBuilders(me, candidates) {
  return candidates
    .map((p) => {
      const km = distanceKm(me, p);
      const sharedTopics = overlap(p.topics, me.topics);
      const sharedStack = overlap(stackTags(p.stack), stackTags(me.stack));
      const sharedLookingFor = overlap(p.looking_for, me.looking_for);
      // Only the repos they picked, in their order. Repo names go out without links or a username,
      // the same rule as profile links: those only show after a mutual match.
      const featured = (p.featured_repos ?? []).map((name) => p.github?.repos.find((r) => r.name === name)).filter(Boolean);
      const bonus = km == null ? 0 : (DISTANCE_BONUS.find(([max]) => km <= max)?.[1] ?? 0);
      const score =
        bonus +
        sharedTopics.length * WEIGHTS.topic +
        sharedStack.length * WEIGHTS.stack +
        sharedLookingFor.length * WEIGHTS.lookingFor;

      return {
        id: p.id,
        name: p.name.split(" ")[0],
        avatar_url: p.avatar_url,
        role: p.role,
        stack: stackTags(p.stack),
        building: p.building,
        topics: p.topics ?? [],
        looking_for: p.looking_for ?? [],
        location: p.location,
        distance: distanceLabel(km),
        sharedStack, // highlighted on the card's stack chips
        languages: p.github?.languages ?? [],
        repos: featured,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);
}
