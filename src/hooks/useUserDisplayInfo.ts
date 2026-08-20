import { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../types';
import { getUserDisplayInfoByIds } from '../supabase';

export type UserDisplayInfo = {
  displayName: string;
  photoURL?: string;
  role?: UserProfile['role'];
};

/** Live profile photos + roles for a set of neighbor uids (comments, reviews, etc.). */
export function useUserDisplayInfo(userIds: string[]) {
  const [info, setInfo] = useState<Record<string, UserDisplayInfo>>({});

  const key = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds],
  );

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) {
      setInfo({});
      return;
    }
    void getUserDisplayInfoByIds(ids).then(setInfo);
  }, [key]);

  return info;
}
