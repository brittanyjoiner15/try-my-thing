import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getAdminData } from "@/lib/data";
import { getWeeklyGrowth } from "@/lib/posthog-query";
import { setProductHidden, deleteProductAsAdmin } from "@/app/actions";
import DeleteProductButton from "@/app/components/DeleteProductButton";
import SubmitButton from "@/app/components/SubmitButton";

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function AdminPage() {
  await requireAdmin();
  const [{ people, openChats, products: all, matches }, growth] = await Promise.all([getAdminData(), getWeeklyGrowth()]);
  // Unclaimed products (claim links) have no owner yet, so they get their own list.
  const products = all.filter((p) => p.owner_id);
  const unclaimed = all.filter((p) => !p.owner_id);

  return (
    <div className="space-y-10">
      {/* Totals come from Supabase (always complete). Weekly growth comes from PostHog events. */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="People" value={people} />
        <Stat label="Live products" value={products.filter((p) => !p.hidden).length} />
        <Stat label="Matched (open chats)" value={openChats} />
        <Stat label="Try requests" value={matches.length} />
      </section>

      <WeeklyGrowth growth={growth} />

      <section>
        <h2 className="mb-3 text-xl font-bold">Try requests</h2>
        <div className="panel overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="p-3">Requested</th>
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
                  <td className="p-3 text-muted" colSpan={3}>No requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="claim-links">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Claim links</h2>
          <Link href="/admin/claim/new" className="btn-primary text-sm">
            New claim link
          </Link>
        </div>
        <p className="mb-3 text-sm text-muted">
          Products you prefilled for builders. They stay out of the deck until someone claims them.
        </p>
        <div className="space-y-2">
          {unclaimed.map((p) => (
            <div key={p.id} className="panel flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-muted">Made {day(p.created_at)}</p>
              </div>
              <Link href={`/claim/${p.claim_code}`} className="btn-ghost text-sm">
                Open link
              </Link>
            </div>
          ))}
          {unclaimed.length === 0 && <p className="text-sm text-muted">None waiting to be claimed.</p>}
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
              <div className="flex gap-2">
                <form action={setProductHidden.bind(null, p.id, !p.hidden)}>
                  <SubmitButton className="btn-ghost text-sm">{p.hidden ? "Unhide" : "Hide"}</SubmitButton>
                </form>
                <DeleteProductButton action={deleteProductAsAdmin.bind(null, p.id)} name={p.name} />
              </div>
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

// Newest week first. "This week" is partial, so it's labeled.
function WeeklyGrowth({ growth }) {
  return (
    <section>
      <h2 className="mb-1 text-xl font-bold">Weekly growth</h2>
      <p className="mb-3 text-sm text-muted">From PostHog. Signups and products are tracked from Nov 19, matches from when match_opened shipped.</p>
      {growth.error ? (
        <p className="panel text-sm text-muted">{growth.error}</p>
      ) : (
        <div className="panel overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="p-3">Week of</th>
                <th className="p-3">Signups</th>
                <th className="p-3">Products posted</th>
                <th className="p-3">Matches opened</th>
              </tr>
            </thead>
            <tbody>
              {growth.weeks.toReversed().map((w, i) => (
                <tr key={w.week} className="border-b border-border last:border-0">
                  <td className="p-3">
                    {day(w.week + "T12:00:00Z")}
                    {i === 0 && <span className="text-muted"> (this week)</span>}
                  </td>
                  <td className="p-3">{w.signups}</td>
                  <td className="p-3">{w.products}</td>
                  <td className="p-3">{w.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
