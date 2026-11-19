import { CONNECT_COOKIE, CONNECT_CODE } from "@/lib/connect";
import { CLAIM_COOKIE, CLAIM_CODE } from "@/lib/claim";

// Someone who signed in from an in-person link (startConnect) or a claim link (startClaim) goes back
// to it instead of /swipe. New people get bounced to /onboarding from there, and saveProfile sends them back.
// Shared by the magic link callback and the email code sign-in.
export function signInReturnTo(cookieStore) {
  const connectCode = cookieStore.get(CONNECT_COOKIE)?.value;
  const claimCode = cookieStore.get(CLAIM_COOKIE)?.value;
  if (connectCode && CONNECT_CODE.test(connectCode)) return `/c/${connectCode}`;
  if (claimCode && CLAIM_CODE.test(claimCode)) return `/claim/${claimCode}`;
  return null;
}
