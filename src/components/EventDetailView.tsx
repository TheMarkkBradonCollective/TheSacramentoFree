import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Calendar, LifeBuoy, MapPin, MessageSquare, Pencil, Repeat } from 'lucide-react';
import { CommunityEvent, EventComment, EventRsvpStatus, UserProfile } from '../types';
import { EventRsvpState } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';
import EventPinAdjustModal from './EventPinAdjustModal';
import StaffEventActions from './StaffEventActions';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { isEventEditable, isEventPast, isEventUpcoming, resolveEventStatus } from '../lib/eventRsvp';
import { getSeriesSiblings, getUpcomingSeriesOccurrences, isSeriesEvent } from '../lib/eventSeries';
import EventStatusBadge from './EventStatusBadge';
import EventDetailNavigation from './EventDetailNavigation';
import { PresenceUserAvatar } from './UserAvatar';
import { useDismissOnEscape } from '../hooks/useDismissOnEscape';

interface EventDetailViewProps {
  event: CommunityEvent;
  allEvents?: CommunityEvent[];
  currentUserId: string;
  userProfile?: UserProfile;
  rsvpState: EventRsvpState;
  comments: EventComment[];
  onRsvp: (status: EventRsvpStatus) => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onClose: () => void;
  onEdit?: () => void;
  onAddDates?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onMessage?: () => void;
  onViewProfile: (userId: string) => void;
  onStaffChat?: () => void;
  onEventStaffAction?: () => void;
  onSelectOccurrence?: (event: CommunityEvent) => void;
  onEventUpdated?: (event: CommunityEvent) => void;
  updating?: boolean;
  commentsLocked?: boolean;
  /** Open event detail and auto-start in-app navigation (events Navigate button). */
  startNavigationOnOpen?: boolean;
  onStartNavigationConsumed?: () => void;
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function hostLabel(hostedBy?: string | null): string {
  const trimmed = hostedBy?.trim();
  return trimmed || 'Unknown';
}

function formatOccurrenceLabel(iso: string, endIso?: string | null): string {
  const start = formatEventDate(iso);
  if (!endIso) return start;
  const end = new Date(endIso).toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${start} – ${end}`;
}

export default function EventDetailView({
  event,
  allEvents = [],
  currentUserId,
  userProfile,
  rsvpState,
  comments,
  onRsvp,
  onAddComment,
  onDeleteComment,
  onClose,
  onEdit,
  onAddDates,
  onCancel,
  onDelete,
  onMessage,
  onViewProfile,
  onStaffChat,
  onEventStaffAction,
  onSelectOccurrence,
  onEventUpdated,
  updating = false,
  commentsLocked = false,
  startNavigationOnOpen = false,
  onStartNavigationConsumed,
}: EventDetailViewProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const eventStatus = resolveEventStatus(event);
  const isOwner = event.userId === currentUserId;
  const isStaffViewer = isStaffActingOfficial(userProfile);
  const isCancelled = eventStatus === 'cancelled';
  const isPast = isEventPast(event);
  const isOpenForCoordination = isEventUpcoming(event) && !isCancelled;
  const canEdit = isOwner && isEventEditable(event);
  const canAddDates = isOwner && !isCancelled && onAddDates;
  const seriesSiblings = getSeriesSiblings(allEvents, event);
  const upcomingInSeries =
    event.seriesId ? getUpcomingSeriesOccurrences(allEvents, event.seriesId) : [];
  const pastSiblings = seriesSiblings.filter((sibling) => !isEventUpcoming(sibling));

  useDismissOnEscape(onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const panel = (
    <div
      id="event_detail_fullscreen"
      className="sbn-app-sheet flex flex-col min-h-0 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={event.title}
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sbn-safe-bottom">
        <header className="sbn-glass-nav sbn-safe-top border-b border-app">
          <div className="px-4 min-h-14 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-inset text-muted shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-1.5 shrink-0">
              {canAddDates && (
                <button
                  type="button"
                  onClick={onAddDates}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                  disabled={updating}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1">Add dates</span>
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                  disabled={updating}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1">Edit</span>
                </button>
              )}
              {isStaffViewer && !isOwner && onStaffChat ? (
                <button type="button" onClick={onStaffChat} className="sbn-btn sbn-btn-primary sbn-btn-sm">
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline ml-1">Staff chat</span>
                </button>
              ) : (
                !isOwner &&
                isOpenForCoordination &&
                onMessage && (
                  <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1">Message</span>
                  </button>
                )
              )}
            </div>
          </div>
        </header>

        <div className="max-w-2xl mx-auto p-4 pb-10 space-y-5">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="w-full max-h-64 object-cover rounded-xl border border-app"
              referrerPolicy="no-referrer"
            />
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sbn-badge sbn-badge-give">Free event</span>
              <EventStatusBadge status={eventStatus} />
              {isSeriesEvent(event) && (
                <span className="sbn-badge inline-flex items-center gap-1">
                  <Repeat className="w-3 h-3" aria-hidden />
                  Repeating
                </span>
              )}
            </div>
            <h2 className="font-display text-2xl font-bold text-app leading-tight">{event.title}</h2>
          </div>

          <p className="text-muted leading-relaxed whitespace-pre-wrap">{event.description}</p>

          <div className="sbn-card p-4 space-y-3 text-sm">
            <div className="flex items-start gap-2 text-app">
              <Calendar className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{formatEventDate(event.eventStartAt)}</p>
                {event.eventEndAt && (
                  <p className="text-muted text-xs mt-0.5">Until {formatEventDate(event.eventEndAt)}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 text-app">
              <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{event.location}</p>
                <p className="text-muted text-xs">{event.neighborhood}</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="block text-xs text-accent font-semibold mt-2 hover:underline"
                  >
                    {typeof event.locationLat === 'number' ? 'Fix pin on map' : 'Set pin on map'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {isSeriesEvent(event) && (
            <div className="sbn-card p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
                  <Repeat className="w-3.5 h-3.5" />
                  All dates at this location
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  RSVP per date — pick the day you plan to go.
                </p>
              </div>

              {upcomingInSeries.length > 0 && (
                <ul className="space-y-2">
                  {upcomingInSeries.map((occurrence) => (
                    <li key={occurrence.id}>
                      <button
                        type="button"
                        onClick={() => onSelectOccurrence?.(occurrence)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                          occurrence.id === event.id
                            ? 'border-accent bg-accent/10 text-app'
                            : 'border-app bg-inset/40 hover:border-accent/50'
                        }`}
                      >
                        <span className="font-semibold">
                          {formatOccurrenceLabel(occurrence.eventStartAt, occurrence.eventEndAt)}
                        </span>
                        {occurrence.id === event.id && (
                          <span className="text-xs text-muted block mt-0.5">Viewing this date</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {pastSiblings.length > 0 && (
                <div className="space-y-2 border-t border-app pt-3">
                  <p className="text-[10px] font-semibold text-muted uppercase">Past dates</p>
                  <ul className="space-y-1 text-xs text-muted">
                    {pastSiblings.map((sibling) => (
                      <li key={sibling.id}>{formatOccurrenceLabel(sibling.eventStartAt, sibling.eventEndAt)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <EventDetailNavigation
            event={event}
            currentUserId={currentUserId}
            autoStartNavigation={startNavigationOnOpen}
            onAutoStartNavigationConsumed={onStartNavigationConsumed}
          />

          {isStaffViewer && !isOwner && userProfile && (
            <section className="sbn-card p-4 border border-role-accent/20">
              <StaffEventActions
                event={event}
                actor={userProfile}
                onChanged={() => onEventStaffAction?.()}
                onDeleted={onClose}
              />
            </section>
          )}

          <div className="sbn-card p-3 space-y-3">
            <button
              type="button"
              onClick={() => onViewProfile(event.userId)}
              className="flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity"
            >
              <PresenceUserAvatar
                uid={event.userId}
                src={event.userPhotoURL}
                name={event.userDisplayName}
                size="md"
              />
              <div>
                <p className="text-xs text-muted">Posted by</p>
                <p className="font-semibold text-app">{event.userDisplayName}</p>
              </div>
            </button>
            <div className="border-t border-app pt-3">
              <p className="text-xs text-muted">Hosted by</p>
              <p className="font-semibold text-app">{hostLabel(event.hostedBy)}</p>
            </div>
          </div>

          {canEdit && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={updating}
              className="sbn-btn sbn-btn-secondary w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              Cancel this event
            </button>
          )}

          {isOwner && !canEdit && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              disabled={updating}
              className="sbn-btn sbn-btn-secondary w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              Delete this event
            </button>
          )}

          <EventEngagement
            hostUserId={event.userId}
            currentUserId={currentUserId}
            rsvpState={rsvpState}
            comments={comments}
            onRsvp={onRsvp}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            userProfile={userProfile}
            onViewProfile={onViewProfile}
            variant="detail"
            rsvpDisabled={isCancelled}
            commentsLocked={commentsLocked}
            isPast={isPast}
          />
        </div>
      </div>

      {showPinModal && (
        <EventPinAdjustModal
          event={event}
          onClose={() => setShowPinModal(false)}
          onSaved={(updatedEvent) => {
            setShowPinModal(false);
            onEventUpdated?.(updatedEvent);
          }}
        />
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
