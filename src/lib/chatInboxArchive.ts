/** Per-user archived inbox conversations (local device; chat + support only). */

export type InboxArchiveKind = 'chat' | 'support';

function storageKey(userId: string): string {
  return `sbn_chat_inbox_archive_v1_${userId}`;
}

function readRaw(userId: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeRaw(userId: string, keys: string[]): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

export function inboxArchiveKey(kind: InboxArchiveKind, id: string): string {
  return `${kind}:${id}`;
}

export function readArchivedInboxKeys(userId: string): Set<string> {
  return new Set(readRaw(userId));
}

export function isInboxArchived(userId: string, kind: InboxArchiveKind, id: string): boolean {
  return readArchivedInboxKeys(userId).has(inboxArchiveKey(kind, id));
}

export function archiveInboxConversation(userId: string, kind: InboxArchiveKind, id: string): Set<string> {
  const keys = readRaw(userId);
  const key = inboxArchiveKey(kind, id);
  if (!keys.includes(key)) keys.push(key);
  writeRaw(userId, keys);
  return new Set(keys);
}

export function unarchiveInboxConversation(userId: string, kind: InboxArchiveKind, id: string): Set<string> {
  const key = inboxArchiveKey(kind, id);
  const next = readRaw(userId).filter((k) => k !== key);
  writeRaw(userId, next);
  return new Set(next);
}
