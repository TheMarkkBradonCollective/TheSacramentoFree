import { CalendarDays, Sparkles } from 'lucide-react';
import { CommunityEvent, UserProfile } from '../types';
import { useEventsUnlock } from '../hooks/useEventsUnlock';
import EventsSharePrompt from './EventsSharePrompt';
import EventsView from './EventsView';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';

interface EventsPanelProps {
  userProfile: UserProfile;
  events: CommunityEvent[];
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function EventsPanel({
  userProfile,
  events,
  engagement,
  onViewEvent,
  onViewProfile,
  onRefresh,
  isLoading = false,
}: EventsPanelProps) {
  const { unlockStatus, loading, isCommunityUnlocked, canAccessEvents } = useEventsUnlock(userProfile);

  if (loading) {
    return (
      <div className="sbn-card text-center py-16 px-8 border-dashed">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-accent-soft border border-accent/30 mx-auto mb-3">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
        </div>
        <p className="text-sm text-muted">Checking events unlock…</p>
      </div>
    );
  }

  const sneakPeek = !canAccessEvents && events.length === 0;

  return (
    <div className="space-y-6">
      {!isCommunityUnlocked && unlockStatus && (
        <EventsSharePrompt unlockStatus={unlockStatus} variant="compact" />
      )}

      {isCommunityUnlocked && (
        <div className="sbn-card p-4 sm:p-5 flex items-start gap-3">
          <span className="sbn-stat-icon bg-accent/15 text-accent shrink-0">
            <CalendarDays className="w-4 h-4" strokeWidth={2.5} />
          </span>
          <p className="text-sm text-muted leading-relaxed">
            Free neighborhood gatherings are live — potlucks, swaps, park meetups, and more.
          </p>
        </div>
      )}

      <EventsView
        events={events}
        userProfile={userProfile}
        engagement={engagement}
        onViewEvent={onViewEvent}
        onViewProfile={onViewProfile}
        onRefresh={onRefresh}
        isLoading={isLoading}
        commentsLocked={!canAccessEvents}
        sneakPeek={sneakPeek}
      />
    </div>
  );
}
