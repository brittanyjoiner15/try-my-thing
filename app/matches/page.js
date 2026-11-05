import Link from "next/link";
import { requireProfile } from "@/lib/session";
import { getMatches, getBuilderMatches } from "@/lib/data";
import { introMailto, builderIntroMailto } from "@/lib/intro";
import Avatar from "@/app/components/Avatar";

const day = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function MatchesPage() {
  const { user, profile } = await requireProfile();
  const [{ tried, testers }, builders] = await Promise.all([getMatches(user.id), getBuilderMatches(user.id)]);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold">People who want to try your products</h1>
        <p className="mt-1 text-muted">They swiped right. They&apos;ll usually email you first, but you can reach out too.</p>
        <div className="mt-4 space-y-2">
          {testers.map((m, i) => (
            <div key={i} className="panel flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-bold">
                  {m.tester.name} <span className="font-normal text-muted">→ {m.product.name}</span>
                </p>
                <p className="text-sm text-muted">
                  {m.tester.role} · {m.tester.stack}
                  {m.tester.discord_handle && ` · Discord: ${m.tester.discord_handle}`} · matched {day(m.created_at)}
                </p>
              </div>
              <a href={`mailto:${m.tester.email}`} className="btn-ghost text-sm">
                {m.tester.email}
              </a>
            </div>
          ))}
          {testers.length === 0 && (
            <p className="text-muted">
              No testers yet. <Link href="/products" className="underline">Post a product</Link> to get some.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Products you want to try</h2>
        <p className="mt-1 text-muted">Email the builder to get access. The pre-written email does the awkward part.</p>
        <div className="mt-4 space-y-2">
          {tried.map((m, i) => (
            <div key={i} className="panel flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-bold">
                  {m.product.name} <span className="font-normal text-muted">by {m.builder.name}</span>
                </p>
                <p className="text-sm text-muted">matched {day(m.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={introMailto({ product: m.product, builder: m.builder, tester: profile })} className="btn-primary text-sm">
                  Email {m.builder.name.split(" ")[0]} (pre-written)
                </a>
                <a href={`mailto:${m.builder.email}`} className="btn-ghost text-sm">
                  {m.builder.email}
                </a>
              </div>
            </div>
          ))}
          {tried.length === 0 && (
            <p className="text-muted">
              Nothing yet. <Link href="/swipe" className="underline">Start swiping</Link>.
            </p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Builders you matched with</h2>
        <p className="mt-1 text-muted">You both swiped right. Say hi, swap feedback, or grab a coffee.</p>
        <div className="mt-4 space-y-2">
          {builders.map(({ builder, created_at }) => (
            <div key={builder.id} className="panel flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <Avatar name={builder.name} url={builder.avatar_url} />
                <div>
                  <p className="font-bold">
                    {builder.name} <span className="font-normal text-muted">· {builder.role}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {builder.building && `${builder.building} · `}
                    {builder.location && `${builder.location} · `}matched {day(created_at)}
                  </p>
                  <p className="mt-1 flex gap-3 text-sm">
                    {builder.github_url && (
                      <a href={builder.github_url} target="_blank" rel="noreferrer" className="text-accent underline">
                        GitHub ↗
                      </a>
                    )}
                    {builder.linkedin_url && (
                      <a href={builder.linkedin_url} target="_blank" rel="noreferrer" className="text-accent underline">
                        LinkedIn ↗
                      </a>
                    )}
                    {builder.discord_handle && <span className="text-muted">Discord: {builder.discord_handle}</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={builderIntroMailto({ me: profile, them: builder })} className="btn-primary text-sm">
                  Email {builder.name.split(" ")[0]} (pre-written)
                </a>
                <a href={`mailto:${builder.email}`} className="btn-ghost text-sm">
                  {builder.email}
                </a>
              </div>
            </div>
          ))}
          {builders.length === 0 && (
            <p className="text-muted">
              No builder matches yet.{" "}
              <Link href="/swipe?mode=builders" className="underline">
                Meet some builders
              </Link>
              .
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
