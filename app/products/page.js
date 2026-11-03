import { requireProfile } from "@/lib/session";
import { getMyProducts } from "@/lib/data";
import { createProduct, toggleMyProduct } from "@/app/actions";

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
              <div key={p.id} className="panel flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold">
                    {p.name} {p.hidden && <span className="text-sm font-normal text-muted">(paused)</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {p.matches} / {p.max_testers} testers matched · {p.views} people saw it
                  </p>
                </div>
                <form action={toggleMyProduct.bind(null, p.id, !p.hidden)}>
                  <button className="btn-ghost text-sm">{p.hidden ? "Unpause" : "Pause"}</button>
                </form>
              </div>
            );
          })}
        </section>
      )}

      <form action={createProduct} className="panel space-y-5">
        <div>
          <h2 className="text-2xl font-bold">Post a product</h2>
          <p className="mt-1 text-muted">This is the card testers swipe on. Be specific about who should try it.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Product name</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="url">Link</label>
            <input id="url" name="url" type="url" required className="input" placeholder="https://" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tagline">What does it do, in one sentence?</label>
          <input id="tagline" name="tagline" required maxLength={120} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="wants">Who should try it?</label>
          <input id="wants" name="wants" required className="input" placeholder="backend engineers running Postgres" />
          <p className="hint">Role, stack, or a problem they have.</p>
        </div>

        <div>
          <label className="label" htmlFor="feedback_on">What do you want feedback on?</label>
          <input id="feedback_on" name="feedback_on" required className="input" placeholder="first-time setup" />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="stage">Stage</label>
            <select id="stage" name="stage" className="input">
              <option>pre-launch</option>
              <option>private beta</option>
              <option>public beta</option>
              <option>live</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="perk">Testers get</label>
            <select id="perk" name="perk" className="input">
              <option>early access</option>
              <option>a free plan or extended trial</option>
              <option>a discount</option>
              <option>a first look before everyone else</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="max_testers">How many testers?</label>
            <select id="max_testers" name="max_testers" className="input" defaultValue="3">
              <option value="1">1</option>
              <option value="3">up to 3</option>
              <option value="10">up to 10</option>
            </select>
          </div>
        </div>

        <button className="btn-primary w-full">Post it</button>
      </form>
    </div>
  );
}
