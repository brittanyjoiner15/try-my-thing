import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/data";
import { setProductHidden } from "@/app/actions";

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function AdminPage() {
  await requireAdmin();
  const { people, products, matches } = await getAdminData();

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-3 gap-4">
        <Stat label="People" value={people} />
        <Stat label="Products" value={products.length} />
        <Stat label="Matches" value={matches.length} />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Matches</h2>
        <div className="panel overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="p-3">Matched</th>
                <th className="p-3">Product (builder)</th>
                <th className="p-3">Tester</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="p-3">{day(m.created_at)}</td>
                  <td className="p-3">
                    {m.product.name} <span className="ph-no-capture text-muted">({m.builder.name}, {m.builder.email})</span>
                  </td>
                  <td className="p-3">
                    {m.tester.name} <span className="ph-no-capture text-muted">({m.tester.email})</span>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td className="p-3 text-muted" colSpan={3}>No matches yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Products</h2>
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="panel flex items-center justify-between gap-4 py-4">
              <div>
                <a href={p.url} target="_blank" rel="noreferrer" className="font-bold underline">
                  {p.name}
                </a>{" "}
                {p.hidden && <span className="text-sm text-muted">(hidden)</span>}
                <p className="text-sm text-muted">
                  {p.owner.name} · <span className="ph-no-capture">{p.owner.email}</span> · {p.matches} matches / {p.views} views
                </p>
              </div>
              <form action={setProductHidden.bind(null, p.id, !p.hidden)}>
                <button className="btn-ghost text-sm">{p.hidden ? "Unhide" : "Hide"}</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="panel p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
