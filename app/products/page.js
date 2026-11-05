import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getMyProducts } from "@/lib/data";
import { createProduct, toggleMyProduct } from "@/app/actions";
import ProductForm from "@/app/components/ProductForm";
import { Logo } from "@/app/components/ProductProfile";

export default async function ProductsPage() {
  const { user } = await requireProfile();
  const products = await getMyProducts(user.id);

  return (
    <div className="space-y-8">
      {products?.length > 0 && (
        <section className="space-y-3">
          <h1 className="text-2xl font-bold">My products</h1>
          {products.map((p) => {
            return (
              <div key={p.id} className="panel flex flex-wrap items-center justify-between gap-4">
                <Link href={`/products/${p.id}`} className="flex min-w-0 items-center gap-3">
                  <Logo product={p} size="h-12 w-12 text-xl" />
                  <div className="min-w-0">
                    <p className="font-bold">
                      {p.name} {p.hidden && <span className="text-sm font-normal text-muted">(paused)</span>}
                    </p>
                    <p className="text-sm text-muted">
                      {p.matches} / {p.max_testers} testers matched · {p.views} people saw it
                    </p>
                  </div>
                </Link>
                <div className="flex gap-2">
                  <Link href={`/products/${p.id}/edit`} className="btn-ghost text-sm">
                    Edit
                  </Link>
                  <form action={toggleMyProduct.bind(null, p.id, !p.hidden)}>
                    <button className="btn-ghost text-sm">{p.hidden ? "Unpause" : "Pause"}</button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <ProductForm
        action={createProduct}
        title="Post a product"
        intro="This is the profile testers swipe on. Be specific about who should try it."
        submitLabel="Post it"
      />
    </div>
  );
}
