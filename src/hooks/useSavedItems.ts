import { useCallback, useEffect, useState } from 'react';

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

export function useSavedItems() {
  const [savedIds, setSavedIds] = useState<Set<string>>(readSavedIds);

  // Sync across components/tabs via the storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SAVED_ITEMS_KEY) {
        setSavedIds(readSavedIds());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleSaved = useCallback((itemId: string) => {
    setSavedIds((prev: Set<string>) => {
      const next = new Set<string>(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      writeSavedIds(next);
      // Dispatch synthetic storage event so other hook instances on the same page sync up
      window.dispatchEvent(new StorageEvent('storage', { key: SAVED_ITEMS_KEY }));
      return next;
    });
  }, []);

  const isSaved = useCallback((itemId: string) => savedIds.has(itemId), [savedIds]);

  return { savedIds, toggleSaved, isSaved };
}
