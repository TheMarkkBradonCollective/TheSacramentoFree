import { Calendar, Eye, LifeBuoy, MapPin, Navigation, Repeat } from 'lucide-react';
import { CommunityEvent, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';
import EventStatusBadge from './EventStatusBadge';
import UserAvatar from './UserAvatar';
import ListingImage from './ListingImage';
import { isEventPast, resolveEventStatus } from '../lib/eventRsvp';
import { isSeriesEvent } from '../lib/eventSeries';
import { formatRouteDistance } from '../lib/mapRoute';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import type { FeedViewMode } from '../lib/feedDisplayPrefs';

interface EventCardProps {
  event: CommunityEvent;
  currentUserId: string;
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  commentsLocked?: boolean;
  layout?: FeedViewMode;
  /** Upcoming dates in this event's repeat series (includes this card when upcoming). */
  seriesUpcomingCount?: number;
  /** Straight-line distance from user to event location, in meters. */
  distanceMeters?: number | null;
  /** Open navigation to this event (map-view parity). */
  onNavigate?: () => void;
  userProfile?: UserProfile;
  /** Staff opens reverse support thread about this event. */
  onStaffChat?: () => void;
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
  layout = 'list',
  seriesUpcomingCount,
  distanceMeters,
  onNavigate,
  userProfile,
  onStaffChat,
}: EventCardProps) {
  const eventStatus = resolveEventStatus(event);
  const isCancelled = eventStatus === 'cancelled';
  const isPast = isEventPast(event);
  const inactive = isCancelled || isPast;
  const isStaffViewer = isStaffActingOfficial(userProfile);
  const rsvpState = engagement.getRsvpsForEvent(event.id);
  const comments = engagement.getCommentsForEvent(event.id);
  const coverImage = event.imageUrl;
  const showSeriesBadge = isSeriesEvent(event) && (seriesUpcomingCount ?? 0) > 1;

  if (layout === 'grid') {
    return (
      <article
        id={`event_card_${event.id}`}
        className={`item-feed-tile ${inactive ? 'opacity-75' : ''}`}
      >
        <button
          type="button"
          onClick={() => onViewEvent(event)}
          className="item-feed-tile__hit w-full text-left cursor-pointer"
          aria-label={`${event.title}${distanceMeters != null ? `, ${formatRouteDistance(distanceMeters)} away` : ''}`}
        >
          <div className="item-feed-tile__media relative aspect-square overflow-hidden bg-inset">
            {coverImage ? (
              <ListingImage
                src={coverImage}
                alt=""
                width={320}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Calendar className="w-7 h-7 text-subtle" aria-hidden />
              </div>
            )}
            <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1 p-1.5">
              <span className="sbn-badge sbn-badge-give text-[9px] py-0.5 shadow-sm">Event</span>
              {showSeriesBadge && (
                <span className="sbn-badge text-[9px] py-0.5 shadow-sm inline-flex items-center gap-0.5">
                  <Repeat className="w-2.5 h-2.5 shrink-0" aria-hidden />
                  {seriesUpcomingCount}
                </span>
              )}
            </div>
            {distanceMeters != null && (
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <Navigation className="w-3 h-3 shrink-0" aria-hidden />
                {formatRouteDistance(distanceMeters)}
              </span>
            )}
          </div>
          <div className="item-feed-tile__body p-2">
            <h3 className="font-display text-xs font-bold text-app leading-snug line-clamp-2">{event.title}</h3>
            <p className="mt-0.5 text-[10px] text-muted truncate">{event.neighborhood}</p>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article
      id={`event_card_${event.id}`}
      className={`item-feed-card item-feed-card--responsive item-feed-card--list flex flex-row sm:flex-row ${inactive ? 'opacity-75' : ''}`}
    >
      <button
        type="button"
        onClick={() => onViewEvent(event)}
        className={`relative shrink-0 overflow-hidden bg-inset text-left cursor-pointer
          w-[5.25rem] h-[5.25rem] sm:w-28 sm:h-28
          ${!coverImage ? 'flex items-center justify-center border-r border-app' : ''}`}
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
          <span className="sbn-badge sbn-badge-give text-[10px] sm:text-xs py-0.5">
            Free event
          </span>
          <EventStatusBadge status={eventStatus} />
          {showSeriesBadge && (
            <span className="sbn-badge text-[10px] sm:text-xs py-0.5 inline-flex items-center gap-0.5">
              <Repeat className="w-3 h-3 shrink-0" aria-hidden />
              {seriesUpcomingCount} dates
            </span>
          )}
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
          {distanceMeters != null && (
            <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-accent">
              <Navigation className="w-3 h-3 shrink-0" />
              {formatRouteDistance(distanceMeters)}
            </span>
          )}
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
              uid={event.userId}
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

          <div className="flex gap-1 shrink-0">
            <button type="button" onClick={() => onViewEvent(event)} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">View</span>
            </button>
            {isStaffViewer && onStaffChat ? (
              <button type="button" onClick={onStaffChat} className="sbn-btn sbn-btn-primary sbn-btn-sm">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span className="ml-1">Staff chat</span>
              </button>
            ) : null}
            {onNavigate && !isCancelled && !isPast ? (
              <button type="button" onClick={onNavigate} className="sbn-btn sbn-btn-primary sbn-btn-sm">
                <Navigation className="w-3.5 h-3.5" />
                <span className="ml-1">Navigate</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
