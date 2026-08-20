import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import type { ProfileFriend } from '../types';
import { getProfileFriends } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import UserAvatar from './UserAvatar';

interface ProfileFriendsRowProps {
  userId: string;
  viewerUserId: string;
  isOwnProfile?: boolean;
  maxDisplay?: number;
  onViewProfile?: (userId: string) => void;
}

export default function ProfileFriendsRow({
  userId,
  viewerUserId,
  isOwnProfile = false,
  maxDisplay = 12,
  onViewProfile,
}: ProfileFriendsRowProps) {
  const [friends, setFriends] = useState<ProfileFriend[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const rows = await getProfileFriends(userId, viewerUserId);
    setFriends(rows);
    setLoading(false);
  }, [userId, viewerUserId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  useEffect(() => {
    const debounced = debounceRealtime(() => {
      void reload();
    }, 250);

    return subscribePostgresChanges(
      { channelName: `live-profile-friends-${userId}`, table: 'friend_requests', event: '*' },
      debounced,
    );
  }, [userId, reload]);

  if (loading) return null;

  if (friends.length === 0) {
    if (!isOwnProfile) return null;
    return (
      <div className="w-full mt-4 pt-4 border-t border-app text-left" id="profile_friends_row">
        <p className="text-xs font-bold text-app flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-accent" aria-hidden />
          Friends
        </p>
        <p className="text-[11px] text-muted leading-relaxed">
          No friends yet — send requests from neighbor profiles to connect.
        </p>
      </div>
    );
  }

  const shown = friends.slice(0, maxDisplay);
  const extra = friends.length - shown.length;

  return (
    <div className="w-full mt-4 pt-4 border-t border-app text-left" id="profile_friends_row">
      <p className="text-xs font-bold text-app flex items-center gap-1.5 mb-2">
        <Users className="w-3.5 h-3.5 text-accent" aria-hidden />
        Friends
        <span className="text-muted font-semibold">({friends.length})</span>
      </p>
      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
        {shown.map((friend) => {
          const clickable = Boolean(onViewProfile) && friend.userId !== viewerUserId;
          const body = (
            <>
              <UserAvatar src={friend.photoURL} name={friend.displayName} size="sm" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[11px] font-bold text-app truncate">{friend.displayName}</span>
                <span className="block text-[10px] text-muted truncate">{friend.neighborhood}</span>
              </span>
            </>
          );

          if (clickable) {
            return (
              <button
                key={friend.userId}
                type="button"
                onClick={() => onViewProfile?.(friend.userId)}
                className="inline-flex items-center gap-2 min-w-[8.5rem] max-w-[11rem] rounded-xl border border-app bg-inset px-2 py-1.5 hover:border-accent/40 hover:bg-surface-hover transition-colors text-left"
              >
                {body}
              </button>
            );
          }

          return (
            <div
              key={friend.userId}
              className="inline-flex items-center gap-2 min-w-[8.5rem] max-w-[11rem] rounded-xl border border-app bg-inset px-2 py-1.5"
            >
              {body}
            </div>
          );
        })}
        {extra > 0 && (
          <span className="text-[10px] text-muted font-semibold self-center px-1">+{extra} more</span>
        )}
      </div>
    </div>
  );
}
