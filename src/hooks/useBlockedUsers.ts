import { useCallback, useEffect, useState } from 'react';
import { getHiddenUserIds } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useBlockedUsers(userId: string | undefined) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  const reloadBlockedUsers = useCallback(async () => {
    if (!userId) {
      setBlockedUserIds(new Set());
      return;
    }
    const ids = await getHiddenUserIds(userId);
    setBlockedUserIds(new Set(ids));
  }, [userId]);

  useEffect(() => {
    void reloadBlockedUsers();
    if (!userId) return;

    const unsub = subscribePostgresChanges(
      { channelName: `live-blocks-${userId}`, table: 'user_blocks', event: '*' },
      () => {
        void reloadBlockedUsers();
      },
    );

    return unsub;
  }, [userId, reloadBlockedUsers]);

  const isBlocked = useCallback(
    (otherUserId: string) => blockedUserIds.has(otherUserId),
    [blockedUserIds],
  );

  return { blockedUserIds, isBlocked, reloadBlockedUsers };
}
