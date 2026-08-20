import { useMemo, useState, Fragment } from 'react';
import { ImageIcon, Newspaper, Plus, Sparkles, Type } from 'lucide-react';
import type { FeedPost, UserProfile } from '../types';
import { useFeedEngagement } from '../hooks/useFeedEngagement';
import { useFeedPosts } from '../hooks/useFeedPosts';
import FeedPostComposer from './feed/FeedPostComposer';
import FeedPostCard from './feed/FeedPostCard';
import { ItemGridSkeleton } from './Skeleton';
import {
  feedPostMatchesContentFilter,
  readFeedContentFilter,
  writeFeedContentFilter,
  type FeedContentFilter,
} from '../lib/feedDisplayPrefs';

interface FeedViewProps {
  userProfile: UserProfile;
  blockedUserIds?: Set<string>;
  onViewProfile?: (userId: string) => void;
  onViewFeedPost?: (post: FeedPost) => void;
}

const FEED_CONTENT_TABS: Array<{
  value: FeedContentFilter;
  label: string;
  icon: typeof Type;
}> = [
  { value: 'all', label: 'All', icon: Newspaper },
  { value: 'text', label: 'Text', icon: Type },
  { value: 'pictures', label: 'Pictures', icon: ImageIcon },
];

function emptyFeedMessage(filter: FeedContentFilter): { title: string; body: string } {
  if (filter === 'text') {
    return {
      title: 'No text posts yet',
      body: 'Text-only neighbor posts will show up here.',
    };
  }
  if (filter === 'pictures') {
    return {
      title: 'No picture posts yet',
      body: 'Posts with photos will show up here.',
    };
  }
  return {
    title: 'No posts yet',
    body: 'Share a thought or photo with neighbors — comments, reactions, and votes live here.',
  };
}

export default function FeedView({
  userProfile,
  blockedUserIds = new Set(),
  onViewProfile,
  onViewFeedPost,
}: FeedViewProps) {
  const { posts, loading, creating, publishPost, removePost } = useFeedPosts(userProfile);
  const [composerOpen, setComposerOpen] = useState(false);
  const [contentFilter, setContentFilter] = useState<FeedContentFilter>(() => readFeedContentFilter());

  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedUserIds.has(p.userId)),
    [posts, blockedUserIds],
  );

  const filteredPosts = useMemo(
    () => visiblePosts.filter((post) => feedPostMatchesContentFilter(post, contentFilter)),
    [visiblePosts, contentFilter],
  );

  const postIds = useMemo(() => filteredPosts.map((p) => p.id), [filteredPosts]);
  const engagement = useFeedEngagement(postIds, userProfile, blockedUserIds);

  const handleContentFilterChange = (filter: FeedContentFilter) => {
    setContentFilter(filter);
    writeFeedContentFilter(filter);
  };

  const emptyCopy = emptyFeedMessage(contentFilter);
  const showEmpty = !loading && filteredPosts.length === 0 && !composerOpen;

  return (
    <div className="space-y-3" id="community_feed_view">
      <div className="space-y-2 min-w-0" id="feed_view_mode_bar">
        <div
          className="inline-flex w-full rounded-xl border border-app bg-inset p-0.5"
          role="tablist"
          aria-label="Feed content"
          id="feed_content_tabs"
        >
          {FEED_CONTENT_TABS.map(({ value, label, icon: Icon }) => {
            const selected = contentFilter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`feed_content_tab_${value}`}
                aria-selected={selected}
                onClick={() => handleContentFilterChange(value)}
                className={`flex-1 inline-flex items-center justify-center gap-1 rounded-[0.65rem] px-2 py-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  selected
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-app hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

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
      ) : showEmpty ? (
        <div className="sbn-card text-center py-12 px-6 border-dashed" id="empty_neighbor_feed_state">
          <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/25 text-accent mb-3">
            <Newspaper className="w-7 h-7" aria-hidden />
          </span>
          <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Neighbor feed
          </p>
          <h3 className="font-display text-lg font-bold text-app mt-2">{emptyCopy.title}</h3>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">{emptyCopy.body}</p>
          {contentFilter === 'all' ? (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="sbn-btn sbn-btn-primary sbn-btn-sm mt-4"
            >
              Say hi
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleContentFilterChange('all')}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm mt-4"
            >
              Show all posts
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-2.5" id="neighbor_feed_cards">
          {filteredPosts.map((post) => (
            <Fragment key={post.id}>
              <FeedPostCard
                post={post}
                userProfile={userProfile}
                engagement={engagement}
                onViewPost={onViewFeedPost}
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
