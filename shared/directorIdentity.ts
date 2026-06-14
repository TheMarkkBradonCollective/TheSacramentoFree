/** Server-side: director by users.role (not a hardcoded account id). */
export function isDirectorRole(role: unknown): boolean {
  return typeof role === 'string' && role.trim() === 'director';
}

export function isDirectorAccount(_uid: string, role?: unknown): boolean {
  return isDirectorRole(role);
}
