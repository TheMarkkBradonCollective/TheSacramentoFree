/** Bump when policy text changes — all users must re-accept. */
export const PRIVACY_POLICY_VERSION = 'v2';

const STORAGE_PREFIX = 'sbn_privacy_policy_accepted_';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${PRIVACY_POLICY_VERSION}_${userId}`;
}

export function isPrivacyAccepted(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKey(userId)) === 'true';
}

export function acceptPrivacy(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId), 'true');
}
