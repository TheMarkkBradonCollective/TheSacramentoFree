const STORAGE_PREFIX = 'sbn_awards_seen_v1';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function readSeenAwardGrantIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

export function writeSeenAwardGrantIds(userId: string, grantIds: string[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...new Set(grantIds)]));
  } catch {
    // ignore quota / private mode
  }
}
