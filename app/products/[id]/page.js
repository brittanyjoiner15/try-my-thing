import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, isAdmin } from "@/lib/session";
import { getProductWithOwner } from "@/lib/data";
import ProductProfile from "@/app/components/ProductProfile";

// A product's profile, as testers see it on the swipe card. Signed-in users only, same as the deck.
export default async function ProductPage({ params }) {
  const { id } = await params;
  const { user } = await requireProfile();
  const product = await getProductWithOwner(id);
  const isOwner = product?.owner_id === user.id;
  if (!product || (product.hidden && !isOwner && !isAdmin(user))) notFound();

  // Only pass what the card shows. The owner record includes their email.
  const { owner, ...rest } = product;
  const card = { ...rest, builder: owner.name.split(" ")[0] };

  return (
    <div className="mx-auto max-w-md space-y-4 pt-4">
      {isOwner && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-accent/10 px-4 py-3 text-sm">
          <span>
            This is how testers see it{product.hidden && " (paused, so nobody sees it right now)"}.
          </span>
          <Link href={`/products/${id}/edit`} className="btn-primary text-sm">
            Edit
          </Link>
        </div>
      )}
      <div className="panel">
        <ProductProfile product={card} />
      </div>
      {!isOwner && (
        <Link href="/swipe" className="btn-primary w-full">
          Swipe to match
        </Link>
      )}
    </div>
  );
}
