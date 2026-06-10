import { useCallback, useEffect, useState } from 'react';
import { syncSavedItemBookmark } from '../supabase';

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

function writeSavedIds(ids: Set<string>) {
  try {
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify([...ids]));
  } catch {
    // storage quota exceeded — fail silently
  }
}

export function useSavedItems(userId?: string) {
  const [savedIds, setSavedIds] = useState<Set<string>>(readSavedIds);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_ITEMS_KEY) {
        setSavedIds(readSavedIds());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleSaved = useCallback(
    (itemId: string) => {
      setSavedIds((prev: Set<string>) => {
        const next = new Set<string>(prev);
        const willSave = !next.has(itemId);
        if (willSave) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        writeSavedIds(next);
        if (userId) {
          void syncSavedItemBookmark(userId, itemId, willSave);
        }
        window.dispatchEvent(new StorageEvent('storage', { key: SAVED_ITEMS_KEY }));
        return next;
      });
    },
    [userId],
  );

  const isSaved = useCallback((itemId: string) => savedIds.has(itemId), [savedIds]);

  return { savedIds, toggleSaved, isSaved };
}
