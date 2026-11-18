"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// claim_link_viewed → product_claimed is the funnel for claim-link outreach. Signed-out views are
// anonymous until they sign up, and identify() in BottomNav links them to the account.
export default function TrackClaimView({ productId, signedIn }) {
  useEffect(() => {
    posthog.capture("claim_link_viewed", { product_id: productId, signed_in: signedIn });
  }, [productId, signedIn]);
  return null;
}
