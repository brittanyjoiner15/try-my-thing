// Claim links: Britt prefills a product on /admin/claim/new and sends the builder /claim/<code>.
// The product has no owner until someone opens the link and taps Claim. Having the link is the proof,
// like a gift card, so send it privately.
export { newConnectCode as newClaimCode } from "@/lib/connect";

// Remembers which /claim/<code> page someone was on while they sign up, so they land back on it.
export const CLAIM_COOKIE = "tmt_claim";

export const CLAIM_CODE = /^[a-z0-9]{3,20}$/;
