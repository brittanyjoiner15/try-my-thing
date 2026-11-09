// In-person connect: everyone has a link (/c/<code>) and a QR code on /profile. Whoever opens it
// and taps Connect gets an open chat with them, same as a builder ↔ builder match.
import { setConnectCode } from "@/lib/data";

// Remembers which /c/<code> page someone was on while they sign up, so they land back on it.
export const CONNECT_COOKIE = "tmt_connect";

// No 0/O/1/I/L, so a code read off someone's screen can be typed back in.
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const CONNECT_CODE = /^[a-z0-9]{3,20}$/; // loose on purpose: demo codes are names like "leo"

export function newConnectCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Profiles get a code the first time they open /profile, so nobody needs a backfill.
export async function ensureConnectCode(profile) {
  if (profile.connect_code) return profile.connect_code;
  const code = newConnectCode();
  await setConnectCode(profile.id, code);
  return code;
}
