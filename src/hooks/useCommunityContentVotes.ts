import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CommunityContentVote,
  CommunityContentVoteTarget,
  ContentVoteState,
  UserProfile,
} from '../types';
import { getSupabaseCommunityContentVotes, setSupabaseCommunityContentVote } from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { VOTE_COOLDOWN_MESSAGE } from '../lib/voteCooldown';
import { useConfirm } from '../contexts/ConfirmContext';
import { isPlayStoreDemo } from '../preview/playStoreDemo';

const EMPTY_VOTE: ContentVoteState = { userVote: null, upvotes: 0, downvotes: 0 };

function aggregateVotes(
  rows: CommunityContentVote[],
  targetType: CommunityContentVoteTarget,
  targetId: string,
  userId?: string,
): ContentVoteState {
  const relevant = rows.filter((row) => row.targetType === targetType && row.targetId === targetId);
  let upvotes = 0;
  let downvotes = 0;
  let userVote: 'up' | 'down' | null = null;
  for (const row of relevant) {
    if (row.voteType === 'up') upvotes += 1;
    else downvotes += 1;
    if (userId && row.userId === userId) userVote = row.voteType;
  }
  return { userVote, upvotes, downvotes };
}

export function useCommunityContentVotes(
  targetType: CommunityContentVoteTarget,
  targetIds: string[],
  userProfile?: UserProfile | null,
) {
  const uid = userProfile?.uid;
  const [rows, setRows] = useState<CommunityContentVote[]>([]);
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());
  const { alert } = useConfirm();

  const stableIds = useMemo(() => [...new Set(targetIds)].filter(Boolean).sort().join('|'), [targetIds]);

  const reload = useCallback(async () => {
    if (isPlayStoreDemo()) {
      setRows([]);
      setLoading(false);
      return;
    }
    const ids = stableIds ? stableIds.split('|') : [];
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    const data = await getSupabaseCommunityContentVotes(targetType, ids);
    setRows(data);
    setLoading(false);
  }, [stableIds, targetType]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    return subscribePostgresChanges<CommunityContentVote>(
      { channelName: `live-content-votes-${targetType}`, table: 'community_content_votes', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload, targetType]);

  const getVoteState = useCallback(
    (targetId: string): ContentVoteState => aggregateVotes(rows, targetType, targetId, uid),
    [rows, targetType, uid],
  );

  const handleVote = useCallback(
    (targetId: string, direction: 'up' | 'down', options?: { blockSelfId?: string }) => {
      if (!uid) return false;
      if (options?.blockSelfId && options.blockSelfId === uid) return false;

      const current = aggregateVotes(rows, targetType, targetId, uid);
      let newUserVote: 'up' | 'down' | null = null;
      let newUpvotes = current.upvotes;
      let newDownvotes = current.downvotes;

      if (current.userVote === direction) {
        newUserVote = null;
        if (direction === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
        else newDownvotes = Math.max(0, newDownvotes - 1);
      } else {
        if (current.userVote === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
        if (current.userVote === 'down') newDownvotes = Math.max(0, newDownvotes - 1);
        newUserVote = direction;
        if (direction === 'up') newUpvotes += 1;
        else newDownvotes += 1;
      }

      const optimisticId = `${targetType}_${targetId}_${uid}`;
      setRows((prev) => {
        const without = prev.filter(
          (row) => !(row.targetType === targetType && row.targetId === targetId && row.userId === uid),
        );
        if (!newUserVote) return without;
        return [
          ...without,
          {
            id: optimisticId,
            targetType,
            targetId,
            userId: uid,
            voteType: newUserVote,
            createdAt: new Date().toISOString(),
          },
        ];
      });

      void setSupabaseCommunityContentVote(targetType, targetId, uid, newUserVote).then((result) => {
        if (result.ok) return;
        void reload();
        if (result.ok === false && result.reason === 'vote_cooldown') {
          void alert({ message: VOTE_COOLDOWN_MESSAGE });
        }
      });
      return true;
    },
    [uid, rows, targetType, reload, alert],
  );

  return { loading, getVoteState, handleVote, reload };
}

export { EMPTY_VOTE };
