import { runPushSend } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';

async function displayNameFor(userId: string): Promise<string> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('users').select('displayName').eq('uid', userId).maybeSingle();
  return String((data as { displayName?: string } | null)?.displayName || 'A neighbor').trim() || 'A neighbor';
}

async function discussionParticipantIds(
  table: string,
  idColumn: string,
  entityId: string,
  exclude: Set<string>,
): Promise<string[]> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from(table).select('userId').eq(idColumn, entityId);
  return [
    ...new Set(
      (data || [])
        .map((row) => String((row as { userId?: string }).userId || ''))
        .filter((id) => id && !exclude.has(id)),
    ),
  ];
}

export async function runFriendRequestNotify(
  callerId: string,
  row: {
    id?: string;
    fromUserId?: string;
    toUserId?: string;
    fromUserName?: string;
    status?: string;
  },
  previousStatus?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const requestId = String(row.id || '');
  const fromUserId = String(row.fromUserId || callerId);
  const toUserId = String(row.toUserId || '');
  const status = String(row.status || 'pending');
  if (!requestId || !fromUserId || !toUserId) {
    return { status: 200, body: { ok: true, skipped: 'missing friend request fields' } };
  }

  if (status === 'pending' && (!previousStatus || previousStatus === 'pending')) {
    const fromName = String(row.fromUserName || (await displayNameFor(fromUserId)));
    return runPushSend(fromUserId, {
      eventType: 'friend_request',
      title: 'New friend request',
      body: `${fromName} wants to be friends`,
      url: `/profile/${fromUserId}`,
      recipientUserIds: [toUserId],
      tag: `friend-req-${requestId}`,
      data: { profileUserId: fromUserId, actorUserId: fromUserId, actorName: fromName },
    });
  }

  if (status === 'accepted' && previousStatus !== 'accepted') {
    const accepterName = await displayNameFor(toUserId);
    return runPushSend(toUserId, {
      eventType: 'friend_request_accepted',
      title: 'Friend request accepted',
      body: `${accepterName} accepted your friend request`,
      url: `/profile/${toUserId}`,
      recipientUserIds: [fromUserId],
      tag: `friend-accepted-${requestId}`,
      data: { profileUserId: toUserId, actorUserId: toUserId, actorName: accepterName },
    });
  }

  return { status: 200, body: { ok: true, skipped: 'friend request status not notifiable' } };
}

export async function runAwardUnlockedNotify(
  callerId: string,
  row: {
    id?: string;
    userId?: string;
    awardId?: string;
    revokedAt?: string | null;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (row.revokedAt) {
    return { status: 200, body: { ok: true, skipped: 'award revoked' } };
  }
  const userId = String(row.userId || '');
  const awardId = String(row.awardId || '');
  if (!userId) {
    return { status: 200, body: { ok: true, skipped: 'missing award user' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  let title = 'New neighbor award';
  if (awardId) {
    const { data } = await supabaseAdmin.from('award_definitions').select('title').eq('id', awardId).maybeSingle();
    const awardTitle = String((data as { title?: string } | null)?.title || '').trim();
    if (awardTitle) title = `Award unlocked: ${awardTitle}`;
  }

  return runPushSend(callerId || userId, {
    eventType: 'award_unlocked',
    title,
    body: 'Open badges to see what you earned.',
    url: '/awards',
    recipientUserIds: [userId],
    tag: `award-${row.id || awardId || Date.now()}`,
    data: { awardId },
  });
}

export async function runEventRsvpNotify(
  callerId: string,
  row: {
    eventId?: string;
    userId?: string;
    rsvpStatus?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const eventId = String(row.eventId || '');
  const rsvpUserId = String(row.userId || callerId);
  const status = String(row.rsvpStatus || '').trim();
  if (!eventId || !rsvpUserId || !status) {
    return { status: 200, body: { ok: true, skipped: 'missing event rsvp fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: event } = await supabaseAdmin
    .from('community_events')
    .select('id, userId, title')
    .eq('id', eventId)
    .maybeSingle();
  const hostId = String((event as { userId?: string } | null)?.userId || '');
  if (!hostId || hostId === rsvpUserId) {
    return { status: 200, body: { ok: true, skipped: 'no event host to notify' } };
  }

  const rsvpName = await displayNameFor(rsvpUserId);
  const eventTitle = String((event as { title?: string } | null)?.title || 'your event');
  const statusLabel =
    status === 'going'
      ? 'is going'
      : status === 'maybe'
        ? 'might go'
        : status === 'not_going'
          ? "can't go"
          : status === 'gone'
            ? 'went'
            : status === 'missed'
              ? 'missed'
              : `RSVP’d (${status})`;

  return runPushSend(rsvpUserId, {
    eventType: 'event_rsvp',
    title: 'New RSVP on your event',
    body: `${rsvpName} ${statusLabel} to "${eventTitle}"`,
    url: `/events/${eventId}`,
    recipientUserIds: [hostId],
    tag: `event-rsvp-${eventId}-${rsvpUserId}-${status}`,
    data: {
      eventId,
      actorUserId: rsvpUserId,
      actorName: rsvpName,
      itemTitle: eventTitle,
    },
  });
}

export async function runEventCommentNotify(
  callerId: string,
  comment: {
    id?: string;
    eventId?: string;
    userId?: string;
    userName?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const eventId = String(comment.eventId || '');
  const commenterId = String(comment.userId || callerId);
  const preview = String(comment.text || '').trim().slice(0, 120);
  if (!eventId || !preview) {
    return { status: 200, body: { ok: true, skipped: 'missing event comment fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: event } = await supabaseAdmin
    .from('community_events')
    .select('id, userId, title')
    .eq('id', eventId)
    .maybeSingle();
  const hostId = String((event as { userId?: string } | null)?.userId || '');
  if (!hostId) {
    return { status: 200, body: { ok: true, skipped: 'no event host to notify' } };
  }

  const commenterName = String(comment.userName || (await displayNameFor(commenterId)));
  const eventTitle = String((event as { title?: string } | null)?.title || 'your event');
  const exclude = new Set([commenterId, hostId]);

  const { data: rsvpRows } = await supabaseAdmin
    .from('event_rsvps')
    .select('userId, rsvpStatus')
    .eq('eventId', eventId);
  const rsvpIds = (rsvpRows || [])
    .filter((row) => {
      const status = String((row as { rsvpStatus?: string }).rsvpStatus || '');
      return status === 'going' || status === 'maybe';
    })
    .map((row) => String((row as { userId?: string }).userId || ''));
  const otherCommenters = await discussionParticipantIds('event_comments', 'eventId', eventId, exclude);
  const threadIds = [...new Set([...rsvpIds, ...otherCommenters].filter((id) => id && !exclude.has(id)))];

  const results: Array<{ status: number; body: Record<string, unknown> }> = [];
  if (hostId !== commenterId) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'event_comment',
        title: 'New comment on your event',
        body: `${commenterName} on "${eventTitle}": ${preview}`,
        url: `/events/${eventId}`,
        recipientUserIds: [hostId],
        tag: `event-comment-${comment.id || `${eventId}-${Date.now()}`}-host`,
        data: {
          eventId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: eventTitle,
        },
      }),
    );
  }

  if (threadIds.length) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'event_comment',
        title: 'New comment on an event you follow',
        body: `${commenterName} on "${eventTitle}": ${preview}`,
        url: `/events/${eventId}`,
        recipientUserIds: threadIds,
        tag: `event-comment-${comment.id || `${eventId}-${Date.now()}`}-thread`,
        data: {
          eventId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: eventTitle,
        },
      }),
    );
  }

  if (!results.length) {
    return { status: 200, body: { ok: true, skipped: 'no event comment alert needed' } };
  }

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  return {
    status: 200,
    body: { ok: true, sent, handlers: results.map((r) => r.body) },
  };
}

export async function runAnnouncementCommentNotify(
  callerId: string,
  comment: {
    id?: string;
    announcementId?: string;
    userId?: string;
    userName?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const announcementId = String(comment.announcementId || '');
  const commenterId = String(comment.userId || callerId);
  const preview = String(comment.text || '').trim().slice(0, 120);
  if (!announcementId || !preview) {
    return { status: 200, body: { ok: true, skipped: 'missing announcement comment fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('help_announcements')
    .select('id, postedByUserId, title')
    .eq('id', announcementId)
    .maybeSingle();
  const ownerId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
  if (!ownerId) {
    return { status: 200, body: { ok: true, skipped: 'no announcement author to notify' } };
  }

  const commenterName = String(comment.userName || (await displayNameFor(commenterId)));
  const title = String((data as { title?: string } | null)?.title || 'your announcement');
  const threadIds = await discussionParticipantIds(
    'help_announcement_comments',
    'announcementId',
    announcementId,
    new Set([commenterId, ownerId]),
  );

  const results: Array<{ status: number; body: Record<string, unknown> }> = [];
  if (ownerId !== commenterId) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'announcement_comment',
        title: 'New comment on your news post',
        body: `${commenterName} on "${title}": ${preview}`,
        url: `/help/announcements/${announcementId}`,
        recipientUserIds: [ownerId],
        tag: `announcement-comment-${comment.id || `${announcementId}-${Date.now()}`}-owner`,
        data: {
          announcementId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: title,
        },
      }),
    );
  }

  if (threadIds.length) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'announcement_comment',
        title: 'New reply on a news post you commented on',
        body: `${commenterName} on "${title}": ${preview}`,
        url: `/help/announcements/${announcementId}`,
        recipientUserIds: threadIds,
        tag: `announcement-comment-${comment.id || `${announcementId}-${Date.now()}`}-thread`,
        data: {
          announcementId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: title,
        },
      }),
    );
  }

  if (!results.length) {
    return { status: 200, body: { ok: true, skipped: 'no announcement comment alert needed' } };
  }

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  return {
    status: 200,
    body: { ok: true, sent, handlers: results.map((r) => r.body) },
  };
}

export async function runUpdateCommentNotify(
  callerId: string,
  comment: {
    id?: string;
    updateId?: string;
    userId?: string;
    userName?: string;
    text?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const updateId = String(comment.updateId || '');
  const commenterId = String(comment.userId || callerId);
  const preview = String(comment.text || '').trim().slice(0, 120);
  if (!updateId || !preview) {
    return { status: 200, body: { ok: true, skipped: 'missing update comment fields' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('app_updates')
    .select('id, postedByUserId, title')
    .eq('id', updateId)
    .maybeSingle();
  const ownerId = String((data as { postedByUserId?: string } | null)?.postedByUserId || '');
  if (!ownerId) {
    return { status: 200, body: { ok: true, skipped: 'no update author to notify' } };
  }

  const commenterName = String(comment.userName || (await displayNameFor(commenterId)));
  const title = String((data as { title?: string } | null)?.title || 'your update');
  const threadIds = await discussionParticipantIds(
    'app_update_comments',
    'updateId',
    updateId,
    new Set([commenterId, ownerId]),
  );

  const results: Array<{ status: number; body: Record<string, unknown> }> = [];
  if (ownerId !== commenterId) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'update_comment',
        title: 'New comment on your update',
        body: `${commenterName} on "${title}": ${preview}`,
        url: `/updates/${updateId}`,
        recipientUserIds: [ownerId],
        tag: `update-comment-${comment.id || `${updateId}-${Date.now()}`}-owner`,
        data: {
          updateId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: title,
        },
      }),
    );
  }

  if (threadIds.length) {
    results.push(
      await runPushSend(commenterId, {
        eventType: 'update_comment',
        title: 'New reply on an update you commented on',
        body: `${commenterName} on "${title}": ${preview}`,
        url: `/updates/${updateId}`,
        recipientUserIds: threadIds,
        tag: `update-comment-${comment.id || `${updateId}-${Date.now()}`}-thread`,
        data: {
          updateId,
          actorUserId: commenterId,
          actorName: commenterName,
          itemTitle: title,
        },
      }),
    );
  }

  if (!results.length) {
    return { status: 200, body: { ok: true, skipped: 'no update comment alert needed' } };
  }

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  return {
    status: 200,
    body: { ok: true, sent, handlers: results.map((r) => r.body) },
  };
}
