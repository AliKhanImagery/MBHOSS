// Pure sizing helpers for photos attached to the quote assistant.
// Anything bigger than 1 megapixel is scaled down (same shape) before it is sent.

export const MAX_PIXELS = 1_000_000;

/** Returns the size to use: unchanged if already within the limit, otherwise scaled to fit it. */
export function fitWithinPixels(width: number, height: number, maxPixels = MAX_PIXELS): { width: number; height: number; resized: boolean } {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w * h <= maxPixels) return { width: w, height: h, resized: false };
  const scale = Math.sqrt(maxPixels / (w * h));
  let nw = Math.max(1, Math.floor(w * scale));
  let nh = Math.max(1, Math.floor(h * scale));
  while (nw * nh > maxPixels) { if (nw >= nh) nw--; else nh--; }
  return { width: nw, height: nh, resized: true };
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];
export const isAllowedImageType = (t: unknown): t is AllowedImageType => typeof t === 'string' && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(t);

/** Largest base64 payload the server accepts for one image (about 1.5 MB of picture). */
export const MAX_IMAGE_BASE64_CHARS = 2_000_000;
