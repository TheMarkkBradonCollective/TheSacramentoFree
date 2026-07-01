import { useEffect, useRef } from 'react';
import type { ItemPost } from '../types';

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

/**
 * Track bookmarked listing status changes for UI state.
 * Push alerts for saved-item updates are delivered server-side via
 * /api/webhooks/supabase-push → runSavedItemsStatusNotify when items.status changes.
 */
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
      prevById.current.set(item.id, item.status);
    }
  }, [enabled, userId, items]);
}
