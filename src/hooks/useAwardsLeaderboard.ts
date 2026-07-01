import { useCallback, useEffect, useState } from 'react';
import type { AwardLeaderboardEntry } from '../types';
import { getAwardsLeaderboard } from '../lib/awardsApi';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useAwardsLeaderboard(enabled: boolean, limit = 25) {
  const [entries, setEntries] = useState<AwardLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    if (!enabled) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const rows = await getAwardsLeaderboard(limit);
    setEntries(rows);
    setLoading(false);
  }, [enabled, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = debounceRealtime(() => {
      void reload();
    }, 200);

    const unsub = subscribePostgresChanges(
      { channelName: 'live-awards-leaderboard', table: 'user_awards', event: '*' },
      refresh,
    );

    return unsub;
  }, [enabled, reload]);

  return { entries, loading, reload };
}
