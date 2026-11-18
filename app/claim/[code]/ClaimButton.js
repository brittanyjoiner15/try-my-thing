"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { claimProduct } from "@/app/actions";

export default function ClaimButton({ code, productName }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async () => {
    const result = await claimProduct(code);
    if (result.ok) {
      posthog.capture("product_claimed", { product_id: result.productId });
      router.push(`/products/${result.productId}/edit?claimed=1`);
    }
    return result;
  }, {});

  return (
    <form action={action} className="space-y-2 text-center">
      <button className="btn-primary w-full" disabled={pending || state.ok}>
        {pending || state.ok ? "Claiming…" : `Claim ${productName}`}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : (
        <p className="hint">It moves to your account and testers can find it. You can edit or pause it anytime.</p>
      )}
    </form>
  );
}
