import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AwardDefinition,
  AwardDefinitionInput,
  AwardsUnlockStatus,
  UserAward,
  UserProfile,
} from '../types';
import {
  getAwardDefinitions,
  getAwardsUnlockStatus,
  getUserAwards,
  staffCreateAwardDefinition,
  staffGrantAward,
  staffRevokeAward,
  staffUpdateAwardDefinition,
} from '../lib/awardsApi';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { canManageAwards } from '../lib/roles';

export function useAwards(userProfile?: UserProfile | null, targetUserId?: string | null) {
  const [definitions, setDefinitions] = useState<AwardDefinition[]>([]);
  const [userAwards, setUserAwards] = useState<UserAward[]>([]);
  const [unlockStatus, setUnlockStatus] = useState<AwardsUnlockStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const viewUserId = targetUserId || userProfile?.uid || null;
  const canManage = canManageAwards(userProfile?.role);

  const reload = useCallback(async () => {
    const [defs, status] = await Promise.all([getAwardDefinitions(), getAwardsUnlockStatus()]);
    setDefinitions(defs);
    setUnlockStatus(status);

    if (viewUserId) {
      const grants = await getUserAwards(viewUserId);
      setUserAwards(grants);
    } else {
      setUserAwards([]);
    }

    setLoading(false);
  }, [viewUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reload();
    }, 150);

    const unsubUsers = subscribePostgresChanges(
      { channelName: 'live-awards-unlock', table: 'users', event: 'INSERT' },
      refresh,
    );
    const unsubDefs = subscribePostgresChanges(
      { channelName: 'live-award-definitions', table: 'award_definitions', event: '*' },
      refresh,
    );
    const unsubGrants = subscribePostgresChanges(
      { channelName: 'live-user-awards', table: 'user_awards', event: '*' },
      refresh,
    );

    return () => {
      unsubUsers();
      unsubDefs();
      unsubGrants();
    };
  }, [reload]);

  const earnedAwardIds = useMemo(
    () => new Set(userAwards.map((row) => row.awardId)),
    [userAwards],
  );

  const earnedSlugs = useMemo(
    () => new Set(userAwards.map((row) => row.award?.slug).filter(Boolean) as string[]),
    [userAwards],
  );

  const isCommunityUnlocked = unlockStatus?.unlocked ?? false;
  const canAccessAwards = isCommunityUnlocked || canManage;

  const createDefinition = async (input: AwardDefinitionInput) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff.' };
    const result = await staffCreateAwardDefinition(input, userProfile);
    if (result.ok) await reload();
    return result;
  };

  const updateDefinition = async (id: string, input: Partial<AwardDefinitionInput>) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff.' };
    const result = await staffUpdateAwardDefinition(id, input, userProfile);
    if (result.ok) await reload();
    return result;
  };

  const grantAward = async (targetUid: string, slug: string) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff.' };
    const result = await staffGrantAward(targetUid, slug, userProfile);
    if (result.ok) await reload();
    return result;
  };

  const revokeAward = async (targetUid: string, slug: string) => {
    if (!userProfile) return { ok: false, errorMessage: 'Sign in as staff.' };
    const result = await staffRevokeAward(targetUid, slug, userProfile);
    if (result.ok) await reload();
    return result;
  };

  return {
    definitions,
    userAwards,
    unlockStatus,
    loading,
    earnedAwardIds,
    earnedSlugs,
    isCommunityUnlocked,
    canAccessAwards,
    canManage,
    reload,
    createDefinition,
    updateDefinition,
    grantAward,
    revokeAward,
  };
}
