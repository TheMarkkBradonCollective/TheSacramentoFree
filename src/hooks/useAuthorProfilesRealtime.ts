import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { ItemPost } from '../types';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

/** Keep listing author names/avatars in sync when neighbors update their profile. */
export function useAuthorProfilesRealtime(
  enabled: boolean,
  setItems: Dispatch<SetStateAction<ItemPost[]>>,
) {
  useEffect(() => {
    if (!enabled) return;

    return subscribePostgresChanges(
      { channelName: 'live-user-profiles', table: 'users', event: 'UPDATE' },
      (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        if (!row?.uid) return;

        const uid = String(row.uid);
        const displayName = typeof row.displayName === 'string' ? row.displayName : undefined;
        const photoURL = row.photoURL != null ? String(row.photoURL) : undefined;

        setItems((prev) =>
          prev.map((item) => {
            if (item.userId !== uid) return item;
            return {
              ...item,
              ...(displayName ? { userDisplayName: displayName } : {}),
              ...(photoURL !== undefined ? { userPhotoURL: photoURL || undefined } : {}),
            };
          }),
        );
      },
    );
  }, [enabled, setItems]);
}
