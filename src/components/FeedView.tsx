import { useMemo, Fragment } from 'react';
import type { UserProfile } from '../types';
import { useFeedEngagement } from '../hooks/useFeedEngagement';
import { useFeedPosts } from '../hooks/useFeedPosts';
import FeedPostComposer from './feed/FeedPostComposer';
import FeedPostCard from './feed/FeedPostCard';
import { ItemGridSkeleton } from './Skeleton';

interface FeedViewProps {
  userProfile: UserProfile;
  blockedUserIds?: Set<string>;
  onViewProfile?: (userId: string) => void;
}

export default function FeedView({
  userProfile,
  blockedUserIds = new Set(),
  onViewProfile,
}: FeedViewProps) {
  const { posts, loading, creating, publishPost, removePost } = useFeedPosts(userProfile);
  const postIds = useMemo(
    () => posts.filter((p) => !blockedUserIds.has(p.userId)).map((p) => p.id),
    [posts, blockedUserIds],
  );
  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedUserIds.has(p.userId)),
    [posts, blockedUserIds],
  );
  const engagement = useFeedEngagement(postIds, userProfile, blockedUserIds);

  return (
    <div className="space-y-4 pb-6" id="community_feed_view">
      <FeedPostComposer userProfile={userProfile} creating={creating} onPublish={publishPost} />

      {loading && visiblePosts.length === 0 ? (
        <ItemGridSkeleton count={3} />
      ) : visiblePosts.length === 0 ? (
        <div className="sbn-card text-center py-12 px-6 border-dashed">
          <p className="text-sm text-muted">No posts yet — say hi to the neighborhood.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <Fragment key={post.id}>
              <FeedPostCard
                post={post}
                userProfile={userProfile}
                engagement={engagement}
                onViewProfile={onViewProfile}
                onDeletePost={removePost}
              />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
