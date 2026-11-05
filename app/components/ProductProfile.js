// Hinge-style product profile. Used on the swipe card and on /products/[id].
// No hooks or event handlers, so it renders on the server or inside the client swipe deck.
/* eslint-disable @next/next/no-img-element -- images come from Supabase Storage or data URLs (demo); plain <img> skips next/image remote config */

export default function ProductProfile({ product }) {
  const [first, second, third] = product.prompts ?? [];

  return (
    <article className="space-y-4">
      <header className="flex items-center gap-3">
        <Logo product={product} />
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-bold">{product.name}</h2>
          <p className="text-sm text-muted">
            by {product.builder} · {product.stage}
          </p>
        </div>
      </header>

      <p className="text-lg">{product.tagline}</p>

      {first && <PromptCard {...first} />}

      {product.screenshot_url && (
        <div className="mx-auto aspect-[9/19.5] w-52 overflow-hidden rounded-[2rem] border-[6px] border-foreground bg-background">
          <img src={product.screenshot_url} alt={`${product.name} screenshot`} className="h-full w-full object-cover object-top" />
        </div>
      )}

      <ul className="flex flex-wrap gap-2 text-sm">
        {product.platforms?.map((p) => (
          <li key={p} className="rounded-full border border-border px-3 py-1">
            {p}
          </li>
        ))}
        <li className="rounded-full border border-border px-3 py-1">🎁 {product.perk}</li>
      </ul>

      {second && <PromptCard {...second} />}

      <PromptCard prompt="Looking for testers who are…" answer={product.wants} />
      <PromptCard prompt="I want honest feedback on…" answer={product.feedback_on} />

      {third && <PromptCard {...third} />}

      <a href={product.url} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-accent underline">
        Peek at the site ↗
      </a>
    </article>
  );
}

function PromptCard({ prompt, answer }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <p className="text-sm font-semibold text-muted">{prompt}</p>
      <p className="mt-2 text-xl font-bold leading-snug">{answer}</p>
    </div>
  );
}

export function Logo({ product, size = "h-14 w-14 text-2xl" }) {
  if (product.logo_url) {
    return <img src={product.logo_url} alt="" draggable={false} className={`${size} shrink-0 rounded-2xl border border-border object-cover`} />;
  }
  // No logo yet: first letter on PostHog orange.
  return (
    <div className={`${size} flex shrink-0 items-center justify-center rounded-2xl bg-accent font-black text-white`}>
      {product.name.charAt(0).toUpperCase()}
    </div>
  );
}
