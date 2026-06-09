import { useEffect, useRef } from 'react';
import type { ItemPost } from '../types';
import { notifySavedItemUpdate } from '../lib/pushEvents';

const SAVED_ITEMS_KEY = 'sbn_saved_items_v1';

function readSavedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SAVED_ITEMS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set<string>(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function statusLabel(status: ItemPost['status']): string {
  switch (status) {
    case 'pending_pickup':
      return 'Pending pickup';
    case 'on_hold':
      return 'On hold';
    case 'completed':
      return 'Gifted';
    case 'withdrawn':
      return 'Withdrawn';
    default:
      return 'Updated';
  }
}

/** Notify the current user when a bookmarked listing changes status. */
export function useSavedItemPushAlerts(
  enabled: boolean,
  userId: string | undefined,
  items: ItemPost[],
) {
  const prevById = useRef<Map<string, ItemPost['status']>>(new Map());

  useEffect(() => {
    if (!enabled || !userId) return;

    const savedIds = readSavedIds();
    if (!savedIds.size) return;

    for (const item of items) {
      if (!savedIds.has(item.id)) continue;

      const prevStatus = prevById.current.get(item.id);
      if (prevStatus !== undefined && prevStatus !== item.status) {
        void notifySavedItemUpdate({
          item,
          recipientUserId: userId,
          statusLabel: statusLabel(item.status),
        });
      }
      prevById.current.set(item.id, item.status);
    }
  }, [enabled, userId, items]);
}
