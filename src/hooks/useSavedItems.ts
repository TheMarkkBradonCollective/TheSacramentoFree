import { useCallback, useEffect, useState } from 'react';
import {
  fetchSavedItemIds,
  migrateLocalSavedItemsToDb,
  readLocalSavedItemIds,
  syncSavedItemBookmark,
  writeLocalSavedItemIds,
} from '../supabase';

export function useSavedItems(userId?: string) {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(readLocalSavedItemIds(userId)));

  useEffect(() => {
    setSavedIds(new Set(readLocalSavedItemIds(userId)));
    if (!userId) return;

    let cancelled = false;
    void (async () => {
      await migrateLocalSavedItemsToDb(userId);
      const fromDb = await fetchSavedItemIds(userId);
      if (cancelled) return;
      const merged = new Set([...readLocalSavedItemIds(userId), ...fromDb]);
      writeLocalSavedItemIds(userId, [...merged]);
      setSavedIds(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === 'sbn_saved_items_v1' || (userId && e.key === `sbn_saved_items_v1:${userId}`)) {
        setSavedIds(new Set(readLocalSavedItemIds(userId)));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

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
        writeLocalSavedItemIds(userId, [...next]);
        if (userId) {
          void syncSavedItemBookmark(userId, itemId, willSave);
        }
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: userId ? `sbn_saved_items_v1:${userId}` : 'sbn_saved_items_v1',
          }),
        );
        return next;
      });
    },
    [userId],
  );

  const isSaved = useCallback((itemId: string) => savedIds.has(itemId), [savedIds]);

  return { savedIds, toggleSaved, isSaved };
}
