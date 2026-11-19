// Browser-only. Shrinks a picked image so it fits the server's IMAGE_MAX_BYTES.
// Netlify caps requests at 6MB, so big phone screenshots/photos get resized here instead of
// being sent as-is. Files already under the limit are returned untouched (keeps GIF animation).
import { IMAGE_MAX_BYTES } from "./product-options";

const MIN_QUALITY = 0.5;

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Returns a File under IMAGE_MAX_BYTES, or null if it couldn't get it small enough.
export async function shrinkImage(file, maxEdge) {
  if (file.size <= IMAGE_MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

  // PNG/WebP/GIF can have transparency (logos), so prefer WebP, which keeps it.
  // Older Safari can't encode WebP and silently returns PNG; then fall back to JPEG for size.
  const keepAlpha = file.type !== "image/jpeg";

  // Each pass lowers quality, then size, until it fits.
  for (let pass = 0; pass < 6; pass++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (let quality = 0.85; quality >= MIN_QUALITY; quality -= 0.15) {
      let blob = await toBlob(canvas, keepAlpha ? "image/webp" : "image/jpeg", quality);
      if (blob?.type !== "image/webp" && blob?.type !== "image/jpeg") blob = await toBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= IMAGE_MAX_BYTES) {
        bitmap.close();
        const ext = blob.type.split("/")[1];
        return new File([blob], file.name.replace(/\.\w+$/, "") + "." + ext, { type: blob.type });
      }
    }
    scale *= 0.75;
  }
  bitmap.close();
  return null;
}
