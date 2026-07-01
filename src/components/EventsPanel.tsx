import { CalendarDays, Heart, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { CommunityEvent, UserProfile } from '../types';
import { useEventsUnlock } from '../hooks/useEventsUnlock';
import { EVENTS } from '../siteContent';
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
  const { unlockStatus, loading, isCommunityUnlocked, canAccessEvents, canManage } =
    useEventsUnlock(userProfile);

  if (loading) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/30 sbn-award-icon-pop">
          <Sparkles className="w-7 h-7 text-accent animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-muted">Checking events unlock…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isCommunityUnlocked && unlockStatus && !canManage && (
        <EventsSharePrompt unlockStatus={unlockStatus} />
      )}

      {!isCommunityUnlocked && unlockStatus && canManage && (
        <EventsSharePrompt unlockStatus={unlockStatus} variant="compact" />
      )}

      {isCommunityUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="sbn-card p-5 text-center space-y-2 border-accent/20 bg-gradient-to-b from-accent-soft/15 to-transparent"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-soft border border-accent/25">
            <CalendarDays className="w-6 h-6 text-accent" />
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">{EVENTS.unlockedIntro}</p>
        </motion.div>
      )}

      {canAccessEvents ? (
        <EventsView
          events={events}
          userProfile={userProfile}
          engagement={engagement}
          onViewEvent={onViewEvent}
          onViewProfile={onViewProfile}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      ) : (
        <div className="sbn-card p-5 text-left space-y-4 rounded-2xl border-accent/15 bg-gradient-to-b from-accent-soft/15 to-transparent">
          <p className="text-sm font-display font-bold text-app flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent fill-accent/30" />
            Sneak peek at what&apos;s coming
          </p>
          <ul className="space-y-2.5 text-sm text-muted">
            {EVENTS.previewBullets.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-xs">
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
