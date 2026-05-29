import { useEffect, useState, useCallback } from 'react';
import { ItemComment, UserProfile } from '../types';
import {
  createSupabaseItemComment,
  getSupabaseItemComments,
  getSupabaseItemVotes,
  setSupabaseItemVote,
} from '../supabase';

export interface PostVoteState {
  userVote: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
}

export function useItemsEngagement(
  itemIds: string[],
  userProfile: UserProfile | null,
) {
  const [itemVotes, setItemVotes] = useState<Record<string, PostVoteState>>({});
  const [itemComments, setItemComments] = useState<Record<string, ItemComment[]>>({});
  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});

  const uid = userProfile?.uid ?? '';

  const getVotesForPost = useCallback(
    (postId: string): PostVoteState =>
      itemVotes[postId] ?? { userVote: null, upvotes: 0, downvotes: 0 },
    [itemVotes],
  );

  const getCommentsForPost = useCallback(
    (postId: string): ItemComment[] => itemComments[postId] ?? [],
    [itemComments],
  );

  useEffect(() => {
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

    setSupabaseItemVote(itemId, uid, newUserVote).catch((err) => {
      console.warn('Failed to persist vote:', err);
      setItemVotes((prev) => ({ ...prev, [itemId]: current }));
    });
  };

  const handleAddComment = (itemId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForPost(itemId);
    const newComment: ItemComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      itemId,
      userId: userProfile.uid,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
    };

    setItemComments((prev) => ({
      ...prev,
      [itemId]: [...current, newComment],
    }));

    createSupabaseItemComment(newComment).catch((err) => {
      console.warn('Failed to persist comment:', err);
      setItemComments((prev) => ({ ...prev, [itemId]: current }));
    });
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

  return {
    getVotesForPost,
    getCommentsForPost,
    expandedPostComments,
    toggleComments,
    setCommentsExpanded,
    handleVote,
    handleAddComment,
  };
}
