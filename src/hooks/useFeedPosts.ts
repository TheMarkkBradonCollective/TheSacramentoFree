import { useCallback, useEffect, useState } from 'react';
import type { FeedPost } from '../types';
import { createFeedPost, deleteFeedPost, getFeedPosts } from '../lib/feedApi';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import type { UserProfile } from '../types';
import { isStaffRole } from '../lib/roles';
import { useConfirm } from '../contexts/ConfirmContext';

export function useFeedPosts(userProfile: UserProfile | null) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { confirm, alert } = useConfirm();
  const isStaff = userProfile ? isStaffRole(userProfile.role) : false;

  const reload = useCallback(async () => {
    const data = await getFeedPosts(80);
    setPosts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    return subscribePostgresChanges<FeedPost>(
      { channelName: 'live-feed-posts', table: 'feed_posts', event: '*' },
      () => {
        void reload();
      },
    );
  }, [reload]);

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

  const removePost = useCallback(
    async (post: FeedPost) => {
      if (!userProfile) return false;
      const ok = await confirm({
        title: 'Delete post?',
        message: isStaff && post.userId !== userProfile.uid
          ? 'Remove this neighbor post as staff?'
          : 'Delete your post for everyone?',
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!ok) return false;
      const result = await deleteFeedPost(post.id, userProfile.uid, isStaff);
      if (!result.ok) {
        await alert({ title: 'Could not delete', message: result.errorMessage || 'Try again.' });
        return false;
      }
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      return true;
    },
    [userProfile, isStaff, confirm, alert],
  );

  return { posts, loading, creating, publishPost, removePost, reload };
}
