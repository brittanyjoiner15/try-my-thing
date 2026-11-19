import { notFound } from "next/navigation";
import { requireProfile, isAdmin } from "@/lib/session";
import { getProductWithOwner } from "@/lib/data";
import { updateProduct, deleteMyProduct, deleteProductAsAdmin } from "@/app/actions";
import ProductForm from "@/app/components/ProductForm";
import DeleteProductButton from "@/app/components/DeleteProductButton";

export default async function EditProductPage({ params, searchParams }) {
  const { id } = await params;
  const { claimed } = await searchParams;
  const { user } = await requireProfile();
  const product = await getProductWithOwner(id);
  // Unclaimed products (claim links) have no owner, so only an admin can edit them.
  const unclaimed = product && !product.owner_id;
  if (unclaimed ? !isAdmin(user) : product?.owner_id !== user.id) notFound();

  const intro = unclaimed
    ? "Nobody sees this until the builder claims it. Leave an image empty to keep the current one."
    : claimed
      ? "It's yours, and testers can find it in the swipe deck now. Check it over and fix anything we got wrong."
      : "Changes show up in the swipe deck right away. Leave an image empty to keep the current one.";

  return (
    <div className="space-y-6">
      <ProductForm
        action={updateProduct.bind(null, id)}
        product={product}
        title={claimed ? `${product.name} is yours` : `Edit ${product.name}`}
        intro={intro}
        submitLabel="Save changes"
        event={unclaimed ? "unclaimed_product_updated" : undefined}
      />
      <section className="panel flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold">Delete this product</p>
          <p className="text-sm text-muted">Want it back later? Pause it from My products instead.</p>
        </div>
        <DeleteProductButton
          action={(unclaimed ? deleteProductAsAdmin : deleteMyProduct).bind(null, id)}
          name={product.name}
        />
      </section>
    </div>
  );
}
