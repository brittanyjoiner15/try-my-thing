import { requireAdmin } from "@/lib/session";
import { createUnclaimedProduct } from "@/app/actions";
import ProductForm from "@/app/components/ProductForm";

// Prefill a product for a builder from their site. Saving opens the claim page, with the link to send them.
export default async function NewClaimLinkPage() {
  await requireAdmin();
  return (
    <ProductForm
      action={createUnclaimedProduct}
      title="Make a claim link"
      intro="Fill this in for a builder from their site. You get a private link to send them. Nobody else sees it until they claim it."
      submitLabel="Make claim link"
      event="unclaimed_product_created"
    />
  );
}
