import { useCallback, useEffect, useRef, useState } from 'react';
import { AppUpdateComment, UserProfile } from '../types';
import {
  createSupabaseAppUpdateComment,
  deleteSupabaseAppUpdateComment,
  getSupabaseAppUpdateComments,
} from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useConfirm } from '../contexts/ConfirmContext';

export function useAppUpdateComments(
  updateIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const [commentsByUpdate, setCommentsByUpdate] = useState<Record<string, AppUpdateComment[]>>({});
  const uid = userProfile?.uid ?? '';
  const { confirm } = useConfirm();
  const updateIdSetRef = useRef(new Set<string>());

  const getCommentsForUpdate = useCallback(
    (updateId: string): AppUpdateComment[] =>
      (commentsByUpdate[updateId] ?? []).filter((comment) => !blockedUserIds.has(comment.userId)),
    [commentsByUpdate, blockedUserIds],
  );

  useEffect(() => {
    updateIdSetRef.current = new Set(updateIds);
  }, [updateIds.join('|')]);

  useEffect(() => {
    if (!updateIds.length) {
      setCommentsByUpdate({});
      return;
    }

    let mounted = true;

    const loadComments = async () => {
      const rows = await getSupabaseAppUpdateComments(updateIds);
      if (!mounted) return;

      const next: Record<string, AppUpdateComment[]> = {};
      for (const updateId of updateIds) {
        next[updateId] = rows.filter((row) => row.updateId === updateId);
      }
      setCommentsByUpdate(next);
    };

    void loadComments();
    return () => {
      mounted = false;
    };
  }, [updateIds.join('|')]);

  const reloadCommentsForUpdates = useCallback(
    debounceRealtime(async (ids: string[]) => {
      const tracked = ids.filter((id) => updateIdSetRef.current.has(id));
      if (!tracked.length) return;

      const rows = await getSupabaseAppUpdateComments(tracked);
      setCommentsByUpdate((prev) => {
        const next = { ...prev };
        for (const updateId of tracked) {
          next[updateId] = rows.filter((row) => row.updateId === updateId);
        }
        return next;
      });
    }, 150),
    [],
  );

  useEffect(() => {
    if (!updateIds.length) return;

    return subscribePostgresChanges<AppUpdateComment>(
      { channelName: 'live-app-update-comments', table: 'app_update_comments', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as AppUpdateComment | null;
        if (!row?.updateId || !updateIdSetRef.current.has(row.updateId)) return;
        if (payload.eventType === 'INSERT' && row.userId === uid) return;
        void reloadCommentsForUpdates([row.updateId]);
      },
    );
  }, [updateIds.join('|'), uid, reloadCommentsForUpdates]);

  const handleAddComment = (updateId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForUpdate(updateId);
    const newComment: AppUpdateComment = {
      id: `app_update_comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      updateId,
      userId: userProfile.uid,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
    };

    setCommentsByUpdate((prev) => ({
      ...prev,
      [updateId]: [...current, newComment],
    }));

    createSupabaseAppUpdateComment(newComment).catch((err) => {
      console.warn('Failed to persist update comment:', err);
      setCommentsByUpdate((prev) => ({ ...prev, [updateId]: current }));
    });
  };

  const handleDeleteComment = async (updateId: string, commentId: string) => {
    if (!uid) return;
    const confirmed = await confirm({
      message: 'Remove your comment?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;

    const current = getCommentsForUpdate(updateId);
    const next = current.filter((comment) => comment.id !== commentId);
    setCommentsByUpdate((prev) => ({ ...prev, [updateId]: next }));

    const result = await deleteSupabaseAppUpdateComment(commentId, uid);
    if (!result.ok) {
      setCommentsByUpdate((prev) => ({ ...prev, [updateId]: current }));
      console.warn('Failed to delete update comment:', result.errorMessage);
    }
  };

  return {
    getCommentsForUpdate,
    handleAddComment,
    handleDeleteComment,
  };
}
