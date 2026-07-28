import type { AndroidVersionManifest } from '../hooks/useInstallVersions';

/** Canonical production origin (www — apex redirects here). */
export const APP_ORIGIN = 'https://www.sacramentobuynothing.com';

/** Build a cache-busted APK download URL so browsers never serve a stale file. */
export function apkDownloadUrl(manifest: Pick<AndroidVersionManifest, 'downloadUrl' | 'versionCode' | 'fileName'> | null): string | null {
  if (!manifest?.downloadUrl) return null;

  const url = new URL(manifest.downloadUrl, APP_ORIGIN);
  url.searchParams.set('build', String(manifest.versionCode));
  return url.toString();
}
