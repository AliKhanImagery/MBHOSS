// Browser-only: loads a picked photo, shrinks it to at most 1 megapixel if needed and returns base64.
import { fitWithinPixels, isAllowedImageType, MAX_IMAGE_BASE64_CHARS, type AllowedImageType } from './image-fit';

export interface PreparedImage {
  mime: AllowedImageType;
  data: string; // base64, no "data:" prefix
  width: number;
  height: number;
  resized: boolean;
  previewUrl: string;
}

const MAX_PICKED_BYTES = 25 * 1024 * 1024;

const toBase64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1);

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!isAllowedImageType(file.type)) throw new Error('Please pick a JPG, PNG or WebP picture. (For iPhone HEIC photos, take a screenshot or share as JPG.)');
  if (file.size > MAX_PICKED_BYTES) throw new Error('That picture is too large. Please pick one under 25 MB.');

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('That picture could not be opened.');
  try {
    const fit = fitWithinPixels(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = fit.width;
    canvas.height = fit.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser could not process the picture.');
    // White behind transparent PNGs so text stays readable.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fit.width, fit.height);
    ctx.drawImage(bitmap, 0, 0, fit.width, fit.height);

    // Already small enough and untouched: send the original bytes. Otherwise re-encode as JPEG.
    let mime: AllowedImageType = 'image/jpeg';
    let url: string;
    if (!fit.resized && file.size <= 1_400_000) {
      mime = file.type;
      url = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('That picture could not be read.'));
        r.readAsDataURL(file);
      });
    } else {
      url = canvas.toDataURL('image/jpeg', 0.85);
      if (toBase64(url).length > MAX_IMAGE_BASE64_CHARS) url = canvas.toDataURL('image/jpeg', 0.6);
    }
    const data = toBase64(url);
    if (data.length > MAX_IMAGE_BASE64_CHARS) throw new Error('That picture is still too large after shrinking. Please crop it.');
    return { mime, data, width: fit.width, height: fit.height, resized: fit.resized, previewUrl: url };
  } finally {
    bitmap.close();
  }
}
