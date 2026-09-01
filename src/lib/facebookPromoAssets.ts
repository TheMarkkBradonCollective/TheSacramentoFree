import { apiUrl } from './appOrigin';
import { FACEBOOK_PROMO_ZIP_NAME, facebookPromoZipUrl } from './apkDownload';
import { isNativeApp } from './nativePlatform';

export const FACEBOOK_PROMO_BASE_PATH = '/downloads/facebook';

export const FACEBOOK_PROMO_IMAGES = [
  ['ad-poster-portrait.png', 'Ad poster 1080×1350 (4:5 thumbnail / still)'],
  ['ad-poster-square.png', 'Ad poster 1080×1080 (square thumbnail / still)'],
] as const;

export const FACEBOOK_PROMO_VIDEOS = [
  ['ad-portrait.mp4', 'Facebook feed ad 1080×1350 (4:5) — live app footage'],
  ['ad-square.mp4', 'Facebook feed ad 1080×1080 — live app footage'],
] as const;

export const FACEBOOK_PROMO_DOCS = [
  ['POST-COPY.txt', 'Ready-to-paste Facebook captions'],
  ['README.txt', 'How to post these files on Facebook'],
] as const;

export type FacebookPromoAssetLink = {
  file: string;
  label: string;
};

export function facebookPromoAssetUrl(fileName: string): string {
  return apiUrl(`${FACEBOOK_PROMO_BASE_PATH}/${fileName}`);
}

export function facebookPromoAssetLinks(): FacebookPromoAssetLink[] {
  return [
    ...FACEBOOK_PROMO_DOCS.map(([file, label]) => ({ file, label })),
    ...FACEBOOK_PROMO_VIDEOS.map(([file, label]) => ({ file, label })),
    ...FACEBOOK_PROMO_IMAGES.map(([file, label]) => ({ file, label })),
  ];
}

function absoluteUrl(url: string): string {
  if (url.startsWith('http')) return url;
  if (typeof window === 'undefined') return url;
  return `${window.location.origin}${url}`;
}

async function saveBlobDownload(fileName: string, blob: Blob): Promise<void> {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

async function downloadViaFetch(url: string, fileName: string): Promise<void> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  await saveBlobDownload(fileName, await res.blob());
}

export async function downloadFacebookPromoAsset(fileName: string): Promise<void> {
  const url = absoluteUrl(facebookPromoAssetUrl(fileName));
  if (isNativeApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await downloadViaFetch(url, fileName);
}

export async function downloadFacebookPromoZip(): Promise<void> {
  const url = absoluteUrl(facebookPromoZipUrl());
  if (isNativeApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await downloadViaFetch(url, FACEBOOK_PROMO_ZIP_NAME);
}
