import { useMemo, useState, useEffect, Fragment } from 'react';
import { ImageIcon, Newspaper, Plus, Sparkles, Type, Users } from 'lucide-react';
import type { FeedPost, UserProfile } from '../types';
import { useFeedEngagement } from '../hooks/useFeedEngagement';
import { useFeedPosts } from '../hooks/useFeedPosts';
import { useFriendIds } from '../hooks/useFriendIds';
import FeedPostComposer from './feed/FeedPostComposer';
import FeedPostCard from './feed/FeedPostCard';
import { ItemGridSkeleton } from './Skeleton';
import {
  cycleFeedAudienceScope,
  cycleFeedContentFilter,
  feedAudienceScopeLabel,
  feedContentFilterLabel,
  feedPostMatchesAudienceScope,
  feedPostMatchesContentFilter,
  resolveFeedDisplayFilters,
  writeFeedAudienceScope,
  writeFeedContentFilter,
  type FeedAudienceScope,
  type FeedContentFilter,
} from '../lib/feedDisplayPrefs';
import { persistUserAppPreferences } from '../lib/appPreferences';
import { isStaffRole } from '../lib/roles';

interface FeedViewProps {
  userProfile: UserProfile;
  blockedUserIds?: Set<string>;
  onViewProfile?: (userId: string) => void;
  onViewFeedPost?: (post: FeedPost) => void;
}

const FEED_CONTENT_ICONS: Record<FeedContentFilter, typeof Type> = {
  all: Newspaper,
  text: Type,
  pictures: ImageIcon,
};

function emptyFeedMessage(
  contentFilter: FeedContentFilter,
  audienceScope: FeedAudienceScope,
): { title: string; body: string } {
  if (audienceScope === 'friends') {
    return {
      title: 'No friend posts yet',
      body: 'Posts from neighbors you are friends with will show up here. Send friend requests from their profile.',
    };
  }
  if (audienceScope === 'neighbors') {
    return {
      title: 'No neighborhood posts yet',
      body: 'Posts from neighbors in your area will show up here.',
    };
  }
  if (contentFilter === 'text') {
    return {
      title: 'No text posts yet',
      body: 'Text-only neighbor posts will show up here.',
    };
  }
  if (contentFilter === 'pictures') {
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
  const { posts, loading, creating, publishPost, publishPoll, removePost } = useFeedPosts(userProfile);
  const canCreatePoll = isStaffRole(userProfile.role);
  const { friendIds, loading: friendsLoading } = useFriendIds(userProfile.uid);
  const [composerOpen, setComposerOpen] = useState(false);
  const [contentFilter, setContentFilter] = useState<FeedContentFilter>(
    () => resolveFeedDisplayFilters(userProfile).contentFilter,
  );
  const [audienceScope, setAudienceScope] = useState<FeedAudienceScope>(
    () => resolveFeedDisplayFilters(userProfile).audienceScope,
  );

  useEffect(() => {
    const next = resolveFeedDisplayFilters(userProfile);
    setContentFilter(next.contentFilter);
    setAudienceScope(next.audienceScope);
  }, [userProfile.uid, userProfile.appPreferences]);

  const persistDisplayFilters = (content: FeedContentFilter, audience: FeedAudienceScope) => {
    writeFeedContentFilter(content);
    writeFeedAudienceScope(audience);
    void persistUserAppPreferences(userProfile, {
      feedContentFilter: content,
      feedAudienceScope: audience,
    });
  };

  const audienceContext = useMemo(
    () => ({
      viewerUserId: userProfile.uid,
      viewerNeighborhood: userProfile.neighborhood,
      friendIds,
    }),
    [userProfile.uid, userProfile.neighborhood, friendIds],
  );

  const visiblePosts = useMemo(
    () => posts.filter((p) => !blockedUserIds.has(p.userId)),
    [posts, blockedUserIds],
  );

  const filteredPosts = useMemo(
    () =>
      visiblePosts.filter(
        (post) =>
          feedPostMatchesContentFilter(post, contentFilter) &&
          feedPostMatchesAudienceScope(post, audienceScope, audienceContext),
      ),
    [visiblePosts, contentFilter, audienceScope, audienceContext],
  );

  const postIds = useMemo(() => filteredPosts.map((p) => p.id), [filteredPosts]);
  const engagement = useFeedEngagement(postIds, userProfile, blockedUserIds);

  const handleCycleContentFilter = () => {
    setContentFilter((current) => {
      const next = cycleFeedContentFilter(current);
      persistDisplayFilters(next, audienceScope);
      return next;
    });
  };

  const handleCycleAudienceScope = () => {
    setAudienceScope((current) => {
      const next = cycleFeedAudienceScope(current);
      persistDisplayFilters(contentFilter, next);
      return next;
    });
  };

  const emptyCopy = emptyFeedMessage(contentFilter, audienceScope);
  const showEmpty = !loading && !friendsLoading && filteredPosts.length === 0 && !composerOpen;
  const ContentIcon = FEED_CONTENT_ICONS[contentFilter];
  const hasActiveContentFilter = contentFilter !== 'all';
  const hasActiveAudienceScope = audienceScope !== 'everyone';

  return (
    <div className="space-y-3" id="community_feed_view">
      <div className="space-y-2 min-w-0" id="feed_view_mode_bar">
        <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
          <div className="shrink-0">
            <button
              type="button"
              id="feed_new_post_btn"
              onClick={() => setComposerOpen((open) => !open)}
              className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                composerOpen
                  ? 'border-accent bg-accent text-on-accent'
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

          <div className="flex-1 min-w-0 flex justify-center px-0.5 overflow-x-auto sbn-feed-toolbar-scroll">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
              <button
                type="button"
                id="feed_content_toggle"
                onClick={handleCycleContentFilter}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-w-0 shrink-0 ${
                  hasActiveContentFilter
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-app bg-inset text-app hover:border-accent/40'
                }`}
                aria-pressed={hasActiveContentFilter}
                aria-label={`Feed content: ${feedContentFilterLabel(contentFilter)}`}
                title={`Show ${feedContentFilterLabel(contentFilter).toLowerCase()} posts — tap to change`}
              >
                <ContentIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>{feedContentFilterLabel(contentFilter)}</span>
              </button>
              <button
                type="button"
                id="feed_scope_toggle"
                onClick={handleCycleAudienceScope}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-w-0 shrink-0 ${
                  hasActiveAudienceScope
                    ? 'border-accent bg-accent text-on-accent'
                    : 'border-app bg-inset text-app hover:border-accent/40'
                }`}
                aria-pressed={hasActiveAudienceScope}
                aria-label={`Feed audience: ${feedAudienceScopeLabel(audienceScope)}`}
                title={`Showing ${feedAudienceScopeLabel(audienceScope).toLowerCase()} — tap to change`}
              >
                <Users className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden />
                <span>{feedAudienceScopeLabel(audienceScope)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {composerOpen && (
        <FeedPostComposer
          userProfile={userProfile}
          creating={creating}
          canCreatePoll={canCreatePoll}
          onPublish={async (input) => {
            const ok = await publishPost(input);
            if (ok) setComposerOpen(false);
            return ok;
          }}
          onPublishPoll={
            canCreatePoll
              ? async (input) => {
                  const ok = await publishPoll(input);
                  if (ok) setComposerOpen(false);
                  return ok;
                }
              : undefined
          }
          onCancel={() => setComposerOpen(false)}
        />
      )}

      {(loading || friendsLoading) && visiblePosts.length === 0 && !composerOpen ? (
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
          {contentFilter !== 'all' || audienceScope !== 'everyone' ? (
            <button
              type="button"
              onClick={() => {
                setContentFilter('all');
                setAudienceScope('everyone');
                persistDisplayFilters('all', 'everyone');
              }}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm mt-4"
            >
              Show all posts
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="sbn-btn sbn-btn-primary sbn-btn-sm mt-4"
            >
              Say hi
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
