"use client";
/* eslint-disable @next/next/no-img-element -- preview of a local file / Supabase URL */

import { useRef, useState } from "react";
import { IMAGE_PICK_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";
import { shrinkImage } from "@/lib/shrink-image";

// Image picker with a live preview. The whole box is clickable and takes a dropped file.
// Leaving it empty on edit keeps the current image.
// `size` is the recommended dimensions shown under the box.
export default function ImageInput({ name, label, hint, size, currentUrl, shape }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [shrinking, setShrinking] = useState(false);

  const frame = {
    phone: "aspect-[9/19.5] w-24 rounded-2xl border-4 border-foreground",
    round: "h-20 w-20 rounded-full border border-border",
  }[shape] ?? "h-20 w-20 rounded-2xl border border-border";

  // Shared by the picker and drag-and-drop. Puts the (possibly shrunk) file into the real input,
  // or clears it if the file was rejected.
  async function handleFile(file) {
    setError(null);
    const input = inputRef.current;
    const reject = (message) => {
      setPreview(currentUrl);
      setError(message);
      input.value = "";
    };
    if (!file) {
      setPreview(currentUrl);
      return;
    }
    // Drops skip the input's `accept` filter, so check the type here too.
    if (!IMAGE_TYPES.includes(file.type)) return reject("That file type isn't supported. Use PNG, JPG, WebP or GIF.");
    if (file.size > IMAGE_PICK_MAX_BYTES) return reject("That image is over 10MB. Try a smaller one.");

    // Clear the big original first, so submitting mid-shrink can't send it past Netlify's 6MB cap.
    input.value = "";
    setShrinking(true);
    let small = null;
    try {
      small = await shrinkImage(file, shape === "phone" ? 2000 : 800);
    } catch {
      // createImageBitmap fails on files the browser can't decode. Handled below.
    }
    setShrinking(false);
    if (!small) return reject("We couldn't shrink that image. Try a smaller one.");

    const dt = new DataTransfer();
    dt.items.add(small);
    input.files = dt.files;
    setPreview(URL.createObjectURL(small));
  }

  return (
    <div>
      <span className="label">{label}</span>
      <label
        htmlFor={name}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-3 transition-colors focus-within:ring-2 focus-within:ring-accent ${
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-background"
        }`}
      >
        <div className={`${frame} shrink-0 overflow-hidden bg-background`}>
          {preview && <img src={preview} alt="" className="h-full w-full object-cover object-top" />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="btn-ghost text-sm">{shrinking ? "Shrinking…" : preview ? "Change image" : "Upload image"}</span>
          <p className="mt-1 text-xs text-muted">or drag it here</p>
          <input
            ref={inputRef}
            id={name}
            name={name}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </label>
      <p className="hint">{hint}</p>
      <p className="hint">{size ? `${size}. ` : ""}PNG, JPG, WebP or GIF, up to 10MB.</p>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
