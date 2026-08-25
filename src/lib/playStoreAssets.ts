import { apiUrl } from './appOrigin';
import { PLAY_STORE_SCREENSHOTS_ZIP_NAME, playStoreScreenshotsZipUrl } from './apkDownload';
import { isNativeApp } from './nativePlatform';

export const PLAY_STORE_ASSETS_BASE_PATH = '/downloads/play-store';

export const PLAY_STORE_ICON = {
  file: 'icon-512.png',
  label: 'Store icon (512×512)',
};

export const PLAY_STORE_FEATURE_GRAPHIC = {
  file: 'feature-graphic-1024x500.png',
  label: 'Feature graphic (1024×500)',
};

export const PLAY_STORE_PHONE_SCREENSHOTS = [
  ['01-home.png', 'Home — newspaper front page'],
  ['02-feed.png', 'Feed — neighbor social posts'],
  ['03-stuff.png', 'Stuff — giveaways and requests'],
  ['04-listing.png', 'Listing detail'],
  ['05-map.png', 'Neighborhood map'],
  ['06-events.png', 'Community events'],
  ['07-event.png', 'Event detail'],
  ['08-messages.png', 'Messages'],
  ['09-goget-listing.png', 'Go Get — listing pickup route'],
  ['10-goget-chat.png', 'Go Get — chat coordination'],
  ['11-goget-ring.png', 'Go Get — incoming pickup ring'],
  ['12-goget-waiting.png', 'Go Get — waiting for neighbor'],
  ['13-goget-navigation.png', 'Go Get — turn-by-turn navigation'],
  ['14-goget-tracking.png', 'Go Get — live ETA tracking'],
  ['15-goget-meeting.png', 'Go Get — meetup map'],
  ['16-goget-arrived.png', 'Go Get — arrival handoff'],
] as const;

export type PlayStoreAssetLink = {
  file: string;
  label: string;
};

export function playStoreAssetUrl(fileName: string): string {
  return apiUrl(`${PLAY_STORE_ASSETS_BASE_PATH}/${fileName}`);
}

export function playStoreAssetLinks(): PlayStoreAssetLink[] {
  return [
    { file: PLAY_STORE_ICON.file, label: PLAY_STORE_ICON.label },
    { file: PLAY_STORE_FEATURE_GRAPHIC.file, label: PLAY_STORE_FEATURE_GRAPHIC.label },
    ...PLAY_STORE_PHONE_SCREENSHOTS.map(([file, label]) => ({ file, label })),
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

/** Fetch + save — Capacitor WebView ignores `<a download>`, so open in browser there. */
export async function downloadPlayStoreAsset(fileName: string): Promise<void> {
  const url = absoluteUrl(playStoreAssetUrl(fileName));
  if (isNativeApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await downloadViaFetch(url, fileName);
}

export async function downloadPlayStoreZip(): Promise<void> {
  const url = absoluteUrl(playStoreScreenshotsZipUrl());
  if (isNativeApp()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await downloadViaFetch(url, PLAY_STORE_SCREENSHOTS_ZIP_NAME);
}
