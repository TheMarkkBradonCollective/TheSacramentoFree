import type { AndroidVersionManifest } from '../hooks/useInstallVersions';
import { isNativeApp } from './nativePlatform';

/** Canonical production origin (www — apex redirects here). */
export const APP_ORIGIN = 'https://www.sacramentobuynothing.com';

/** Public path for individual Play listing graphics. */
export const PLAY_STORE_ASSETS_PATH = '/downloads/play-store';

export type PlayStoreAsset = {
  fileName: string;
  label: string;
  detail?: string;
};

/** Play Console listing graphics — download individually from the director panel. */
export const PLAY_STORE_ASSETS: PlayStoreAsset[] = [
  { fileName: 'icon-512.png', label: 'Store icon', detail: '512×512 PNG' },
  { fileName: 'feature-graphic-1024x500.png', label: 'Feature graphic', detail: '1024×500 PNG' },
  { fileName: '01-home.png', label: '01 — Home', detail: 'Public newspaper home' },
  { fileName: '02-feed.png', label: '02 — Feed', detail: 'Neighbor social posts' },
  { fileName: '03-stuff.png', label: '03 — Stuff', detail: 'Giveaways and requests' },
  { fileName: '04-listing.png', label: '04 — Listing', detail: 'Listing detail' },
  { fileName: '05-map.png', label: '05 — Map', detail: 'Neighborhood map' },
  { fileName: '06-events.png', label: '06 — Events', detail: 'Community events' },
  { fileName: '07-event.png', label: '07 — Event', detail: 'Event detail' },
  { fileName: '08-messages.png', label: '08 — Messages', detail: 'Messages' },
];

/** Website URL so the native app downloads from the live site, not the APK bundle. */
export function playStoreAssetUrl(fileName: string): string {
  const path = `${PLAY_STORE_ASSETS_PATH}/${fileName}`;
  if (typeof window === 'undefined' || isNativeApp()) {
    return `${APP_ORIGIN}${path}`;
  }
  return path;
}

/** Build a cache-busted APK download URL so browsers never serve a stale file. */
export function apkDownloadUrl(manifest: Pick<AndroidVersionManifest, 'downloadUrl' | 'versionCode' | 'fileName'> | null): string | null {
  if (!manifest?.downloadUrl) return null;

  const url = new URL(manifest.downloadUrl, APP_ORIGIN);
  url.searchParams.set('build', String(manifest.versionCode));
  return url.toString();
}

/** Build a cache-busted AAB download URL for sideload / developer bundles. */
export function aabDownloadUrl(
  manifest: Pick<AndroidVersionManifest, 'aabDownloadUrl' | 'versionCode' | 'aabFileName'> | null,
): string | null {
  if (!manifest?.aabDownloadUrl) return null;

  const url = new URL(manifest.aabDownloadUrl, APP_ORIGIN);
  url.searchParams.set('build', String(manifest.versionCode));
  return url.toString();
}
