// A tab opened before a deploy keeps calling the old server action IDs, which the new server doesn't know.
// Next.js says so with an UnrecognizedActionError, and only a full reload picks up the new IDs.
import posthog from "posthog-js";
import { unstable_isUnrecognizedActionError } from "next/navigation";

const RELOADED_AT = "reloaded-for-new-version";
const RELOAD_GAP_MS = 60000; // if a fresh page still can't find the action, stop reloading and let the person see a message

export const isNewVersion = (err) => unstable_isUnrecognizedActionError(err);

// Reloads the page unless it already did in the last minute. Returns false when it didn't reload.
export function reloadForNewVersion(action) {
  const last = Number(sessionStorage.getItem(RELOADED_AT));
  if (last && Date.now() - last < RELOAD_GAP_MS) return false;
  sessionStorage.setItem(RELOADED_AT, String(Date.now()));
  posthog.capture("reloaded_for_new_version", { action, path: window.location.pathname });
  window.location.reload();
  return true;
}
