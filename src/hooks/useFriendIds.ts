import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAcceptedFriendIds } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

export function useFriendIds(userId: string | undefined): {
  friendIds: Set<string>;
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());

  const reload = useCallback(async () => {
    if (!userId || isPlayStoreDemo()) {
      setFriendIds([]);
      setLoading(false);
      return;
    }
    const ids = await getAcceptedFriendIds(userId);
    setFriendIds(ids);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isPlayStoreDemo()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId || isPlayStoreDemo()) return;
    return subscribePostgresChanges(
      { channelName: `live-friends-${userId}`, table: 'friend_requests', event: '*' },
      () => {
        void reload();
      },
    );
  }, [userId, reload]);

  const friendIdSet = useMemo(() => new Set(friendIds), [friendIds]);

  return { friendIds: friendIdSet, loading, reload };
}
