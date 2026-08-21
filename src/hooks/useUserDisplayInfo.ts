import { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '../types';
import { getUserDisplayInfoByIds } from '../supabase';
import {
  resolveIdentityDisplayName,
  resolveIdentityPhotoForDisplay,
  resolveProfileIdentity,
} from '../lib/profilePersistence';

export type UserDisplayInfo = {
  displayName: string;
  photoURL?: string;
  role?: UserProfile['role'];
};

function mergeDisplayInfo(
  prev: Record<string, UserDisplayInfo>,
  fetched: Record<string, UserDisplayInfo>,
  viewerProfile?: UserProfile | null,
): Record<string, UserDisplayInfo> {
  const next = { ...prev };

  if (viewerProfile?.uid) {
    const resolved = resolveProfileIdentity(viewerProfile);
    next[viewerProfile.uid] = {
      displayName: resolved.displayName,
      photoURL: resolved.photoURL,
      role: viewerProfile.role,
    };
  }

  for (const [uid, row] of Object.entries(fetched)) {
    const existing = next[uid];
    next[uid] = {
      displayName: resolveIdentityDisplayName({
        existingDisplayName: existing?.displayName,
        incomingDisplayName: row.displayName,
      }),
      photoURL: resolveIdentityPhotoForDisplay(row.photoURL, existing?.photoURL),
      role: row.role ?? existing?.role,
    };
  }

  return next;
}

/** Live profile photos + roles for a set of neighbor uids (comments, reviews, etc.). */
export function useUserDisplayInfo(userIds: string[], viewerProfile?: UserProfile | null) {
  const [info, setInfo] = useState<Record<string, UserDisplayInfo>>(() =>
    viewerProfile?.uid
      ? {
          [viewerProfile.uid]: {
            ...resolveProfileIdentity(viewerProfile),
            role: viewerProfile.role,
          },
        }
      : {},
  );

  const key = useMemo(
    () => [...new Set(userIds.filter(Boolean))].sort().join(','),
    [userIds],
  );

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (!ids.length) {
      setInfo(
        viewerProfile?.uid
          ? {
              [viewerProfile.uid]: {
                ...resolveProfileIdentity(viewerProfile),
                role: viewerProfile.role,
              },
            }
          : {},
      );
      return;
    }

    void getUserDisplayInfoByIds(ids).then((fetched) => {
      setInfo((prev) => mergeDisplayInfo(prev, fetched, viewerProfile));
    });
  }, [key, viewerProfile?.uid, viewerProfile?.displayName, viewerProfile?.photoURL, viewerProfile?.role]);

  return info;
}
