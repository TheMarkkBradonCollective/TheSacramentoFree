import { SITE } from '../siteContent';
import type { UserProfile } from '../types';

/** Neighbors at or below this join rank may sideload APK/AAB from the website. */
export const APK_WEBSITE_JOIN_RANK_LIMIT = 500;

export function canDownloadApkFromWebsite(user: UserProfile | null | undefined): boolean {
  if (!user?.uid) return false;
  const rank = user.joinRank;
  // Older rows may have no joinRank yet — do not block testers/sideload.
  if (typeof rank !== 'number' || !Number.isFinite(rank)) return true;
  return rank >= 1 && rank <= APK_WEBSITE_JOIN_RANK_LIMIT;
}

/** Short copy when APK sideload is not available for this account. */
export function apkWebsiteAccessMessage(user: UserProfile | null | undefined): string {
  if (!user?.uid) {
    return `Free APK downloads on our website are for the first ${APK_WEBSITE_JOIN_RANK_LIMIT} neighbors after sign-in. Until then, use Google Play (if invited) or add ${SITE.shortName} to your home screen.`;
  }
  if (canDownloadApkFromWebsite(user)) return '';
  return `Free APK sideload on our website is limited to our first ${APK_WEBSITE_JOIN_RANK_LIMIT} neighbors (you joined later). Install the native Android app from Google Play, or use the home screen option below — same community, still free to use.`;
}
