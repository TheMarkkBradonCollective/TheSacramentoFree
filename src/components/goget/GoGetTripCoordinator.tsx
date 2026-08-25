import { useCallback, useEffect, useState } from 'react';
import type { GoGetSession, UserProfile } from '../../types';
import { supportsGoGetCoordination } from '../../lib/goGetEligibility';
import { getLockedGoGetSessionForUser, subscribeToUserGoGetSessions } from '../../lib/goGetSessions';
import { isGoGetTripLocked } from '../../lib/goGetTripLock';
import GoGetTripLockScreen from './GoGetTripLockScreen';

interface GoGetTripCoordinatorProps {
  userProfile: UserProfile | null;
  onPickupCompleted?: () => void;
}

export default function GoGetTripCoordinator({
  userProfile,
  onPickupCompleted,
}: GoGetTripCoordinatorProps) {
  const [session, setSession] = useState<GoGetSession | null>(null);

  const load = useCallback(async () => {
    if (!userProfile?.uid) {
      setSession(null);
      return;
    }
    const next = await getLockedGoGetSessionForUser(userProfile.uid);
    setSession(next);
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.uid || !supportsGoGetCoordination()) {
      setSession(null);
      return;
    }
    void load();
    const unsubscribe = subscribeToUserGoGetSessions(userProfile.uid, () => {
      void load();
    });
    const poll = window.setInterval(() => {
      void load();
    }, 6000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [userProfile?.uid, load]);

  if (!userProfile || !session || !isGoGetTripLocked(session, userProfile.uid)) return null;

  return (
    <GoGetTripLockScreen
      session={session}
      userProfile={userProfile}
      onSessionChange={(next) => {
        setSession(isGoGetTripLocked(next, userProfile.uid) ? next : null);
      }}
      onClosed={() => setSession(null)}
      onPickupCompleted={onPickupCompleted}
    />
  );
}
