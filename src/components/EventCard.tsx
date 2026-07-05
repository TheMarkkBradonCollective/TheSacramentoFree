import { Calendar, Eye, MapPin, Sparkles } from 'lucide-react';
import { CommunityEvent } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';
import EventStatusBadge from './EventStatusBadge';
import UserAvatar from './UserAvatar';
import ListingImage from './ListingImage';
import { isEventPast, resolveEventStatus } from '../lib/eventRsvp';

interface EventCardProps {
  event: CommunityEvent;
  currentUserId: string;
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  commentsLocked?: boolean;
}

function formatEventDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatPostedDate(createdAt: CommunityEvent['createdAt']): string {
  if (!createdAt) return 'Recent';
  const ms =
    typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt
      ? (createdAt as { seconds: number }).seconds * 1000
      : createdAt;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function EventCard({
  event,
  currentUserId,
  engagement,
  onViewEvent,
  onViewProfile,
  commentsLocked = false,
}: EventCardProps) {
  const eventStatus = resolveEventStatus(event);
  const isCancelled = eventStatus === 'cancelled';
  const isPast = isEventPast(event);
  const inactive = isCancelled || isPast;
  const rsvpState = engagement.getRsvpsForEvent(event.id);
  const comments = engagement.getCommentsForEvent(event.id);
  const coverImage = event.imageUrl;

  return (
    <article
      id={`event_card_${event.id}`}
      className={`item-feed-card item-feed-card--responsive flex flex-row sm:flex-col ${inactive ? 'opacity-75' : ''}`}
    >
      <button
        type="button"
        onClick={() => onViewEvent(event)}
        className={`relative shrink-0 overflow-hidden bg-inset text-left cursor-pointer
          w-[5.25rem] h-[5.25rem] sm:w-full sm:h-auto sm:aspect-[16/10]
          ${!coverImage ? 'flex items-center justify-center border-r sm:border-r-0 border-app' : ''}`}
      >
        {coverImage ? (
          <ListingImage
            src={coverImage}
            alt={event.title}
            width={480}
            className="h-full w-full object-cover"
          />
        ) : (
          <Calendar className="w-6 h-6 text-subtle" aria-hidden />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <span className="sbn-badge sbn-badge-give text-[10px] sm:text-xs py-0.5 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Free event
          </span>
          <EventStatusBadge status={eventStatus} />
        </div>

        <button type="button" onClick={() => onViewEvent(event)} className="text-left w-full mt-1 sm:mt-3 cursor-pointer">
          <h3 className="font-display text-sm sm:text-lg font-bold text-app leading-snug hover:text-accent transition-colors line-clamp-2 sm:line-clamp-none">
            {event.title}
          </h3>
        </button>

        <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
          <MapPin className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">
            {event.location} · {event.neighborhood}
          </span>
        </p>

        <p className="hidden sm:block text-sm text-muted mt-2 leading-relaxed line-clamp-3">{event.description}</p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 sm:mt-3 text-[10px] sm:text-xs text-muted">
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <Calendar className="w-3 h-3 shrink-0" />
            {formatEventDate(event.eventStartAt)}
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            Posted {formatPostedDate(event.createdAt)}
          </span>
        </div>

        {!isCancelled && (
          <EventEngagement
            hostUserId={event.userId}
            currentUserId={currentUserId}
            rsvpState={rsvpState}
            comments={comments}
            onRsvp={(status) => engagement.handleRsvp(event.id, event.userId, status, isPast)}
            onAddComment={() => {}}
            variant="card"
            commentsLocked={commentsLocked}
            isPast={isPast}
          />
        )}

        <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-app flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onViewProfile(event.userId)}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-left hover:opacity-90 cursor-pointer"
          >
            <UserAvatar
              src={event.userPhotoURL}
              name={event.userDisplayName}
              size="sm"
              imgClassName="sm:w-10 sm:h-10"
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-app truncate">{event.userDisplayName}</p>
              <p className="text-[9px] sm:text-[10px] text-muted hidden sm:block">View profile</p>
            </div>
          </button>

          <button type="button" onClick={() => onViewEvent(event)} className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">View</span>
          </button>
        </div>
      </div>
    </article>
  );
}
