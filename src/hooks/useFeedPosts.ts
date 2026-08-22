import { useCallback, useEffect, useState } from 'react';
import type { FeedPost } from '../types';
import { createFeedPost, createFeedPollPost, deleteFeedPost, getFeedPosts, FEED_POST_DELETED_EVENT, notifyFeedPostDeleted } from '../lib/feedApi';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { patchDenormalizedAuthorFields } from '../lib/profilePersistence';
import type { UserProfile } from '../types';
import { isStaffRole } from '../lib/roles';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmDeleteFeedPost } from '../lib/destructiveConfirm';
import { isPlayStoreDemo, PLAY_STORE_DEMO_FEED_POSTS } from '../preview/playStoreDemo';

export function useFeedPosts(userProfile: UserProfile | null) {
  const [posts, setPosts] = useState<FeedPost[]>(() => (isPlayStoreDemo() ? PLAY_STORE_DEMO_FEED_POSTS : []));
  const [loading, setLoading] = useState(() => !isPlayStoreDemo());
  const [creating, setCreating] = useState(false);
  const { confirm, alert } = useConfirm();
  const isStaff = userProfile ? isStaffRole(userProfile.role) : false;

  const reload = useCallback(async () => {
    if (isPlayStoreDemo()) {
      setPosts(PLAY_STORE_DEMO_FEED_POSTS);
      setLoading(false);
      return;
    }
    const data = await getFeedPosts(80);
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    return subscribePostgresChanges<FeedPost>(
      { channelName: 'live-feed-posts', table: 'feed_posts', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

  useEffect(() => {
    const onDeleted = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    };
    window.addEventListener(FEED_POST_DELETED_EVENT, onDeleted);
    return () => window.removeEventListener(FEED_POST_DELETED_EVENT, onDeleted);
  }, []);

  useEffect(() => {
    if (!userProfile || isPlayStoreDemo()) return;

    return subscribePostgresChanges(
      { channelName: 'live-feed-author-photos', table: 'users', event: 'UPDATE' },
      (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        if (!row?.uid) return;

        const uid = String(row.uid);
        const displayName = typeof row.displayName === 'string' ? row.displayName : undefined;
        const photoURL = row.photoURL != null ? String(row.photoURL) : undefined;

        setPosts((prev) =>
          prev.map((post) =>
            patchDenormalizedAuthorFields(post, {
              authorId: post.userId,
              uid,
              displayName,
              photoURL,
            }),
          ),
        );
      },
    );
  }, [userProfile?.uid]);

  const publishPost = useCallback(
    async (input: { text: string; imageFiles: File[] }) => {
      if (!userProfile) return false;
      setCreating(true);
      const result = await createFeedPost(userProfile, input);
      setCreating(false);
      if (!result.ok || !result.post) {
        await alert({ title: 'Could not post', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setPosts((prev) => [result.post!, ...prev.filter((p) => p.id !== result.post!.id)]);
      return true;
    },
    [userProfile, alert],
  );

  const publishPoll = useCallback(
    async (input: { text: string; options: string[] }) => {
      if (!userProfile) return false;
      setCreating(true);
      const result = await createFeedPollPost(userProfile, input);
      setCreating(false);
      if (!result.ok || !result.post) {
        await alert({ title: 'Could not post poll', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setPosts((prev) => [result.post!, ...prev.filter((p) => p.id !== result.post!.id)]);
      return true;
    },
    [userProfile, alert],
  );

  const removePost = useCallback(
    async (post: FeedPost) => {
      if (!userProfile) return false;
      const ok = await confirmDeleteFeedPost(confirm, isStaff && post.userId !== userProfile.uid);
      if (!ok) return false;
      const result = await deleteFeedPost(post.id, userProfile.uid, isStaff);
      if (!result.ok) {
        await alert({ title: 'Could not delete', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      notifyFeedPostDeleted(post.id);
      return true;
    },
    [userProfile, isStaff, confirm, alert],
  );

  return { posts, loading, creating, publishPost, publishPoll, removePost, reload };
}
