/** Resize/compress Supabase storage URLs when the project supports image transforms. */
export function optimizedImageUrl(
  url: string | undefined | null,
  options?: { width?: number; quality?: number },
): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) return url;

  const width = options?.width ?? 640;
  const quality = options?.quality ?? 78;

  if (url.includes('/storage/v1/object/public/')) {
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const sep = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${sep}width=${width}&quality=${quality}&resize=contain`;
  }

  return url;
}

export function avatarImageUrl(url: string | undefined | null, displayName: string, uid: string): string {
  const optimized = optimizedImageUrl(url, { width: 96, quality: 80 });
  if (optimized) return optimized;
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(uid || displayName)}`;
}

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp']);

export const INVALID_IMAGE_FILE_MESSAGE = 'Please select a photo (JPG, PNG, or WEBP).';

/** Android WebView often returns an empty type or application/octet-stream for gallery picks. */
export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTENSIONS.has(ext);
}

/** Accept gallery picks from Android where MIME type is missing. */
export function normalizeImageUploadFile(file: File | null | undefined): File | null {
  if (!file) return null;
  return isLikelyImageFile(file) ? file : null;
}

export function guessImageContentType(file: File): string {
  if (file.type.startsWith('image/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
    bmp: 'image/bmp',
  };
  return byExt[ext] ?? 'image/jpeg';
}

/** Shrink large uploads before storage — faster upload and smaller downloads. */
export async function compressImageIfNeeded(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!isLikelyImageFile(file) || file.size <= 250_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);

    if (scale >= 1 && file.size <= 900_000) {
      bitmap.close();
      return file;
    }

    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
