import type { AndroidVersionManifest } from '../hooks/useInstallVersions';
import { isNativeApp } from './nativePlatform';

/** Canonical production origin (www — apex redirects here). */
export const APP_ORIGIN = 'https://www.sacramentobuynothing.com';

/** Zip of Play listing graphics (icon, feature graphic, phone screenshots). */
export const PLAY_STORE_SCREENSHOTS_ZIP_PATH = '/downloads/play-store-screenshots.zip';
export const PLAY_STORE_SCREENSHOTS_ZIP_NAME = 'play-store-screenshots.zip';

/** Website URL so the native app downloads from the live site, not the APK bundle. */
export function playStoreScreenshotsZipUrl(): string {
  if (typeof window === 'undefined' || isNativeApp()) {
    return `${APP_ORIGIN}${PLAY_STORE_SCREENSHOTS_ZIP_PATH}`;
  }
  return PLAY_STORE_SCREENSHOTS_ZIP_PATH;
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
