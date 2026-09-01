import { apiUrl } from './appOrigin';
import { FACEBOOK_PROMO_ZIP_NAME, facebookPromoZipUrl } from './apkDownload';
import { isNativeApp } from './nativePlatform';

export const FACEBOOK_PROMO_BASE_PATH = '/downloads/facebook';

export const FACEBOOK_PROMO_IMAGES = [
  ['01-timeline-square-hero.png', 'Timeline square 1080×1080 — Stuff giveaways'],
  ['02-timeline-portrait-hero.png', 'Timeline 4:5 1080×1350 — Stuff (recommended feed size)'],
  ['03-timeline-landscape.png', 'Timeline landscape 1200×630 — link / wide post'],
  ['04-page-cover.png', 'Page cover 1640×624'],
  ['05-timeline-square-goget.png', 'Timeline square — Go Get pickup'],
  ['06-timeline-square-feed.png', 'Timeline square — neighbor feed'],
  ['07-timeline-square-values.png', 'Timeline square — no selling, no ads'],
  ['08-timeline-portrait-goget.png', 'Timeline 4:5 — Go Get navigation'],
  ['carousel-01-home.png', 'Carousel 1 — Home'],
  ['carousel-02-feed.png', 'Carousel 2 — Feed'],
  ['carousel-03-stuff.png', 'Carousel 3 — Stuff'],
  ['carousel-04-map.png', 'Carousel 4 — Map'],
  ['carousel-05-events.png', 'Carousel 5 — Events'],
  ['carousel-06-goget.png', 'Carousel 6 — Go Get'],
] as const;

export const FACEBOOK_PROMO_VIDEOS = [
  ['timeline-square-app-tour.mp4', 'Timeline square video 1080×1080 — app screenshot tour'],
  ['timeline-portrait-app-tour.mp4', 'Timeline 4:5 video 1080×1350 — app screenshot tour'],
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
