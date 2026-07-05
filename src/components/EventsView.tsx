import { CommunityEvent, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { isEventUpcoming } from '../lib/eventRsvp';
import EventCard from './EventCard';

interface EventsViewProps {
  events: CommunityEvent[];
  userProfile: UserProfile;
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  /** When true, neighbors can browse and RSVP but not comment until unlock. */
  commentsLocked?: boolean;
}

export default function EventsView({
  events,
  userProfile,
  engagement,
  onViewEvent,
  onViewProfile,
  onRefresh,
  isLoading = false,
  commentsLocked = false,
}: EventsViewProps) {
  const upcoming = events.filter((e) => isEventUpcoming(e));
  const past = events.filter((e) => !isEventUpcoming(e));

  if (isLoading && events.length === 0) {
    return (
      <div className="text-center py-12 text-muted text-sm">Loading community events…</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="sbn-card p-8 text-center space-y-3">
        <p className="text-app font-semibold">No events yet</p>
        <p className="text-sm text-muted">
          Be the first to post a free neighborhood gathering — potlucks, swaps, park meetups, and more.
        </p>
        <button type="button" onClick={onRefresh} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Upcoming ({upcoming.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((event) => (
              <div key={event.id}>
                <EventCard
                  event={event}
                  currentUserId={userProfile.uid}
                  engagement={engagement}
                  onViewEvent={onViewEvent}
                  onViewProfile={onViewProfile}
                  commentsLocked={commentsLocked}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Past &amp; cancelled ({past.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((event) => (
              <div key={event.id}>
                <EventCard
                  event={event}
                  currentUserId={userProfile.uid}
                  engagement={engagement}
                  onViewEvent={onViewEvent}
                  onViewProfile={onViewProfile}
                  commentsLocked={commentsLocked}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
