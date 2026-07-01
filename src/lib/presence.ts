/** Neighbors active within this window show as online (green dot). */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function isUserOnline(lastActiveAt?: string | null, nowMs = Date.now()): boolean {
  if (!lastActiveAt) return false;
  const at = new Date(lastActiveAt).getTime();
  if (Number.isNaN(at)) return false;
  return nowMs - at < ONLINE_THRESHOLD_MS;
}

export function formatLastActive(lastActiveAt?: string | null, nowMs = Date.now()): string {
  if (!lastActiveAt) return 'Last active unknown';
  if (isUserOnline(lastActiveAt, nowMs)) return 'Active now';

  const at = new Date(lastActiveAt).getTime();
  if (Number.isNaN(at)) return 'Last active unknown';

  const diffMs = nowMs - at;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Active just now';
  if (mins < 60) return `Last active ${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last active ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Last active ${days}d ago`;

  return `Last active ${new Date(lastActiveAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function dicebearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}
