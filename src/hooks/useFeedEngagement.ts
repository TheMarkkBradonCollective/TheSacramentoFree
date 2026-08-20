import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedPostComment, FeedPostReaction, UserProfile } from '../types';
import {
  aggregateFeedReactions,
  createFeedPostComment,
  deleteFeedPostComment,
  getFeedPostComments,
  getFeedPostReactions,
  toggleFeedPostReaction,
} from '../lib/feedApi';
import { subscribePostgresChanges, debounceRealtime } from '../lib/supabaseRealtime';
import { useCommunityContentVotes } from './useCommunityContentVotes';
import type { FeedReactionEmoji } from '../lib/feedReactions';
import { isStaffRole } from '../lib/roles';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmRemoveFeedComment } from '../lib/destructiveConfirm';

export function useFeedEngagement(
  postIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const uid = userProfile?.uid ?? '';
  const isStaff = userProfile ? isStaffRole(userProfile.role) : false;
  const { confirm, alert } = useConfirm();

  const [commentsByPost, setCommentsByPost] = useState<Record<string, FeedPostComment[]>>({});
  const [reactionsByPost, setReactionsByPost] = useState<Record<string, FeedPostReaction[]>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const postIdSetRef = useRef(new Set<string>());
  const votesApi = useCommunityContentVotes('feed_post', postIds, userProfile);

  const getComments = useCallback(
    (postId: string) =>
      (commentsByPost[postId] ?? []).filter((c) => !blockedUserIds.has(c.userId)),
    [commentsByPost, blockedUserIds],
  );

  const getReactionState = useCallback(
    (postId: string) => aggregateFeedReactions(reactionsByPost[postId] ?? [], postId, uid),
    [reactionsByPost, uid],
  );

  useEffect(() => {
    postIdSetRef.current = new Set(postIds);
  }, [postIds.join('|')]);

  const reload = useCallback(
    debounceRealtime(async (ids: string[]) => {
      if (ids.length === 0) return;
      const tracked = ids.filter((id) => postIdSetRef.current.has(id));
      if (tracked.length === 0) return;
      const [comments, reactions] = await Promise.all([
        getFeedPostComments(tracked),
        getFeedPostReactions(tracked),
      ]);

      setCommentsByPost((prev) => {
        const next = { ...prev };
        for (const postId of tracked) {
          next[postId] = comments.filter((c) => c.postId === postId);
        }
        return next;
      });

      setReactionsByPost((prev) => {
        const next = { ...prev };
        for (const postId of tracked) {
          next[postId] = reactions.filter((r) => r.postId === postId);
        }
        return next;
      });
    }, 150),
    [],
  );

  useEffect(() => {
    if (postIds.length === 0) {
      setCommentsByPost({});
      setReactionsByPost({});
      return;
    }
    void reload(postIds);
  }, [postIds.join('|'), reload]);

  useEffect(() => {
    if (postIds.length === 0) return;

    const unsubComments = subscribePostgresChanges<FeedPostComment>(
      { channelName: 'live-feed-comments', table: 'feed_post_comments', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as FeedPostComment | null;
        if (!row?.postId || !postIdSetRef.current.has(row.postId)) return;
        if (payload.eventType === 'INSERT' && row.userId === uid) return;
        void reload([row.postId]);
      },
    );

    const unsubReactions = subscribePostgresChanges<FeedPostReaction>(
      { channelName: 'live-feed-reactions', table: 'feed_post_reactions', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as FeedPostReaction | null;
        if (!row?.postId || !postIdSetRef.current.has(row.postId)) return;
        void reload([row.postId]);
      },
    );

    return () => {
      unsubComments();
      unsubReactions();
    };
  }, [postIds.join('|'), uid, reload]);

  const toggleComments = useCallback((postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const addComment = useCallback(
    async (postId: string, text: string, parentCommentId?: string | null) => {
      if (!userProfile) return false;
      const result = await createFeedPostComment(userProfile, postId, text, parentCommentId);
      if (!result.ok || !result.comment) {
        await alert({ title: 'Could not comment', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), result.comment!],
      }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      return true;
    },
    [userProfile, alert],
  );

  const removeComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!uid) return false;
      const ok = await confirmRemoveFeedComment(confirm, isStaff);
      if (!ok) return false;
      const result = await deleteFeedPostComment(commentId, uid, isStaff);
      if (!result.ok) {
        await alert({ title: 'Could not remove', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId && c.parentCommentId !== commentId),
      }));
      return true;
    },
    [uid, isStaff, confirm, alert],
  );

  const toggleReaction = useCallback(
    async (postId: string, emoji: FeedReactionEmoji, postAuthorId?: string) => {
      if (!uid) return;
      if (postAuthorId && postAuthorId === uid) return;
      await toggleFeedPostReaction(postId, uid, emoji);
      void reload([postId]);
    },
    [uid, reload],
  );

  const handleVote = useCallback(
    (postId: string, direction: 'up' | 'down', authorId: string) => {
      return votesApi.handleVote(postId, direction, { blockSelfId: authorId });
    },
    [votesApi],
  );

  return {
    getComments,
    getReactionState,
    getVoteState: votesApi.getVoteState,
    expandedComments,
    toggleComments,
    addComment,
    removeComment,
    toggleReaction,
    handleVote,
    votesLoading: votesApi.loading,
  };
}

export type FeedEngagementApi = ReturnType<typeof useFeedEngagement>;
