"use client";

// "Post a product" and "Edit product" share this form. Pass `product` to prefill it.
import posthog from "posthog-js";
import ImageInput from "./ImageInput";
import { PLATFORMS, PROMPTS, PROMPT_SLOTS, ANSWER_MAX } from "@/lib/product-options";

export default function ProductForm({ action, product, title, intro, submitLabel }) {
  return (
    <form
      action={action}
      className="panel space-y-6"
      onSubmit={() => posthog.capture(product ? "product_updated" : "product_created")}
    >
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-muted">{intro}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Product name</label>
          <input id="name" name="name" required className="input" defaultValue={product?.name} />
        </div>
        <div>
          <label className="label" htmlFor="url">Link</label>
          <input id="url" name="url" type="url" required className="input" placeholder="https://" defaultValue={product?.url} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="tagline">What does it do, in one sentence?</label>
        <input id="tagline" name="tagline" required maxLength={120} className="input" defaultValue={product?.tagline} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ImageInput name="logo" label="Logo" hint="Square works best. PNG, JPG or WebP, under 2MB." currentUrl={product?.logo_url} />
        <ImageInput
          name="screenshot"
          label="Phone screenshot"
          shape="phone"
          hint="A vertical screen, like you're looking at it on your phone. Cards with one stand out."
          currentUrl={product?.screenshot_url}
        />
      </div>

      <fieldset>
        <legend className="label">What kind of thing is it?</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <label key={p} className="cursor-pointer">
              <input
                type="checkbox"
                name="platforms"
                value={p}
                defaultChecked={product?.platforms?.includes(p)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-border px-3 py-1 text-sm peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                {p}
              </span>
            </label>
          ))}
        </div>
        <p className="hint">Pick all that apply.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <div>
          <legend className="label">Prompts</legend>
          <p className="hint mt-0">Answer up to {PROMPT_SLOTS}. This is the personality part, so have fun with it.</p>
        </div>
        {Array.from({ length: PROMPT_SLOTS }, (_, i) => {
          const current = product?.prompts?.[i];
          return (
            <div key={i} className="space-y-2 rounded-xl border border-border p-4">
              <select name={`prompt_${i}`} className="input" defaultValue={current?.prompt ?? ""} aria-label={`Prompt ${i + 1}`}>
                <option value="">Pick a prompt…</option>
                {PROMPTS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <textarea
                name={`answer_${i}`}
                rows={2}
                maxLength={ANSWER_MAX}
                className="input"
                placeholder="Your answer"
                defaultValue={current?.answer}
                aria-label={`Answer ${i + 1}`}
              />
            </div>
          );
        })}
      </fieldset>

      <div>
        <label className="label" htmlFor="wants">Who should try it?</label>
        <input id="wants" name="wants" required className="input" placeholder="backend engineers running Postgres" defaultValue={product?.wants} />
        <p className="hint">Role, stack, or a problem they have.</p>
      </div>

      <div>
        <label className="label" htmlFor="feedback_on">What do you want feedback on?</label>
        <input id="feedback_on" name="feedback_on" required className="input" placeholder="first-time setup" defaultValue={product?.feedback_on} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="stage">Stage</label>
          <select id="stage" name="stage" className="input" defaultValue={product?.stage}>
            <option>pre-launch</option>
            <option>private beta</option>
            <option>public beta</option>
            <option>live</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="perk">Testers get</label>
          <select id="perk" name="perk" className="input" defaultValue={product?.perk}>
            <option>early access</option>
            <option>a free plan or extended trial</option>
            <option>a discount</option>
            <option>a first look before everyone else</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="max_testers">How many testers?</label>
          <select id="max_testers" name="max_testers" className="input" defaultValue={String(product?.max_testers ?? 3)}>
            <option value="1">1</option>
            <option value="3">up to 3</option>
            <option value="10">up to 10</option>
          </select>
        </div>
      </div>

      <button className="btn-primary w-full">{submitLabel}</button>
    </form>
  );
}
