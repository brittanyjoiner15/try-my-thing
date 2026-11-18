// One line about what connects two people in a chat, for /matches rows and the chat header.
// e.g. "wants to try HogMatch, PostHog · built EdgeLog". Passed requests are left out.

const list = (names) => names.join(", ");

export function pairSummary(chat, meId) {
  const live = chat.requests.filter((r) => r.status !== "declined");
  const theyWant = live.filter((r) => r.tester_id !== meId).map((r) => r.product.name);
  const iWant = live.filter((r) => r.tester_id === meId).map((r) => r.product.name);
  return [theyWant.length > 0 && `wants to try ${list(theyWant)}`, iWant.length > 0 && `built ${list(iWant)}`, chat.them.role]
    .filter(Boolean)
    .join(" · ");
}
