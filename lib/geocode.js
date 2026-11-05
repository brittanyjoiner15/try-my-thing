// Turns "Austin, TX" into a city-level label + coordinates using OpenStreetMap's Nominatim API (free, no key).
// Policy: max 1 request/second and a real User-Agent. We only call it when someone saves a changed location,
// so we're far below that. https://operations.osmfoundation.org/policies/nominatim/
// TODO: if sign-ups spike, cache results or move to a paid geocoder.

// 1 decimal ≈ 11 km. Enough for "near you", without storing anyone's exact location.
const round = (n) => Math.round(n * 10) / 10;

export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    "accept-language": "en",
  })}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "trymything.app (PostHog community builder matchmaker)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const [hit] = await res.json();
    if (!hit) return null;
    const a = hit.address ?? {};
    const place = a.city || a.town || a.village || a.municipality || a.county || a.state;
    return {
      location: [place, a.country].filter(Boolean).join(", ") || query,
      lat: round(Number(hit.lat)),
      lng: round(Number(hit.lon)),
    };
  } catch {
    return null; // network error or timeout: save the profile without coordinates
  }
}
