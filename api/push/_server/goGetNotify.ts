import {
  formatGoGetWhenLabel,
  goGetAvailabilityRequestTransition,
  goGetFulfillerReadyTransition,
  goGetTransitionFromStatusChange,
  type GoGetSessionSnapshot,
} from '../../../shared/goGetNotifications';
import { runPushSend, type PushSendBody } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';

type SessionRow = Record<string, unknown>;

function listingUrl(itemId: string): string {
  return `/listing/${itemId}`;
}

function normalizeSession(row: SessionRow): GoGetSessionSnapshot {
  return {
    id: String(row.id || ''),
    itemId: String(row.itemId || ''),
    fulfillerUserId: String(row.fulfillerUserId || ''),
    fulfillerName: String(row.fulfillerName || 'Neighbor'),
    requesterUserId: String(row.requesterUserId || ''),
    requesterName: String(row.requesterName || 'Neighbor'),
    status: String(row.status || '') as GoGetSessionSnapshot['status'],
    handshakeMode: String(row.handshakeMode || ''),
    scheduledAt: row.scheduledAt ? String(row.scheduledAt) : null,
    fulfillerReadyAt: row.fulfillerReadyAt ? String(row.fulfillerReadyAt) : null,
    startedAt: row.startedAt ? String(row.startedAt) : null,
    arrivedAt: row.arrivedAt ? String(row.arrivedAt) : null,
    completedAt: row.completedAt ? String(row.completedAt) : null,
    cancelledAt: row.cancelledAt ? String(row.cancelledAt) : null,
    cancelledByUserId: row.cancelledByUserId ? String(row.cancelledByUserId) : null,
    ringDurationSeconds:
      typeof row.ringDurationSeconds === 'number' ? row.ringDurationSeconds : null,
  };
}

async function fetchItemTitle(itemId: string): Promise<string> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('items').select('title').eq('id', itemId).maybeSingle();
  return String((data as { title?: string } | null)?.title || 'your item');
}

function sessionData(session: GoGetSessionSnapshot, extra?: Record<string, string>): Record<string, string> {
  return {
    goGetSessionId: session.id,
    sessionId: session.id,
    listingId: session.itemId,
    ...(extra || {}),
  };
}

async function dispatchGoGetPush(
  callerId: string,
  payload: PushSendBody,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return runPushSend(callerId, payload, { source: 'webhook' });
}

function buildPayloadForTransition(
  session: GoGetSessionSnapshot,
  itemTitle: string,
  transition: ReturnType<typeof goGetTransitionFromStatusChange>,
): PushSendBody | null {
  if (!transition) return null;

  const whenLabel = session.scheduledAt ? formatGoGetWhenLabel(session.scheduledAt) : 'soon';
  const cancelledByName =
    session.cancelledByUserId === session.requesterUserId
      ? session.requesterName
      : session.fulfillerName;

  switch (transition.eventType) {
    case 'go_get_availability_request':
      return {
        eventType: 'go_get_availability_request',
        title: 'Ready for pickup?',
        body: `${session.requesterName} wants to Go Get "${itemTitle}" — are you available now?`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: {
          ...sessionData(session, {
            urgentGoGetRing: 'true',
            ringDurationSeconds: String(session.ringDurationSeconds ?? 140),
            ringPattern: 'ring',
          }),
        },
      };
    case 'go_get_available_now':
      return {
        eventType: 'go_get_available_now',
        title: `${session.fulfillerName} is available now`,
        body: `Tap Go Get to start heading to "${itemTitle}"`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_schedule_confirmed':
      return {
        eventType: 'go_get_schedule_confirmed',
        title: 'Pickup time confirmed',
        body: `${session.requesterName} will Go Get "${itemTitle}" ${whenLabel}`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_fulfiller_ready':
      return {
        eventType: 'go_get_fulfiller_ready',
        title: `${session.fulfillerName} is ready`,
        body: `Tap Go Get to start heading to "${itemTitle}"`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_started':
      return {
        eventType: 'go_get_started',
        title: `${session.requesterName} is on the way`,
        body: `Heading to pick up "${itemTitle}" now`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_arrived':
      return {
        eventType: 'go_get_arrived',
        title: `${session.requesterName} has arrived`,
        body: `Confirm the pickup for "${itemTitle}" once it's handed off`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_completed':
      return {
        eventType: 'go_get_completed',
        title: 'Pickup confirmed',
        body: `"${itemTitle}" pickup is complete — thanks for using Go Get!`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    case 'go_get_cancelled':
      return {
        eventType: 'go_get_cancelled',
        title: 'Go Get cancelled',
        body: `${cancelledByName} cancelled the pickup for "${itemTitle}"`,
        url: listingUrl(session.itemId),
        listingId: session.itemId,
        recipientUserIds: [transition.recipientUserId],
        tag: transition.tag,
        data: sessionData(session),
      };
    default:
      return null;
  }
}

export async function runGoGetSessionWebhook(
  record: SessionRow,
  oldRecord?: SessionRow,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const session = normalizeSession(record);
  if (!session.id || !session.itemId) {
    return { status: 200, body: { ok: true, skipped: 'invalid session' } };
  }

  const itemTitle = await fetchItemTitle(session.itemId);
  const callerId = session.requesterUserId || 'system';
  const previous = oldRecord ? normalizeSession(oldRecord) : null;

  if (!previous) {
    if (session.handshakeMode === 'instant' || session.status !== 'awaiting_availability') {
      return { status: 200, body: { ok: true, skipped: 'no insert notification' } };
    }
    const transition = goGetAvailabilityRequestTransition(session);
    const payload = buildPayloadForTransition(session, itemTitle, transition);
    if (!payload) return { status: 200, body: { ok: true, skipped: 'no payload' } };
    return dispatchGoGetPush(callerId, payload);
  }

  const transitions: ReturnType<typeof goGetTransitionFromStatusChange>[] = [];

  const statusTransition = goGetTransitionFromStatusChange(session, previous);
  if (statusTransition) transitions.push(statusTransition);

  const fulfillerJustReady =
    !previous.fulfillerReadyAt && session.fulfillerReadyAt && session.status === 'scheduled';
  if (fulfillerJustReady) {
    transitions.push(goGetFulfillerReadyTransition(session));
  }

  if (!transitions.length) {
    return { status: 200, body: { ok: true, skipped: 'no go-get transition' } };
  }

  const results = [];
  for (const transition of transitions) {
    const payload = buildPayloadForTransition(session, itemTitle, transition);
    if (payload) results.push(await dispatchGoGetPush(callerId, payload));
  }

  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  return { status: 200, body: { ok: true, sent, handlers: results.map((r) => r.body) } };
}

type ReminderWindow = 'tomorrow' | 'one_hour' | 'ready';

function reminderWindowBounds(window: ReminderWindow, now: Date): { minMs: number; maxMs: number } {
  const ms = now.getTime();
  if (window === 'tomorrow') {
    const target = ms + 24 * 60 * 60 * 1000;
    return { minMs: target - 60 * 60 * 1000, maxMs: target + 60 * 60 * 1000 };
  }
  if (window === 'one_hour') {
    const target = ms + 60 * 60 * 1000;
    return { minMs: target - 10 * 60 * 1000, maxMs: target + 10 * 60 * 1000 };
  }
  return { minMs: ms - 5 * 60 * 1000, maxMs: ms + 5 * 60 * 1000 };
}

function buildScheduledReminderPayload(
  session: GoGetSessionSnapshot,
  itemTitle: string,
  window: ReminderWindow,
  recipientUserId: string,
): PushSendBody {
  const whenLabel = session.scheduledAt ? formatGoGetWhenLabel(session.scheduledAt) : 'soon';
  const partnerName =
    recipientUserId === session.fulfillerUserId ? session.requesterName : session.fulfillerName;

  if (window === 'tomorrow') {
    return {
      eventType: 'go_get_pickup_tomorrow',
      title: 'Pickup tomorrow',
      body: `Your Go Get pickup for "${itemTitle}" with ${partnerName} is scheduled for ${whenLabel}`,
      url: listingUrl(session.itemId),
      listingId: session.itemId,
      recipientUserIds: [recipientUserId],
      tag: `go-get-tomorrow-${session.id}`,
      data: sessionData(session, { reminderWindow: 'tomorrow' }),
    };
  }

  if (window === 'one_hour') {
    return {
      eventType: 'go_get_pickup_in_one_hour',
      title: 'Pickup in 1 hour',
      body: `Your Go Get pickup for "${itemTitle}" with ${partnerName} is at ${whenLabel}`,
      url: listingUrl(session.itemId),
      listingId: session.itemId,
      recipientUserIds: [recipientUserId],
      tag: `go-get-one-hour-${session.id}`,
      data: sessionData(session, { reminderWindow: 'one_hour' }),
    };
  }

  return {
    eventType: 'go_get_ready_reminder',
    title: 'Pickup time is here',
    body: `Tap Ready when you're set for "${itemTitle}" — ${session.requesterName} is waiting on you.`,
    url: listingUrl(session.itemId),
    listingId: session.itemId,
    recipientUserIds: [recipientUserId],
    tag: `go-get-ready-reminder-${session.id}`,
    data: sessionData(session, { reminderWindow: 'ready' }),
  };
}

/** Cron: advance reminders for scheduled Go Get pickups (tomorrow, 1h, at-time). */
export async function runGoGetReminderCron(): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const now = new Date();

  const { data: sessions } = await supabaseAdmin
    .from('go_get_sessions')
    .select('*')
    .eq('status', 'scheduled')
    .not('scheduledAt', 'is', null);

  let tomorrowSent = 0;
  let oneHourSent = 0;
  let readySent = 0;

  for (const row of sessions || []) {
    const session = normalizeSession(row as SessionRow);
    if (!session.scheduledAt) continue;
    const scheduledMs = new Date(session.scheduledAt).getTime();
    if (!Number.isFinite(scheduledMs)) continue;

    const itemTitle = await fetchItemTitle(session.itemId);
    const recipients = [session.fulfillerUserId, session.requesterUserId].filter(Boolean);

    const windows: ReminderWindow[] = ['tomorrow', 'one_hour', 'ready'];
    for (const window of windows) {
      const { minMs, maxMs } = reminderWindowBounds(window, now);
      if (scheduledMs < minMs || scheduledMs > maxMs) continue;

      for (const recipientUserId of recipients) {
        if (window === 'ready' && recipientUserId !== session.fulfillerUserId) continue;

        const payload = buildScheduledReminderPayload(session, itemTitle, window, recipientUserId);
        const result = await dispatchGoGetPush('system', payload);
        if (result.status === 200 && Number(result.body.sent || 0) > 0) {
          if (window === 'tomorrow') tomorrowSent += 1;
          else if (window === 'one_hour') oneHourSent += 1;
          else readySent += 1;
        }
      }
    }
  }

  return {
    status: 200,
    body: {
      ok: true,
      tomorrowSent,
      oneHourSent,
      readySent,
      checked: (sessions || []).length,
    },
  };
}
