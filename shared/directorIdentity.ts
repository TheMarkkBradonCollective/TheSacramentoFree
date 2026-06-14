/** The only Buy Nothing Director account — all director identity pulls from this profile. */
export const DIRECTOR_UID = '204b071f-100c-401d-b76d-40c594e1f132';

export function isDirectorUser(uid: string): boolean {
  return uid === DIRECTOR_UID;
}

/** Director account check — UID only (not role or email). */
export function isDirectorAccount(uid: string): boolean {
  return isDirectorUser(uid);
}
