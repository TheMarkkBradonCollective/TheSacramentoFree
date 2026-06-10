/** Must stay in sync with src/supabase.ts director constants. */
export const DIRECTOR_UIDS = new Set(['204b071f-100c-401d-b76d-40c594e1f132']);
export const DIRECTOR_EMAIL = 'sigsecspec@gmail.com';

export function isDirectorUser(uid: string, email?: string | null): boolean {
  return DIRECTOR_UIDS.has(uid) || (email?.toLowerCase() === DIRECTOR_EMAIL);
}

/** Director by DB role or hardcoded account identity (client uses the latter for UI). */
export function isDirectorAccount(uid: string, role?: unknown, email?: string | null): boolean {
  const normalized = typeof role === 'string' ? role.trim() : '';
  return normalized === 'director' || isDirectorUser(uid, email);
}
