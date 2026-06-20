/** Returns an http(s) URL safe for href attributes, or null if invalid. */
export function safeHttpUrl(raw: string | undefined | null): string | null {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
