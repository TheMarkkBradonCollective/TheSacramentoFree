import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { CommunityEvent, FeedPost, ItemPost } from '../types';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

function patchAuthorProfile<T extends { userId: string; userDisplayName?: string; userPhotoURL?: string }>(
  rows: T[],
  uid: string,
  displayName?: string,
  photoURL?: string,
): T[] {
  return rows.map((row) => {
    if (row.userId !== uid) return row;
    return {
      ...row,
      ...(displayName ? { userDisplayName: displayName } : {}),
      ...(photoURL !== undefined ? { userPhotoURL: photoURL || undefined } : {}),
    };
  });
}

/** Keep author avatars in sync when neighbors update their profile photo. */
export function useAuthorProfilesRealtime(
  enabled: boolean,
  setItems: Dispatch<SetStateAction<ItemPost[]>>,
  setEvents?: Dispatch<SetStateAction<CommunityEvent[]>>,
  setFeedPosts?: Dispatch<SetStateAction<FeedPost[]>>,
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

        setItems((prev) => patchAuthorProfile(prev, uid, displayName, photoURL));
        setEvents?.((prev) => patchAuthorProfile(prev, uid, displayName, photoURL));
        setFeedPosts?.((prev) => patchAuthorProfile(prev, uid, displayName, photoURL));
      },
    );
  }, [enabled, setItems, setEvents, setFeedPosts]);
}
