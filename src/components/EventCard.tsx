import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { CommunityEvent } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import EventEngagement from './EventEngagement';

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

function hostLabel(hostedBy?: string | null): string {
  const trimmed = hostedBy?.trim();
  return trimmed || 'Unknown';
}

export default function EventCard({
  event,
  currentUserId,
  engagement,
  onViewEvent,
  onViewProfile,
  commentsLocked = false,
}: EventCardProps) {
  const isCancelled = event.status === 'cancelled';
  const rsvpState = engagement.getRsvpsForEvent(event.id);
  const comments = engagement.getCommentsForEvent(event.id);

  return (
    <article
      className={`sbn-card overflow-hidden transition-opacity ${isCancelled ? 'opacity-60' : 'hover:border-accent/40'}`}
    >
      <button
        type="button"
        onClick={() => onViewEvent(event)}
        className="w-full text-left p-4 space-y-3"
      >
        {event.imageUrl && (
          <img
            src={event.imageUrl}
            alt=""
            className="w-full h-40 object-cover rounded-lg border border-app"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Free event
              </span>
              {isCancelled && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                  Cancelled
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-app text-lg mt-1.5 leading-snug">{event.title}</h3>
          </div>
        </div>

        <p className="text-sm text-muted line-clamp-2 leading-relaxed">{event.description}</p>

        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            {formatEventDate(event.eventStartAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            {event.location} · {event.neighborhood}
          </span>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewProfile(event.userId);
            }}
            className="flex items-center gap-2 text-xs text-muted hover:text-app"
          >
            <img
              src={
                event.userPhotoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(event.userDisplayName)}`
              }
              alt=""
              className="w-5 h-5 rounded-full border border-app"
              referrerPolicy="no-referrer"
            />
            Posted by <span className="font-semibold text-app">{event.userDisplayName}</span>
          </button>
          <p className="text-xs text-muted pl-7">
            Hosted by <span className="font-semibold text-app">{hostLabel(event.hostedBy)}</span>
          </p>
        </div>
      </button>

      {!isCancelled && (
        <div className="px-4 pb-4">
          <EventEngagement
            hostUserId={event.userId}
            currentUserId={currentUserId}
            rsvpState={rsvpState}
            comments={comments}
            onRsvp={(status) => engagement.handleRsvp(event.id, event.userId, status)}
            onAddComment={() => {}}
            variant="card"
            commentsLocked={commentsLocked}
          />
        </div>
      )}
    </article>
  );
}
