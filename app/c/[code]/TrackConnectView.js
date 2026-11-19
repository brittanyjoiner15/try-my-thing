"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// connect_link_viewed → user_signed_up (signup_source "connect_link") → in_person_connect is the funnel
// for builders' shared links. Signed-out views are anonymous until identify() in BottomNav links them.
export default function TrackConnectView({ ownerId, signedIn }) {
  useEffect(() => {
    posthog.capture("connect_link_viewed", { referrer_id: ownerId, signed_in: signedIn });
  }, [ownerId, signedIn]);
  return null;
}
