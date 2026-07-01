import { useCallback, useEffect, useState } from 'react';
import type { AwardsUnlockStatus, UserProfile } from '../types';
import { getEventsUnlockStatus } from '../lib/eventsApi';
import { isStaffRole } from '../lib/roles';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export function useEventsUnlock(userProfile?: UserProfile | null) {
  const [unlockStatus, setUnlockStatus] = useState<AwardsUnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = isStaffRole(userProfile?.role);

  const reload = useCallback(async () => {
    const status = await getEventsUnlockStatus();
    setUnlockStatus(status);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    const unsub = subscribePostgresChanges(
      { channelName: 'live-events-unlock', table: 'users', event: 'INSERT' },
      refresh,
    );

    return unsub;
  }, [reload]);

  const isCommunityUnlocked = unlockStatus?.unlocked ?? false;
  const canAccessEvents = isCommunityUnlocked || canManage;

  return {
    unlockStatus,
    loading,
    isCommunityUnlocked,
    canAccessEvents,
    canManage,
    reload,
  };
}
