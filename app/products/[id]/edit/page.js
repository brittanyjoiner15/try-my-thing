import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/session";
import { getProductWithOwner } from "@/lib/data";
import { updateProduct } from "@/app/actions";
import ProductForm from "@/app/components/ProductForm";

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const { user } = await requireProfile();
  const product = await getProductWithOwner(id);
  if (product?.owner_id !== user.id) notFound();

  return (
    <ProductForm
      action={updateProduct.bind(null, id)}
      product={product}
      title={`Edit ${product.name}`}
      intro="Changes show up in the swipe deck right away. Leave an image empty to keep the current one."
      submitLabel="Save changes"
    />
  );
}
