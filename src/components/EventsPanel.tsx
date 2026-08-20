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
  onNavigateEvent?: (event: CommunityEvent) => void;
  onStaffEventChat?: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  onOpenNewEvent?: () => void;
  canAccessEvents?: boolean;
}

export default function EventsPanel({
  userProfile,
  events,
  engagement,
  onViewEvent,
  onNavigateEvent,
  onStaffEventChat,
  onViewProfile,
  onRefresh,
  isLoading = false,
  onOpenNewEvent,
  canAccessEvents: canAccessEventsProp,
}: EventsPanelProps) {
  const { unlockStatus, loading, isCommunityUnlocked, canAccessEvents: canAccessEventsUnlock } = useEventsUnlock(userProfile);
  const canAccessEvents = canAccessEventsProp ?? canAccessEventsUnlock;

  if (loading && !unlockStatus) {
    return (
      <div className="sbn-card text-center py-16 px-8 border-dashed">
        <p className="text-sm text-muted">Checking events unlock…</p>
      </div>
    );
  }

  const sneakPeek = !canAccessEvents && events.length === 0;

  return (
    <EventsView
      events={events}
      userProfile={userProfile}
      engagement={engagement}
      onViewEvent={onViewEvent}
      onNavigateEvent={onNavigateEvent}
      onStaffEventChat={onStaffEventChat}
      onViewProfile={onViewProfile}
      onRefresh={onRefresh}
      isLoading={isLoading}
      commentsLocked={!canAccessEvents}
      sneakPeek={sneakPeek}
      onOpenNewEvent={canAccessEvents ? onOpenNewEvent : undefined}
      belowToolbar={
        !isCommunityUnlocked && unlockStatus ? (
          <EventsSharePrompt unlockStatus={unlockStatus} variant="compact" />
        ) : null
      }
    />
  );
}
