import { useEffect, useState, useCallback, useRef } from 'react';
import { EventComment, EventRsvp, EventRsvpStatus, UserProfile } from '../types';
import {
  createSupabaseEventComment,
  deleteSupabaseEventComment,
  getSupabaseEventComments,
  getSupabaseEventRsvps,
  setSupabaseEventRsvp,
} from '../supabase';
import { subscribePostgresChanges } from '../lib/supabaseRealtime';
import { commentPostedAsNeighbor } from '../lib/staffInteractionMode';
import { resolveProfileIdentity } from '../lib/profilePersistence';
import { takeSafetyCooldownBlockMessage } from '../lib/safetyCooldowns';
import { countPastRsvps, effectivePastRsvp } from '../lib/eventRsvp';
import { useConfirm } from '../contexts/ConfirmContext';
import { isStaffRole } from '../lib/roles';
import { isPlayStoreDemo, PLAY_STORE_DEMO_EVENT_COMMENTS, PLAY_STORE_DEMO_EVENT_RSVPS } from '../preview/playStoreDemo';

export interface EventRsvpState {
  userRsvp: EventRsvpStatus | null;
  going: number;
  maybe: number;
  notGoing: number;
  gone: number;
  missed: number;
}

const EMPTY_RSVP_STATE: EventRsvpState = {
  userRsvp: null,
  going: 0,
  maybe: 0,
  notGoing: 0,
  gone: 0,
  missed: 0,
};

function buildRsvpState(rsvpsForEvent: EventRsvp[], uid: string): EventRsvpState {
  const rawUserRsvp = (rsvpsForEvent.find((rsvp) => rsvp.userId === uid)?.rsvpStatus || null) as
    | EventRsvpStatus
    | null;
  const statuses = rsvpsForEvent.map((rsvp) => rsvp.rsvpStatus);
  const pastCounts = countPastRsvps(statuses);

  return {
    userRsvp: rawUserRsvp,
    going: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'going').length,
    maybe: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'maybe').length,
    notGoing: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'not_going').length,
    gone: pastCounts.gone,
    missed: pastCounts.missed,
  };
}

function adjustRsvpCounts(
  current: EventRsvpState,
  previousStatus: EventRsvpStatus | null,
  nextStatus: EventRsvpStatus | null,
): EventRsvpState {
  const next = { ...current, userRsvp: nextStatus };

  const decrement = (status: EventRsvpStatus) => {
    if (status === 'going') next.going = Math.max(0, next.going - 1);
    else if (status === 'maybe') next.maybe = Math.max(0, next.maybe - 1);
    else if (status === 'not_going') next.notGoing = Math.max(0, next.notGoing - 1);
    else if (status === 'gone') next.gone = Math.max(0, next.gone - 1);
    else if (status === 'missed') next.missed = Math.max(0, next.missed - 1);
  };

  const increment = (status: EventRsvpStatus) => {
    if (status === 'going') next.going += 1;
    else if (status === 'maybe') next.maybe += 1;
    else if (status === 'not_going') next.notGoing += 1;
    else if (status === 'gone') next.gone += 1;
    else if (status === 'missed') next.missed += 1;
  };

  if (previousStatus) decrement(previousStatus);
  if (nextStatus) increment(nextStatus);

  return next;
}

export function useEventsEngagement(
  eventIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const [eventRsvps, setEventRsvps] = useState<Record<string, EventRsvpState>>(
    () => (isPlayStoreDemo() ? PLAY_STORE_DEMO_EVENT_RSVPS : {}),
  );
  const [eventComments, setEventComments] = useState<Record<string, EventComment[]>>(
    () => (isPlayStoreDemo() ? PLAY_STORE_DEMO_EVENT_COMMENTS : {}),
  );

  const uid = userProfile?.uid ?? '';
  const isStaff = userProfile ? isStaffRole(userProfile.role) : false;
  const { alert } = useConfirm();
  const eventIdSetRef = useRef(new Set<string>());

  const getRsvpsForEvent = useCallback(
    (eventId: string): EventRsvpState => eventRsvps[eventId] ?? EMPTY_RSVP_STATE,
    [eventRsvps],
  );

  const getCommentsForEvent = useCallback(
    (eventId: string): EventComment[] =>
      (eventComments[eventId] ?? []).filter((comment) => !blockedUserIds.has(comment.userId)),
    [eventComments, blockedUserIds],
  );

  useEffect(() => {
    if (isPlayStoreDemo()) return;
    if (!uid || eventIds.length === 0) {
      setEventRsvps({});
      setEventComments({});
      return;
    }

    let mounted = true;

    const loadEngagement = async () => {
      const [rsvps, comments] = await Promise.all([
        getSupabaseEventRsvps(eventIds),
        getSupabaseEventComments(eventIds),
      ]);
      if (!mounted) return;

      const nextRsvps: Record<string, EventRsvpState> = {};
      for (const eventId of eventIds) {
        const rsvpsForEvent = rsvps.filter((rsvp) => rsvp.eventId === eventId);
        nextRsvps[eventId] = buildRsvpState(rsvpsForEvent, uid);
      }
      setEventRsvps(nextRsvps);

      const nextComments: Record<string, EventComment[]> = {};
      for (const eventId of eventIds) {
        nextComments[eventId] = comments.filter((comment) => comment.eventId === eventId);
      }
      setEventComments(nextComments);
    };

    loadEngagement();
    return () => {
      mounted = false;
    };
  }, [eventIds.join('|'), uid]);

  useEffect(() => {
    eventIdSetRef.current = new Set(eventIds);
  }, [eventIds.join('|')]);

  useEffect(() => {
    if (isPlayStoreDemo() || !uid || eventIds.length === 0) return;

    const patchRsvps = (payload: { eventType: string; new: EventRsvp | null; old: EventRsvp | null }) => {
      const row = (payload.new || payload.old) as EventRsvp | null;
      if (!row?.eventId || !eventIdSetRef.current.has(row.eventId)) return;
      if (row.userId === uid && payload.eventType !== 'DELETE') return;

      setEventRsvps((prev) => {
        const current = prev[row.eventId] ?? EMPTY_RSVP_STATE;
        let next = { ...current };

        if (payload.old) {
          next = adjustRsvpCounts(next, payload.old.rsvpStatus as EventRsvpStatus, null);
        }
        if (payload.eventType !== 'DELETE' && payload.new) {
          next = adjustRsvpCounts(next, null, payload.new.rsvpStatus as EventRsvpStatus);
          if (payload.new.userId === uid) next.userRsvp = payload.new.rsvpStatus as EventRsvpStatus;
        }

        return { ...prev, [row.eventId]: next };
      });
    };

    const patchComments = (payload: { eventType: string; new: EventComment | null; old: EventComment | null }) => {
      const row = (payload.new || payload.old) as EventComment | null;
      if (!row?.eventId || !eventIdSetRef.current.has(row.eventId)) return;
      if (payload.eventType === 'INSERT' && row.userId === uid) return;

      setEventComments((prev) => {
        const list = prev[row.eventId] ?? [];
        if (payload.eventType === 'DELETE' && payload.old) {
          return {
            ...prev,
            [row.eventId]: list.filter((c) => c.id !== payload.old!.id),
          };
        }
        if (payload.new) {
          const updated = payload.new;
          const idx = list.findIndex((c) => c.id === updated.id);
          if (idx >= 0) {
            const next = [...list];
            next[idx] = updated;
            return { ...prev, [row.eventId]: next };
          }
          return { ...prev, [row.eventId]: [...list, updated] };
        }
        return prev;
      });
    };

    const unsubRsvps = subscribePostgresChanges<EventRsvp>(
      { channelName: 'live-event-rsvps', table: 'event_rsvps', event: '*' },
      (payload) => patchRsvps(payload as { eventType: string; new: EventRsvp | null; old: EventRsvp | null }),
    );

    const unsubComments = subscribePostgresChanges<EventComment>(
      { channelName: 'live-event-comments', table: 'event_comments', event: '*' },
      (payload) => patchComments(payload as { eventType: string; new: EventComment | null; old: EventComment | null }),
    );

    return () => {
      unsubRsvps();
      unsubComments();
    };
  }, [uid, eventIds.join('|')]);

  const handleRsvp = (
    eventId: string,
    _hostUserId: string,
    status: EventRsvpStatus,
    isPast = false,
  ) => {
    if (!uid) return;

    const current = getRsvpsForEvent(eventId);
    const displayStatus = isPast ? effectivePastRsvp(current.userRsvp) : current.userRsvp;

    let newUserRsvp: EventRsvpStatus | null = null;
    if (displayStatus === status) {
      newUserRsvp = null;
    } else {
      newUserRsvp = status;
    }

    const persistStatus = newUserRsvp;
    const optimisticState = adjustRsvpCounts(current, displayStatus, newUserRsvp);

    setEventRsvps((prev) => ({
      ...prev,
      [eventId]: optimisticState,
    }));

    setSupabaseEventRsvp(eventId, uid, persistStatus).then((ok) => {
      if (ok) return;
      setEventRsvps((prev) => ({ ...prev, [eventId]: current }));
      void alert({
        title: 'Could not RSVP',
        message: takeSafetyCooldownBlockMessage() || 'Your RSVP was not saved. Please try again.',
      });
    }).catch((err) => {
      console.warn('Failed to persist RSVP:', err);
      setEventRsvps((prev) => ({ ...prev, [eventId]: current }));
      void alert({ title: 'Could not RSVP', message: 'Your RSVP was not saved. Please try again.' });
    });
  };

  const handleAddComment = (eventId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForEvent(eventId);
    const identity = resolveProfileIdentity(userProfile);
    const newComment: EventComment = {
      id: `event_comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventId,
      userId: userProfile.uid,
      userName: identity.displayName,
      userPhoto: identity.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
      postedAsNeighbor: commentPostedAsNeighbor(userProfile) || undefined,
    };

    setEventComments((prev) => ({
      ...prev,
      [eventId]: [...current, newComment],
    }));

    void createSupabaseEventComment(newComment).then((ok) => {
      if (ok) return;
      setEventComments((prev) => ({ ...prev, [eventId]: current }));
      void alert({
        title: 'Could not comment',
        message: takeSafetyCooldownBlockMessage() || 'Your comment was not saved. Please try again.',
      });
    }).catch((err) => {
      console.warn('Failed to persist event comment:', err);
      setEventComments((prev) => ({ ...prev, [eventId]: current }));
      void alert({ title: 'Could not comment', message: 'Your comment was not saved. Please try again.' });
    });
  };

  const handleDeleteComment = async (eventId: string, commentId: string) => {
    if (!uid) return;

    const current = getCommentsForEvent(eventId);
    const next = current.filter((c) => c.id !== commentId);
    setEventComments((prev) => ({ ...prev, [eventId]: next }));

    const result = await deleteSupabaseEventComment(commentId, uid, isStaff);
    if (!result.ok) {
      setEventComments((prev) => ({ ...prev, [eventId]: current }));
      void alert({ title: 'Could not delete comment', message: result.errorMessage || 'Please try again.' });
    }
  };

  return {
    getRsvpsForEvent,
    getCommentsForEvent,
    handleRsvp,
    handleAddComment,
    handleDeleteComment,
  };
}

export type EventsEngagementApi = ReturnType<typeof useEventsEngagement>;
