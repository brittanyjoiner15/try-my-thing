"use client";
/* eslint-disable @next/next/no-img-element -- preview of a local file / Supabase URL */

import { useRef, useState } from "react";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/product-options";

// Image picker with a live preview. The whole box is clickable and takes a dropped file.
// Leaving it empty on edit keeps the current image.
export default function ImageInput({ name, label, hint, currentUrl, shape }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(currentUrl);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const frame = {
    phone: "aspect-[9/19.5] w-24 rounded-2xl border-4 border-foreground",
    round: "h-20 w-20 rounded-full border border-border",
  }[shape] ?? "h-20 w-20 rounded-2xl border border-border";

  // Shared by the picker and drag-and-drop. Returns false if the file was rejected.
  function handleFile(file) {
    setError(null);
    if (!file) {
      setPreview(currentUrl);
      return true;
    }
    // Drops skip the input's `accept` filter, so check the type here too.
    if (!IMAGE_TYPES.includes(file.type)) {
      setPreview(currentUrl);
      setError("That file type isn't supported. Use PNG, JPG or WebP.");
      return false;
    }
    // Catch big files here so the whole form doesn't fail on submit.
    if (file.size > IMAGE_MAX_BYTES) {
      setPreview(currentUrl);
      setError("That image is over 2MB. Try a smaller one.");
      return false;
    }
    setPreview(URL.createObjectURL(file));
    return true;
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
          const files = e.dataTransfer.files;
          // Put the dropped file into the real input so the form submits it.
          if (files?.length && handleFile(files[0])) inputRef.current.files = files;
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-3 transition-colors focus-within:ring-2 focus-within:ring-accent ${
          dragging ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-background"
        }`}
      >
        <div className={`${frame} shrink-0 overflow-hidden bg-background`}>
          {preview && <img src={preview} alt="" className="h-full w-full object-cover object-top" />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="btn-ghost text-sm">{preview ? "Change image" : "Upload image"}</span>
          <p className="mt-1 text-xs text-muted">or drag it here</p>
          <input
            ref={inputRef}
            id={name}
            name={name}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={(e) => {
              if (!handleFile(e.target.files?.[0])) e.target.value = "";
            }}
          />
        </div>
      </label>
      <p className="hint">{hint}</p>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
