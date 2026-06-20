const SAFE_PUSH_URL = /^\/[a-zA-Z0-9/_?#=&%.-]*$/;

/** Push deep links must stay on-site (relative paths only). */
export function sanitizePushUrl(raw: string | undefined | null): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '/';
  if (SAFE_PUSH_URL.test(trimmed)) return trimmed;
  return '/';
}
