export type HubContentTab = 'announcements' | 'updates';

const PREFIX = 'sbn_notifications_hub_seen_v1';

function key(userId: string, tab: HubContentTab): string {
  return `${PREFIX}:${tab}:${userId}`;
}

export function readHubTabSeenAt(userId: string, tab: HubContentTab): string | null {
  try {
    const raw = localStorage.getItem(key(userId, tab));
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function writeHubTabSeenAt(userId: string, tab: HubContentTab, iso: string = new Date().toISOString()): void {
  try {
    localStorage.setItem(key(userId, tab), iso);
  } catch {
    // ignore
  }
}
