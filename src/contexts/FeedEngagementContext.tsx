import { createContext, useContext } from 'react';
import type { FeedEngagementApi } from '../hooks/useFeedEngagement';

const FeedEngagementContext = createContext<FeedEngagementApi | null>(null);

export function useOptionalFeedEngagement(): FeedEngagementApi | null {
  return useContext(FeedEngagementContext);
}

export default FeedEngagementContext;
