import { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Pencil, Sparkles, XCircle } from 'lucide-react';
import { CommunityEvent, EventComment, EventRsvpStatus, UserProfile } from '../types';
import { EventRsvpState } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';
import EventPinAdjustModal from './EventPinAdjustModal';
import { isEventPast } from '../lib/eventRsvp';
import EventDetailNavigation from './EventDetailNavigation';

interface EventDetailViewProps {
  event: CommunityEvent;
  currentUserId: string;
  userProfile?: UserProfile;
  rsvpState: EventRsvpState;
  comments: EventComment[];
  onRsvp: (status: EventRsvpStatus) => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onClose: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewProfile: (userId: string) => void;
  onEventUpdated?: (event: CommunityEvent) => void;
  updating?: boolean;
  commentsLocked?: boolean;
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

export default function EventDetailView({
  event,
  currentUserId,
  userProfile,
  rsvpState,
  comments,
  onRsvp,
  onAddComment,
  onDeleteComment,
  onClose,
  onEdit,
  onCancel,
  onViewProfile,
  onEventUpdated,
  updating = false,
  commentsLocked = false,
}: EventDetailViewProps) {
  const [showPinModal, setShowPinModal] = useState(false);
  const isOwner = event.userId === currentUserId;
  const isCancelled = event.status === 'cancelled';
  const isPast = isEventPast(event);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-app bg-surface/95 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-inset text-muted"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-app flex-1 truncate">Event details</h1>
        {isOwner && !isCancelled && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            disabled={updating}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-5">
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
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Free event
              </span>
              {isCancelled && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Cancelled
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
                {isOwner && !isCancelled && (
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

          <EventDetailNavigation event={event} />

          <div className="sbn-card p-3 space-y-3">
            <button
              type="button"
              onClick={() => onViewProfile(event.userId)}
              className="flex items-center gap-3 w-full text-left hover:opacity-90 transition-opacity"
            >
              <img
                src={
                  event.userPhotoURL ||
                  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(event.userDisplayName)}`
                }
                alt=""
                className="w-10 h-10 rounded-full border border-app"
                referrerPolicy="no-referrer"
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

          {isOwner && !isCancelled && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={updating}
              className="sbn-btn sbn-btn-secondary w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              Cancel this event
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
}
