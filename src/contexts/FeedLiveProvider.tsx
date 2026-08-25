import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import { useFeedPosts } from '../hooks/useFeedPosts';
import { useFeedEngagement } from '../hooks/useFeedEngagement';
import FeedEngagementContext from './FeedEngagementContext';

export type FeedPostsApi = ReturnType<typeof useFeedPosts>;

const FeedPostsContext = createContext<FeedPostsApi | null>(null);

export function useFeedPostsApi(): FeedPostsApi | null {
  return useContext(FeedPostsContext);
}

interface FeedLiveProviderProps {
  userProfile: UserProfile;
  blockedUserIds: Set<string>;
  children: ReactNode;
}

/** Keeps feed posts + engagement in one place so detail overlays share live state. */
export default function FeedLiveProvider({ userProfile, blockedUserIds, children }: FeedLiveProviderProps) {
  const feedPostsApi = useFeedPosts(userProfile);
  const visiblePosts = useMemo(
    () => feedPostsApi.posts.filter((post) => !blockedUserIds.has(post.userId)),
    [feedPostsApi.posts, blockedUserIds],
  );
  const postIds = useMemo(() => visiblePosts.map((post) => post.id), [visiblePosts]);
  const engagement = useFeedEngagement(postIds, userProfile, blockedUserIds);

  return (
    <FeedPostsContext.Provider value={feedPostsApi}>
      <FeedEngagementContext.Provider value={engagement}>{children}</FeedEngagementContext.Provider>
    </FeedPostsContext.Provider>
  );
}
