import { useCallback, useEffect, useRef, useState } from 'react';
import { HelpAnnouncementComment, UserProfile } from '../types';
import {
  createSupabaseHelpAnnouncementComment,
  deleteSupabaseHelpAnnouncementComment,
  getSupabaseHelpAnnouncementComments,
} from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { commentPostedAsNeighbor } from '../lib/staffInteractionMode';
import { resolveProfileIdentity } from '../lib/profilePersistence';
import { takeSafetyCooldownBlockMessage } from '../lib/safetyCooldowns';
import { useConfirm } from '../contexts/ConfirmContext';

export function useHelpAnnouncementComments(
  announcementIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const [commentsByAnnouncement, setCommentsByAnnouncement] = useState<Record<string, HelpAnnouncementComment[]>>(
    {},
  );
  const uid = userProfile?.uid ?? '';
  const { alert } = useConfirm();
  const announcementIdSetRef = useRef(new Set<string>());

  const getCommentsForAnnouncement = useCallback(
    (announcementId: string): HelpAnnouncementComment[] =>
      (commentsByAnnouncement[announcementId] ?? []).filter(
        (comment) => !blockedUserIds.has(comment.userId),
      ),
    [commentsByAnnouncement, blockedUserIds],
  );

  useEffect(() => {
    announcementIdSetRef.current = new Set(announcementIds);
  }, [announcementIds.join('|')]);

  useEffect(() => {
    if (!announcementIds.length) {
      setCommentsByAnnouncement({});
      return;
    }

    let mounted = true;

    const loadComments = async () => {
      const rows = await getSupabaseHelpAnnouncementComments(announcementIds);
      if (!mounted) return;

      const next: Record<string, HelpAnnouncementComment[]> = {};
      for (const announcementId of announcementIds) {
        next[announcementId] = rows.filter((row) => row.announcementId === announcementId);
      }
      setCommentsByAnnouncement(next);
    };

    void loadComments();
    return () => {
      mounted = false;
    };
  }, [announcementIds.join('|')]);

  const reloadCommentsForAnnouncements = useCallback(
    debounceRealtime(async (ids: string[]) => {
      const tracked = ids.filter((id) => announcementIdSetRef.current.has(id));
      if (!tracked.length) return;

      const rows = await getSupabaseHelpAnnouncementComments(tracked);
      setCommentsByAnnouncement((prev) => {
        const next = { ...prev };
        for (const announcementId of tracked) {
          next[announcementId] = rows.filter((row) => row.announcementId === announcementId);
        }
        return next;
      });
    }, 150),
    [],
  );

  useEffect(() => {
    if (!announcementIds.length) return;

    return subscribePostgresChanges<HelpAnnouncementComment>(
      { channelName: 'live-help-announcement-comments', table: 'help_announcement_comments', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as HelpAnnouncementComment | null;
        if (!row?.announcementId || !announcementIdSetRef.current.has(row.announcementId)) return;
        if (payload.eventType === 'INSERT' && row.userId === uid) return;
        void reloadCommentsForAnnouncements([row.announcementId]);
      },
    );
  }, [announcementIds.join('|'), uid, reloadCommentsForAnnouncements]);

  const handleAddComment = (announcementId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForAnnouncement(announcementId);
    const identity = resolveProfileIdentity(userProfile);
    const newComment: HelpAnnouncementComment = {
      id: `help_announcement_comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      announcementId,
      userId: userProfile.uid,
      userName: identity.displayName,
      userPhoto: identity.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
      postedAsNeighbor: commentPostedAsNeighbor(userProfile) || undefined,
    };

    setCommentsByAnnouncement((prev) => ({
      ...prev,
      [announcementId]: [...current, newComment],
    }));

    createSupabaseHelpAnnouncementComment(newComment).then((ok) => {
      if (ok) return;
      setCommentsByAnnouncement((prev) => ({ ...prev, [announcementId]: current }));
      void alert({
        title: 'Could not comment',
        message: takeSafetyCooldownBlockMessage() || 'Your comment was not saved. Please try again.',
      });
    }).catch((err) => {
      console.warn('Failed to persist announcement comment:', err);
      setCommentsByAnnouncement((prev) => ({ ...prev, [announcementId]: current }));
      void alert({ title: 'Could not comment', message: 'Your comment was not saved. Please try again.' });
    });
  };

  const handleDeleteComment = async (announcementId: string, commentId: string) => {
    if (!uid) return;

    const current = getCommentsForAnnouncement(announcementId);
    const next = current.filter((comment) => comment.id !== commentId);
    setCommentsByAnnouncement((prev) => ({ ...prev, [announcementId]: next }));

    const result = await deleteSupabaseHelpAnnouncementComment(commentId, uid);
    if (!result.ok) {
      setCommentsByAnnouncement((prev) => ({ ...prev, [announcementId]: current }));
      void alert({ title: 'Could not delete comment', message: result.errorMessage || 'Please try again.' });
    }
  };

  return {
    getCommentsForAnnouncement,
    handleAddComment,
    handleDeleteComment,
  };
}
