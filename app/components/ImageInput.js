"use client";
/* eslint-disable @next/next/no-img-element -- preview of a local file / Supabase URL */

import { useState } from "react";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";

// File picker with a live preview. Leaving it empty on edit keeps the current image.
export default function ImageInput({ name, label, hint, currentUrl, shape }) {
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState(null);

  const frame = {
    phone: "aspect-[9/19.5] w-24 rounded-2xl border-4 border-foreground",
    round: "h-20 w-20 rounded-full border border-border",
  }[shape] ?? "h-20 w-20 rounded-2xl border border-border";

  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="flex items-center gap-4">
        <div className={`${frame} shrink-0 overflow-hidden bg-background`}>
          {preview && <img src={preview} alt="" className="h-full w-full object-cover object-top" />}
        </div>
        <div className="min-w-0 flex-1">
          <input
            id={name}
            name={name}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="w-full text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setError(null);
              if (!file) return setPreview(currentUrl);
              // Catch big files here so the whole form doesn't fail on submit.
              if (file.size > IMAGE_MAX_BYTES) {
                e.target.value = "";
                setPreview(currentUrl);
                return setError("That image is over 2MB. Try a smaller one.");
              }
              setPreview(URL.createObjectURL(file));
            }}
          />
          <p className="hint">{hint}</p>
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
