import { useMemo, useState, Fragment } from 'react';
import { Newspaper, Plus, Sparkles } from 'lucide-react';
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
  const [composerOpen, setComposerOpen] = useState(false);
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
    <div className="space-y-3" id="community_feed_view">
      <div className="space-y-1 min-w-0" id="feed_view_mode_bar">
        <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
          <div className="shrink-0">
            <button
              type="button"
              id="feed_new_post_btn"
              onClick={() => setComposerOpen((open) => !open)}
              className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                composerOpen
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-accent bg-accent text-on-accent hover:bg-accent-hover'
              }`}
              aria-expanded={composerOpen}
              aria-label="New feed post"
              title="New feed post"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span>New</span>
            </button>
          </div>
          <div className="flex-1 min-w-0 flex justify-center px-0.5">
            <span
              className="inline-flex items-center justify-center rounded-xl border border-app bg-inset px-2 py-1.5 sm:px-2.5 text-[11px] sm:text-xs font-bold text-app whitespace-nowrap"
              id="feed_scope_label"
            >
              Neighbors
            </span>
          </div>
        </div>
      </div>

      {composerOpen && (
        <FeedPostComposer
          userProfile={userProfile}
          creating={creating}
          onPublish={async (input) => {
            const ok = await publishPost(input);
            if (ok) setComposerOpen(false);
            return ok;
          }}
          onCancel={() => setComposerOpen(false)}
        />
      )}

      {loading && visiblePosts.length === 0 && !composerOpen ? (
        <ItemGridSkeleton count={3} />
      ) : visiblePosts.length === 0 && !composerOpen ? (
        <div className="sbn-card text-center py-12 px-6 border-dashed" id="empty_neighbor_feed_state">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/25 text-accent mb-3">
            <Newspaper className="w-7 h-7" aria-hidden />
          </span>
          <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Neighbor feed
          </p>
          <h3 className="font-display text-lg font-bold text-app mt-2">No posts yet</h3>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
            Share a thought or photo with neighbors — comments, reactions, and votes live here.
          </p>
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="sbn-btn sbn-btn-primary sbn-btn-sm mt-4"
          >
            Say hi
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-2.5" id="neighbor_feed_cards">
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
