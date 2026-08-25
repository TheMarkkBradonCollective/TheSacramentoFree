import { useEffect, useState, useCallback, useRef } from 'react';
import { ItemComment, ItemVote, UserProfile } from '../types';
import {
  createSupabaseItemComment,
  deleteSupabaseItemComment,
  getSupabaseItemComments,
  getSupabaseItemVotes,
  setSupabaseItemVote,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { commentPostedAsNeighbor } from '../lib/staffInteractionMode';
import { resolveProfileIdentity } from '../lib/profilePersistence';
import { VOTE_COOLDOWN_MESSAGE } from '../lib/voteCooldown';
import { takeSafetyCooldownBlockMessage } from '../lib/safetyCooldowns';
import { useConfirm } from '../contexts/ConfirmContext';
import { isStaffRole } from '../lib/roles';
import { isPlayStoreDemo, PLAY_STORE_DEMO_ITEM_COMMENTS, PLAY_STORE_DEMO_ITEM_VOTES } from '../preview/playStoreDemo';

export interface PostVoteState {
  userVote: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
}

export function useItemsEngagement(
  itemIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const [itemVotes, setItemVotes] = useState<Record<string, PostVoteState>>(
    () => (isPlayStoreDemo() ? PLAY_STORE_DEMO_ITEM_VOTES : {}),
  );
  const [itemComments, setItemComments] = useState<Record<string, ItemComment[]>>(
    () => (isPlayStoreDemo() ? PLAY_STORE_DEMO_ITEM_COMMENTS : {}),
  );
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});

  const uid = userProfile?.uid ?? '';
  const isStaff = userProfile ? isStaffRole(userProfile.role) : false;
  const { alert } = useConfirm();
  const itemIdSetRef = useRef(new Set<string>());

  const getVotesForPost = useCallback(
    (postId: string): PostVoteState =>
      itemVotes[postId] ?? { userVote: null, upvotes: 0, downvotes: 0 },
    [itemVotes],
  );

  const getCommentsForPost = useCallback(
    (postId: string): ItemComment[] =>
      (itemComments[postId] ?? []).filter((comment) => !blockedUserIds.has(comment.userId)),
    [itemComments, blockedUserIds],
  );

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    if (!uid || itemIds.length === 0) {
      setItemVotes({});
      setItemComments({});
      return;
    }

    let mounted = true;

    const loadEngagement = async () => {
      const [votes, comments] = await Promise.all([
        getSupabaseItemVotes(itemIds),
        getSupabaseItemComments(itemIds),
      ]);
      if (!mounted) return;

      const nextVotes: Record<string, PostVoteState> = {};
      for (const itemId of itemIds) {
        const votesForItem = votes.filter((vote) => vote.itemId === itemId);
        nextVotes[itemId] = {
          userVote: (votesForItem.find((vote) => vote.userId === uid)?.voteType || null) as
            | 'up'
            | 'down'
            | null,
          upvotes: votesForItem.filter((vote) => vote.voteType === 'up').length,
          downvotes: votesForItem.filter((vote) => vote.voteType === 'down').length,
        };
      }
      setItemVotes(nextVotes);

      const nextComments: Record<string, ItemComment[]> = {};
      for (const itemId of itemIds) {
        nextComments[itemId] = comments.filter((comment) => comment.itemId === itemId);
      }
      setItemComments(nextComments);
    };

    loadEngagement();
    return () => {
      mounted = false;
    };
  }, [itemIds.join('|'), uid]);

  useEffect(() => {
    itemIdSetRef.current = new Set(itemIds);
  }, [itemIds.join('|')]);

  useEffect(() => {
    if (isPlayStoreDemo() || !uid || itemIds.length === 0) return;

    const patchVotes = (payload: { eventType: string; new: ItemVote | null; old: ItemVote | null }) => {
      const row = (payload.new || payload.old) as ItemVote | null;
      if (!row?.itemId || !itemIdSetRef.current.has(row.itemId)) return;
      if (row.userId === uid && payload.eventType !== 'DELETE') return;

      setItemVotes((prev) => {
        const current = prev[row.itemId] ?? { userVote: null, upvotes: 0, downvotes: 0 };
        let upvotes = current.upvotes;
        let downvotes = current.downvotes;
        let userVote = current.userVote;

        const removeVote = (vote: ItemVote) => {
          if (vote.voteType === 'up') upvotes = Math.max(0, upvotes - 1);
          else downvotes = Math.max(0, downvotes - 1);
          if (vote.userId === uid) userVote = null;
        };

        const addVote = (vote: ItemVote) => {
          if (vote.voteType === 'up') upvotes += 1;
          else downvotes += 1;
          if (vote.userId === uid) userVote = vote.voteType;
        };

        if (payload.old) removeVote(payload.old);
        if (payload.eventType !== 'DELETE' && payload.new) addVote(payload.new);

        return { ...prev, [row.itemId]: { userVote, upvotes, downvotes } };
      });
    };

    const patchComments = (payload: { eventType: string; new: ItemComment | null; old: ItemComment | null }) => {
      const row = (payload.new || payload.old) as ItemComment | null;
      if (!row?.itemId || !itemIdSetRef.current.has(row.itemId)) return;
      if (payload.eventType === 'INSERT' && row.userId === uid) return;

      setItemComments((prev) => {
        const list = prev[row.itemId] ?? [];
        if (payload.eventType === 'DELETE' && payload.old) {
          return {
            ...prev,
            [row.itemId]: list.filter((c) => c.id !== payload.old!.id && c.parentCommentId !== payload.old!.id),
          };
        }
        if (payload.new) {
          const updated = payload.new;
          const idx = list.findIndex((c) => c.id === updated.id);
          if (idx >= 0) {
            const next = [...list];
            next[idx] = updated;
            return { ...prev, [row.itemId]: next };
          }
          return { ...prev, [row.itemId]: [...list, updated] };
        }
        return prev;
      });
    };

    const unsubVotes = subscribePostgresChanges<ItemVote>(
      { channelName: 'live-item-votes', table: 'item_votes', event: '*' },
      (payload) => patchVotes(payload as { eventType: string; new: ItemVote | null; old: ItemVote | null }),
    );

    const unsubComments = subscribePostgresChanges<ItemComment>(
      { channelName: 'live-item-comments', table: 'item_comments', event: '*' },
      (payload) => patchComments(payload as { eventType: string; new: ItemComment | null; old: ItemComment | null }),
    );

    return () => {
      unsubVotes();
      unsubComments();
    };
  }, [uid, itemIds.join('|')]);

  const handleVote = (itemId: string, posterUserId: string, direction: 'up' | 'down') => {
    if (!uid || posterUserId === uid) return;

    const current = getVotesForPost(itemId);

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

    setItemVotes((prev) => ({
      ...prev,
      [itemId]: {
        userVote: newUserVote,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
      },
    }));

    void setSupabaseItemVote(itemId, uid, newUserVote).then((result) => {
      if (result.ok) return;
      setItemVotes((prev) => ({ ...prev, [itemId]: current }));
      if (result.ok === false && result.reason === 'vote_cooldown') {
        void alert({ message: VOTE_COOLDOWN_MESSAGE });
      }
    });
  };

  const handleAddComment = (itemId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForPost(itemId);
    const identity = resolveProfileIdentity(userProfile);
    const newComment: ItemComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      itemId,
      userId: userProfile.uid,
      userName: identity.displayName,
      userPhoto: identity.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
      postedAsNeighbor: commentPostedAsNeighbor(userProfile) || undefined,
    };

    setItemComments((prev) => ({
      ...prev,
      [itemId]: [...current, newComment],
    }));

    void createSupabaseItemComment(newComment).then((ok) => {
      if (ok) return;
      setItemComments((prev) => ({ ...prev, [itemId]: current }));
      void alert({
        title: 'Could not comment',
        message: takeSafetyCooldownBlockMessage() || 'Your comment was not saved. Please try again.',
      });
    }).catch((err) => {
      console.warn('Failed to persist comment:', err);
      setItemComments((prev) => ({ ...prev, [itemId]: current }));
      void alert({ title: 'Could not comment', message: 'Your comment was not saved. Please try again.' });
    });
  };

  const handleDeleteComment = async (itemId: string, commentId: string) => {
    if (!uid) return;

    const current = getCommentsForPost(itemId);
    const next = current.filter((c) => c.id !== commentId);
    setItemComments((prev) => ({ ...prev, [itemId]: next }));

    const result = await deleteSupabaseItemComment(commentId, uid, isStaff);
    if (!result.ok) {
      setItemComments((prev) => ({ ...prev, [itemId]: current }));
      void alert({ title: 'Could not delete comment', message: result.errorMessage || 'Please try again.' });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedPostComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const setCommentsExpanded = (postId: string, expanded: boolean) => {
    setExpandedPostComments((prev) => ({ ...prev, [postId]: expanded }));
  };

  const ensureEngagementForPost = useCallback(async (postId: string) => {
    if (!uid || !postId) return;
    const [votes, comments] = await Promise.all([
      getSupabaseItemVotes([postId]),
      getSupabaseItemComments([postId]),
    ]);

    const votesForItem = votes.filter((vote) => vote.itemId === postId);
    setItemVotes((prev) => ({
      ...prev,
      [postId]: {
        userVote: (votesForItem.find((vote) => vote.userId === uid)?.voteType || null) as
          | 'up'
          | 'down'
          | null,
        upvotes: votesForItem.filter((vote) => vote.voteType === 'up').length,
        downvotes: votesForItem.filter((vote) => vote.voteType === 'down').length,
      },
    }));

    setItemComments((prev) => ({
      ...prev,
      [postId]: comments.filter((comment) => comment.itemId === postId),
    }));
  }, [uid]);

  return {
    getVotesForPost,
    getCommentsForPost,
    expandedPostComments,
    toggleComments,
    setCommentsExpanded,
    ensureEngagementForPost,
    handleVote,
    handleAddComment,
    handleDeleteComment,
  };
}
