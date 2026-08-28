import { Calendar, Eye, LifeBuoy, MapPin, Navigation, Repeat } from 'lucide-react';
import { CommunityEvent, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';
import EventStatusBadge from './EventStatusBadge';
import UserAvatar from './UserAvatar';
import ListingImage from './ListingImage';
import ListingViewBadge from './ListingViewBadge';
import { ListingCardEngagementOverlay, ListingCardStatsInline } from './ListingCardStats';
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
  const voteState = engagement.getVotesForEvent(event.id);
  const comments = engagement.getCommentsForEvent(event.id);
  const commentCount = comments.length;
  const goingCount = rsvpState.going;
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
            <div className="absolute inset-x-0 top-0 z-[1] flex items-start justify-between gap-0.5 px-1 py-1 pointer-events-none">
              <span className="sbn-badge sbn-badge-grid sbn-badge-give shrink min-w-0 truncate shadow-sm">Event</span>
              <ListingViewBadge count={event.viewCount ?? 0} placement="inline" compact />
            </div>
            <ListingCardEngagementOverlay
              upvotes={voteState.upvotes}
              downvotes={voteState.downvotes}
              commentCount={commentCount}
              goingCount={goingCount}
            />
          </div>
          <div className="item-feed-tile__body p-2">
            <h3 className="font-display text-xs font-bold text-app leading-snug line-clamp-2">{event.title}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted min-w-0">
              <span className="inline-flex items-center gap-0.5 min-w-0 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0 text-accent" aria-hidden />
                <span className="truncate">{event.neighborhood}</span>
              </span>
              {distanceMeters != null && (
                <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-accent">
                  <Navigation className="w-2.5 h-2.5 shrink-0" aria-hidden />
                  {formatRouteDistance(distanceMeters)}
                </span>
              )}
              {showSeriesBadge && (
                <span className="inline-flex items-center gap-0.5 shrink-0 font-medium text-muted">
                  <Repeat className="w-2.5 h-2.5 shrink-0" aria-hidden />
                  {seriesUpcomingCount} dates
                </span>
              )}
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article
      id={`event_card_${event.id}`}
      className={`item-feed-card item-feed-card--responsive item-feed-card--list ${inactive ? 'opacity-75' : ''}`}
    >
      <div className="item-feed-card__main">
        <button
          type="button"
          onClick={() => onViewEvent(event)}
          className={`item-feed-card__media${coverImage ? '' : ' item-feed-card__media--empty'}`}
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
          <ListingViewBadge count={event.viewCount ?? 0} placement="corner" compact />
          <ListingCardEngagementOverlay
            upvotes={voteState.upvotes}
            downvotes={voteState.downvotes}
            commentCount={commentCount}
            goingCount={goingCount}
          />
        </button>

        <div className="item-feed-card__copy">
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

          <div className="mt-1 sm:mt-3 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted">
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] sm:text-xs text-muted">
              <ListingCardStatsInline
                viewCount={event.viewCount ?? 0}
                upvotes={voteState.upvotes}
                downvotes={voteState.downvotes}
                commentCount={commentCount}
                goingCount={goingCount}
              />
            </div>
          </div>

          {!isCancelled && (
            <EventEngagement
              hostUserId={event.userId}
              currentUserId={currentUserId}
              voteState={voteState}
              rsvpState={rsvpState}
              comments={comments}
              onVote={(direction) => engagement.handleVote(event.id, event.userId, direction)}
              onRsvp={(status) => engagement.handleRsvp(event.id, event.userId, status, isPast)}
              onAddComment={() => {}}
              variant="card"
              commentsLocked={commentsLocked}
              isPast={isPast}
            />
          )}
        </div>
      </div>

      <div className="item-feed-card__footer">
        <button
          type="button"
          onClick={() => onViewProfile(event.userId)}
          className="item-feed-card__poster"
        >
          <UserAvatar
            uid={event.userId}
            src={event.userPhotoURL}
            name={event.userDisplayName}
            size="sm"
            imgClassName="sm:w-10 sm:h-10"
          />
          <div className="item-feed-card__poster-copy">
            <p className="item-feed-card__poster-name">{event.userDisplayName}</p>
            <p className="text-[9px] sm:text-[10px] text-muted hidden sm:block">View profile</p>
          </div>
        </button>

        <div className="item-feed-card__actions">
          <button type="button" onClick={() => onViewEvent(event)} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">View</span>
          </button>
          {isStaffViewer && onStaffChat ? (
            <button
              type="button"
              onClick={onStaffChat}
              className="sbn-btn sbn-btn-primary sbn-btn-sm"
              aria-label="Staff chat"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Staff chat</span>
            </button>
          ) : null}
          {onNavigate && !isCancelled && !isPast ? (
            <button
              type="button"
              onClick={onNavigate}
              className="sbn-btn sbn-btn-primary sbn-btn-sm"
              aria-label="Navigate"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Navigate</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
