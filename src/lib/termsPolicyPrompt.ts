/** Bump when terms text changes — all users must re-accept. */
export const TERMS_POLICY_VERSION = 'v1';

const STORAGE_PREFIX = 'sbn_terms_policy_accepted_';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${TERMS_POLICY_VERSION}_${userId}`;
}

export function isTermsAccepted(userId: string | null | undefined): boolean {
  if (!userId || typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKey(userId)) === 'true';
}

export function acceptTerms(userId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(userId), 'true');
}
