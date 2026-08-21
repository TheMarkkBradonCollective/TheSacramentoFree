const STORAGE_KEY = 'sbn_rebrand_letter_seen_v1';

export function hasSeenRebrandAnnouncement(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markRebrandAnnouncementSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}
