import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAwardsUnlockStatus, getUserAwards } from '../lib/awardsApi';
import { readSeenAwardGrantIds, writeSeenAwardGrantIds } from '../lib/awardsSeen';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useAwardsGlow(userId?: string | null) {
  const [unlocked, setUnlocked] = useState(false);
  const [grantIds, setGrantIds] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setUnlocked(false);
      setGrantIds([]);
      setSeenIds(new Set());
      setReady(false);
      return;
    }

    const [status, awards] = await Promise.all([getAwardsUnlockStatus(), getUserAwards(userId)]);
    setUnlocked(status.unlocked);
    setGrantIds(awards.map((row) => row.id));
    setSeenIds(readSeenAwardGrantIds(userId));
    setReady(true);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!userId) return;

    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    return subscribePostgresChanges(
      {
        channelName: `live-awards-glow-${userId}`,
        table: 'user_awards',
        event: '*',
        filter: `userId=eq.${userId}`,
      },
      refresh,
    );
  }, [reload, userId]);

  const hasNewAwards = useMemo(
    () => grantIds.some((id) => !seenIds.has(id)),
    [grantIds, seenIds],
  );

  const shouldGlow = ready && Boolean(userId) && (!unlocked || hasNewAwards);

  const markAwardsSeen = useCallback(() => {
    if (!userId) return;
    writeSeenAwardGrantIds(userId, grantIds);
    setSeenIds(new Set(grantIds));
  }, [grantIds, userId]);

  return { shouldGlow, markAwardsSeen, hasNewAwards, unlocked };
}
