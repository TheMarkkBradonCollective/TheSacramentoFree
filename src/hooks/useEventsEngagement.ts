import { useEffect, useState, useCallback, useRef } from 'react';
import { EventComment, EventRsvp, EventRsvpStatus, UserProfile } from '../types';
import {
  createSupabaseEventComment,
  deleteSupabaseEventComment,
  getSupabaseEventComments,
  getSupabaseEventRsvps,
  setSupabaseEventRsvp,
} from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

export interface EventRsvpState {
  userRsvp: EventRsvpStatus | null;
  going: number;
  maybe: number;
  notGoing: number;
}

export function useEventsEngagement(
  eventIds: string[],
  userProfile: UserProfile | null,
  blockedUserIds: Set<string> = new Set(),
) {
  const [eventRsvps, setEventRsvps] = useState<Record<string, EventRsvpState>>({});
  const [eventComments, setEventComments] = useState<Record<string, EventComment[]>>({});

  const uid = userProfile?.uid ?? '';
  const eventIdSetRef = useRef(new Set<string>());

  const getRsvpsForEvent = useCallback(
    (eventId: string): EventRsvpState =>
      eventRsvps[eventId] ?? { userRsvp: null, going: 0, maybe: 0, notGoing: 0 },
    [eventRsvps],
  );

  const getCommentsForEvent = useCallback(
    (eventId: string): EventComment[] =>
      (eventComments[eventId] ?? []).filter((comment) => !blockedUserIds.has(comment.userId)),
    [eventComments, blockedUserIds],
  );

  useEffect(() => {
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
        nextRsvps[eventId] = {
          userRsvp: (rsvpsForEvent.find((rsvp) => rsvp.userId === uid)?.rsvpStatus || null) as
            | EventRsvpStatus
            | null,
          going: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'going').length,
          maybe: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'maybe').length,
          notGoing: rsvpsForEvent.filter((rsvp) => rsvp.rsvpStatus === 'not_going').length,
        };
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

  const reloadEngagementForEvents = useCallback(
    debounceRealtime(async (ids: string[]) => {
      if (!uid || ids.length === 0) return;
      const tracked = ids.filter((id) => eventIdSetRef.current.has(id));
      if (tracked.length === 0) return;

      const [rsvps, comments] = await Promise.all([
        getSupabaseEventRsvps(tracked),
        getSupabaseEventComments(tracked),
      ]);

      setEventRsvps((prev) => {
        const next = { ...prev };
        for (const eventId of tracked) {
          const rsvpsForEvent = rsvps.filter((r) => r.eventId === eventId);
          next[eventId] = {
            userRsvp: (rsvpsForEvent.find((r) => r.userId === uid)?.rsvpStatus || null) as
              | EventRsvpStatus
              | null,
            going: rsvpsForEvent.filter((r) => r.rsvpStatus === 'going').length,
            maybe: rsvpsForEvent.filter((r) => r.rsvpStatus === 'maybe').length,
            notGoing: rsvpsForEvent.filter((r) => r.rsvpStatus === 'not_going').length,
          };
        }
        return next;
      });

      setEventComments((prev) => {
        const next = { ...prev };
        for (const eventId of tracked) {
          next[eventId] = comments.filter((c) => c.eventId === eventId);
        }
        return next;
      });
    }, 150),
    [uid],
  );

  useEffect(() => {
    if (!uid || eventIds.length === 0) return;

    const unsubRsvps = subscribePostgresChanges<EventRsvp>(
      { channelName: 'live-event-rsvps', table: 'event_rsvps', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as EventRsvp | null;
        if (!row?.eventId || !eventIdSetRef.current.has(row.eventId)) return;
        if (row.userId === uid && payload.eventType !== 'DELETE') return;
        reloadEngagementForEvents([row.eventId]);
      },
    );

    const unsubComments = subscribePostgresChanges<EventComment>(
      { channelName: 'live-event-comments', table: 'event_comments', event: '*' },
      (payload) => {
        const row = (payload.new || payload.old) as EventComment | null;
        if (!row?.eventId || !eventIdSetRef.current.has(row.eventId)) return;
        if (payload.eventType === 'INSERT' && row.userId === uid) return;
        reloadEngagementForEvents([row.eventId]);
      },
    );

    return () => {
      unsubRsvps();
      unsubComments();
    };
  }, [uid, eventIds.join('|'), reloadEngagementForEvents]);

  const handleRsvp = (eventId: string, _hostUserId: string, status: EventRsvpStatus) => {
    if (!uid) return;

    const current = getRsvpsForEvent(eventId);

    let newUserRsvp: EventRsvpStatus | null = null;
    let newGoing = current.going;
    let newMaybe = current.maybe;
    let newNotGoing = current.notGoing;

    if (current.userRsvp === status) {
      newUserRsvp = null;
      if (status === 'going') newGoing = Math.max(0, newGoing - 1);
      else if (status === 'maybe') newMaybe = Math.max(0, newMaybe - 1);
      else newNotGoing = Math.max(0, newNotGoing - 1);
    } else {
      if (current.userRsvp === 'going') newGoing = Math.max(0, newGoing - 1);
      if (current.userRsvp === 'maybe') newMaybe = Math.max(0, newMaybe - 1);
      if (current.userRsvp === 'not_going') newNotGoing = Math.max(0, newNotGoing - 1);
      newUserRsvp = status;
      if (status === 'going') newGoing += 1;
      else if (status === 'maybe') newMaybe += 1;
      else newNotGoing += 1;
    }

    setEventRsvps((prev) => ({
      ...prev,
      [eventId]: {
        userRsvp: newUserRsvp,
        going: newGoing,
        maybe: newMaybe,
        notGoing: newNotGoing,
      },
    }));

    setSupabaseEventRsvp(eventId, uid, newUserRsvp).catch((err) => {
      console.warn('Failed to persist RSVP:', err);
      setEventRsvps((prev) => ({ ...prev, [eventId]: current }));
    });
  };

  const handleAddComment = (eventId: string, text: string) => {
    if (!userProfile || !text.trim()) return;

    const current = getCommentsForEvent(eventId);
    const newComment: EventComment = {
      id: `event_comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      eventId,
      userId: userProfile.uid,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown',
    };

    setEventComments((prev) => ({
      ...prev,
      [eventId]: [...current, newComment],
    }));

    createSupabaseEventComment(newComment).catch((err) => {
      console.warn('Failed to persist event comment:', err);
      setEventComments((prev) => ({ ...prev, [eventId]: current }));
    });
  };

  const handleDeleteComment = async (eventId: string, commentId: string) => {
    if (!uid) return;
    if (!confirm('Remove your comment?')) return;

    const current = getCommentsForEvent(eventId);
    const next = current.filter((c) => c.id !== commentId);
    setEventComments((prev) => ({ ...prev, [eventId]: next }));

    const result = await deleteSupabaseEventComment(commentId, uid);
    if (!result.ok) {
      setEventComments((prev) => ({ ...prev, [eventId]: current }));
      console.warn('Failed to delete event comment:', result.errorMessage);
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
