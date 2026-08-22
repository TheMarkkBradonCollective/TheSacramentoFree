import { useCallback, useEffect, useState } from 'react';
import type { AwardsUnlockStatus, UserProfile } from '../types';
import { getEventsUnlockStatus } from '../lib/eventsApi';
import { isStaffRole } from '../lib/roles';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { isPlayStoreDemo, PLAY_STORE_DEMO_EVENTS_UNLOCK } from '../preview/playStoreDemo';

export function useEventsUnlock(userProfile?: UserProfile | null) {
  const [unlockStatus, setUnlockStatus] = useState<AwardsUnlockStatus | null>(
    () => (isPlayStoreDemo() ? PLAY_STORE_DEMO_EVENTS_UNLOCK : null),
  );
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());

  const canManage = isStaffRole(userProfile?.role);

  const reload = useCallback(async () => {
    if (isPlayStoreDemo()) {
      setUnlockStatus(PLAY_STORE_DEMO_EVENTS_UNLOCK);
      setLoading(false);
      return;
    }
    const status = await getEventsUnlockStatus();
    setUnlockStatus(status);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
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
