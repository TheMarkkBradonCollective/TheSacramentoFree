import { supabase, buildDmChatId, getOrCreateSupabaseChat, createSupabaseMessage, staffGetListingById, getSupabaseProfile, markItemFulfilledFromChat, markTradeCompletedFromChat, recordGiveawayPickupFromGoGet } from '../supabase';
import type { CoordinationMode, GoGetFulfillerLiveLocation, GoGetHandshakeMode, GoGetLiveLocation, GoGetSession, GoGetSessionStatus, ItemPost, UserProfile } from '../types';
import {
  coordinationModeFromItem,
  handshakeModeForCoordination,
  normalizeCoordinationMode,
  pickupStartActionForItem,
  PICKUP_MODE_CONFIG,
} from './pickupEngine';
import {
  canPerformPickupAction,
  type PickupTransitionAction,
} from './pickupStateMachine';
import { isPlayStoreDemo } from '../preview/playStoreDemo';
import {
  getPlayStoreDemoActiveGoGetSession,
  getPlayStoreDemoFulfillerLiveLocation,
  getPlayStoreDemoGoGetSession,
  getPlayStoreDemoLiveLocation,
  getPlayStoreDemoLockedGoGetSession,
} from '../preview/playStoreDemoGoGet';
import { formatItemClaimedChatMessage, formatItemFulfilledChatMessage, formatTradeCompletedChatMessage } from './claims';
import { pickPreferredLockedGoGetSession } from './goGetTripLock';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './pushConfig';
import { subscribePostgresChanges } from './supabaseRealtime';
import { isStaffRole } from './roles';
import {
  checkSelfGoGetEligibility,
  isGoGetCoordinationEnabled,
} from './goGetEligibility';
import { getGoGetRingDuration } from './goGetRing';
import { getPickupAvailability, isProfileWithinPickupAvailability, isTimeInSharedAvailability } from './pickupAvailability';
import { meetCopyForItem, meetCopyForSession } from './meetCopy';

/** Curb Alert / Porch Pickup — first-come items meant to be grabbed with no handshake. */
export const INSTANT_CLAIM_CATEGORIES = ['Curb Alert', 'Porch Pickup'];

export function isInstantClaimCategory(category: string): boolean {
  return INSTANT_CLAIM_CATEGORIES.includes(category);
}

export function goGetHandshakeModeForItem(item: Pick<ItemPost, 'type' | 'category'>): GoGetHandshakeMode {
  return handshakeModeForCoordination(coordinationModeFromItem(item));
}

export function coordinationModeForItem(item: Pick<ItemPost, 'type' | 'category'>): CoordinationMode {
  return coordinationModeFromItem(item);
}

function sessionActor(session: GoGetSession, actorUserId: string) {
  const isFulfiller = actorUserId === session.fulfillerUserId;
  return {
    userId: isFulfiller ? session.fulfillerUserId : session.requesterUserId,
    name: isFulfiller ? session.fulfillerName : session.requesterName,
    otherUserId: isFulfiller ? session.requesterUserId : session.fulfillerUserId,
    otherName: isFulfiller ? session.requesterName : session.fulfillerName,
  };
}

const TERMINAL_STATUSES: GoGetSessionStatus[] = ['completed', 'cancelled', 'expired', 'disputed'];

export function isTerminalGoGetStatus(status: GoGetSessionStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

async function runGoGetPushTask(task: () => Promise<unknown>): Promise<void> {
  if (!CLIENT_PUSH_DISPATCH_ENABLED) return;
  try {
    await task();
  } catch (err) {
    console.warn('[go-get push]', err);
  }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nullableNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeGoGetSession(row: Record<string, unknown>): GoGetSession {
  return {
    id: str(row.id),
    itemId: str(row.itemId),
    itemType: str(row.itemType) as GoGetSession['itemType'],
    fulfillerUserId: str(row.fulfillerUserId),
    fulfillerName: str(row.fulfillerName, 'Neighbor'),
    requesterUserId: str(row.requesterUserId),
    requesterName: str(row.requesterName, 'Neighbor'),
    chatId: str(row.chatId),
    handshakeMode: (str(row.handshakeMode, 'availability') as GoGetHandshakeMode) || 'availability',
    coordinationMode: (nullableStr(row.coordinationMode) as CoordinationMode | null) || undefined,
    status: (str(row.status, 'awaiting_availability') as GoGetSessionStatus) || 'awaiting_availability',
    destinationLat: num(row.destinationLat),
    destinationLng: num(row.destinationLng),
    destinationLabel: str(row.destinationLabel, 'Pickup location'),
    availableFrom: nullableStr(row.availableFrom),
    availableUntil: nullableStr(row.availableUntil),
    scheduledAt: nullableStr(row.scheduledAt),
    fulfillerReadyAt: nullableStr(row.fulfillerReadyAt),
    startedAt: nullableStr(row.startedAt),
    arrivedAt: nullableStr(row.arrivedAt),
    completedAt: nullableStr(row.completedAt),
    cancelledAt: nullableStr(row.cancelledAt),
    cancelledByUserId: nullableStr(row.cancelledByUserId),
    cancelReason: nullableStr(row.cancelReason),
    fulfillerSharingLocation: row.fulfillerSharingLocation === true,
    ringExpiresAt: nullableStr(row.ringExpiresAt),
    ringStartedAt: nullableStr(row.ringStartedAt),
    ringDurationSeconds: nullableNum(row.ringDurationSeconds),
    onTheWayNotifiedAt: nullableStr(row.onTheWayNotifiedAt),
    approachingNotifiedAt: nullableStr(row.approachingNotifiedAt),
    ringExpiredNotifiedAt: nullableStr(row.ringExpiredNotifiedAt),
    readyWindowMinutes: nullableNum(row.readyWindowMinutes),
    createdAt: str(row.createdAt, new Date().toISOString()),
    updatedAt: str(row.updatedAt, new Date().toISOString()),
  };
}

function normalizeGoGetFulfillerLiveLocation(row: Record<string, unknown>): GoGetFulfillerLiveLocation {
  return {
    sessionId: str(row.sessionId),
    lat: num(row.lat),
    lng: num(row.lng),
    heading: nullableNum(row.heading),
    updatedAt: str(row.updatedAt, new Date().toISOString()),
  };
}

function normalizeGoGetLiveLocation(row: Record<string, unknown>): GoGetLiveLocation {
  return {
    sessionId: str(row.sessionId),
    lat: num(row.lat),
    lng: num(row.lng),
    heading: nullableNum(row.heading),
    speedMph: nullableNum(row.speedMph),
    etaSeconds: nullableNum(row.etaSeconds),
    distanceMeters: nullableNum(row.distanceMeters),
    updatedAt: str(row.updatedAt, new Date().toISOString()),
  };
}

type Result<T = undefined> = { ok: boolean; errorMessage?: string } & (T extends undefined ? {} : Partial<T>);

const MISSING_TABLE_MESSAGE =
  'Run the Go Get pickup sessions SQL (section 20/21 in complete-schema.sql) in Supabase.';

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01';
}

/** Any non-terminal session for this item involving this user (either role). */
export async function getActiveGoGetSession(itemId: string, userId: string): Promise<GoGetSession | null> {
  if (isPlayStoreDemo()) {
    return getPlayStoreDemoActiveGoGetSession(itemId, userId);
  }
  try {
    const { data, error } = await supabase
      .from('go_get_sessions')
      .select('*')
      .eq('itemId', itemId)
      .order('createdAt', { ascending: false });
    if (error || !data) return null;
    const rows = data.map((r) => normalizeGoGetSession(r as Record<string, unknown>));
    return (
      rows.find(
        (r) =>
          (r.fulfillerUserId === userId || r.requesterUserId === userId) && !isTerminalGoGetStatus(r.status),
      ) ?? null
    );
  } catch {
    return null;
  }
}

export async function getGoGetSessionById(sessionId: string): Promise<GoGetSession | null> {
  if (isPlayStoreDemo()) {
    return getPlayStoreDemoGoGetSession(sessionId);
  }
  try {
    const { data, error } = await supabase.from('go_get_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error || !data) return null;
    return normalizeGoGetSession(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

const LOCK_QUERY_STATUSES: GoGetSessionStatus[] = [
  'awaiting_availability',
  'awaiting_schedule',
  'window_offered',
  'scheduled',
  'active',
  'arrived',
];

/** Any live Go Get that should lock this user into the full-screen trip UI. */
export async function getLockedGoGetSessionForUser(userId: string): Promise<GoGetSession | null> {
  if (isPlayStoreDemo()) {
    return getPlayStoreDemoLockedGoGetSession(userId);
  }
  try {
    const [asRequester, asFulfiller] = await Promise.all([
      supabase
        .from('go_get_sessions')
        .select('*')
        .eq('requesterUserId', userId)
        .in('status', LOCK_QUERY_STATUSES)
        .order('updatedAt', { ascending: false })
        .limit(8),
      supabase
        .from('go_get_sessions')
        .select('*')
        .eq('fulfillerUserId', userId)
        .in('status', LOCK_QUERY_STATUSES)
        .order('updatedAt', { ascending: false })
        .limit(8),
    ]);
    const rows = [...(asRequester.data ?? []), ...(asFulfiller.data ?? [])].map((row) =>
      normalizeGoGetSession(row as Record<string, unknown>),
    );
    const unique = new Map<string, GoGetSession>();
    for (const row of rows) unique.set(row.id, row);
    return pickPreferredLockedGoGetSession([...unique.values()], userId);
  } catch {
    return null;
  }
}

/** Live-updates whenever this user is fulfiller or requester on any session row. */
export function subscribeToUserGoGetSessions(userId: string, onChange: () => void): () => void {
  if (isPlayStoreDemo()) return () => undefined;
  const unsubFulfiller = subscribePostgresChanges(
    {
      channelName: `go-get-user-fulfiller-${userId}`,
      table: 'go_get_sessions',
      event: '*',
      filter: `fulfillerUserId=eq.${userId}`,
    },
    () => onChange(),
  );
  const unsubRequester = subscribePostgresChanges(
    {
      channelName: `go-get-user-requester-${userId}`,
      table: 'go_get_sessions',
      event: '*',
      filter: `requesterUserId=eq.${userId}`,
    },
    () => onChange(),
  );
  return () => {
    unsubFulfiller();
    unsubRequester();
  };
}

export interface CreateGoGetSessionParams {
  item: ItemPost;
  fulfillerUserId: string;
  fulfillerName: string;
  requesterUserId: string;
  requesterName: string;
  destination: { lat: number; lng: number };
  destinationLabel: string;
  /** Trade poster starts the Meet — they are already available, so skip the ring. */
  posterInitiated?: boolean;
}

/** Start a "Go Get" — creates (or reuses) the pairing chat and the session row. */
export async function createGoGetSession(
  params: CreateGoGetSessionParams,
): Promise<Result<{ session: GoGetSession }>> {
  const { item, fulfillerUserId, fulfillerName, requesterUserId, requesterName, destination, destinationLabel } =
    params;
  const copy = meetCopyForItem(item);

  if (fulfillerUserId === requesterUserId) {
    return { ok: false, errorMessage: copy.cannotOwn };
  }
  if (item.status !== 'active') {
    return { ok: false, errorMessage: 'This listing is no longer available.' };
  }
  if (pickupStartActionForItem(item) === 'navigate_only') {
    return { ok: false, errorMessage: 'Curb alerts are first-come — navigate to the pin instead of starting a coordinated pickup.' };
  }

  // Device + notification gate for whoever is creating the session (signed-in user).
  const { data: authData } = await supabase.auth.getSession();
  const actorUid = authData.session?.user?.id || '';
  if (actorUid) {
    const actorProfile = await getSupabaseProfile(actorUid);
    if (actorProfile) {
      const selfOk = await checkSelfGoGetEligibility(actorProfile);
      if (selfOk.ok === false) {
        if (selfOk.reason === 'need_install') {
          return {
            ok: false,
            errorMessage:
              'Go Get only works in the Sacramento Buy Nothing Android app (APK or Play Store). On the website, message the neighbor to arrange pickup.',
          };
        }
        if (selfOk.reason === 'need_notifications') {
          return {
            ok: false,
            errorMessage:
              'Turn on notifications (bell → Notification settings) before using Go Get or pickup coordination.',
          };
        }
        return {
          ok: false,
          errorMessage:
            'You turned off Go Get & pickup coordination in Account settings. You can still message neighbors to arrange pickup.',
        };
      }
    }
  }

  // Opt-out check for both parties (poster + navigator).
  const [fulfillerProfile, requesterProfile] = await Promise.all([
    getSupabaseProfile(fulfillerUserId),
    getSupabaseProfile(requesterUserId),
  ]);
  if (fulfillerProfile && !isGoGetCoordinationEnabled(fulfillerProfile)) {
    return {
      ok: false,
      errorMessage: `${fulfillerName} isn’t using app pickup coordination. Message them to arrange pickup independently.`,
    };
  }
  if (requesterProfile && !isGoGetCoordinationEnabled(requesterProfile)) {
    return {
      ok: false,
      errorMessage: `${requesterName} isn’t using app pickup coordination. Message them to arrange pickup independently.`,
    };
  }
  if (fulfillerProfile && !isProfileWithinPickupAvailability(fulfillerProfile)) {
    return {
      ok: false,
      errorMessage: `${fulfillerName} isn’t available for app pickup coordination right now.`,
    };
  }
  if (requesterProfile && !isProfileWithinPickupAvailability(requesterProfile)) {
    return {
      ok: false,
      errorMessage: 'You’re outside your pickup availability hours. Adjust Account settings or message the poster.',
    };
  }

  const existing = await getActiveGoGetSession(item.id, requesterUserId);
  if (existing) {
    return { ok: true, session: existing };
  }

  const chatId = buildDmChatId(fulfillerUserId, requesterUserId);
  const chatOk = await getOrCreateSupabaseChat(chatId, {
    id: chatId,
    participantIds: [fulfillerUserId, requesterUserId].sort(),
    participantNames: { [fulfillerUserId]: fulfillerName, [requesterUserId]: requesterName },
    participantPhotos: {},
    lastMessageAt: new Date().toISOString(),
    lastMessageText: '',
    lastMessageSenderId: requesterUserId,
    itemId: item.id,
    itemTitle: item.title,
  });
  if (!chatOk) {
    return { ok: false, errorMessage: 'Could not open a chat for this pickup.' };
  }

  const handshakeMode = goGetHandshakeModeForItem(item);
  const coordinationMode = coordinationModeFromItem(item);
  const now = new Date().toISOString();
  const instant = handshakeMode === 'instant';
  const posterInitiatedMeet = params.posterInitiated === true && coordinationMode === 'meet_up';

  const id = `ggs_${item.id}_${requesterUserId}_${Date.now()}`;
  const ringDurationSeconds = fulfillerProfile ? getGoGetRingDuration(fulfillerProfile) : 140;
  const ringExpiresAt =
    instant || posterInitiatedMeet
      ? null
      : new Date(Date.now() + ringDurationSeconds * 1000).toISOString();

  const payload: Record<string, unknown> = {
    id,
    itemId: item.id,
    itemType: item.type,
    fulfillerUserId,
    fulfillerName,
    requesterUserId,
    requesterName,
    chatId,
    handshakeMode,
    coordinationMode,
    status: instant ? 'active' : posterInitiatedMeet ? 'scheduled' : 'awaiting_availability',
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    destinationLabel,
    scheduledAt: posterInitiatedMeet ? now : null,
    fulfillerReadyAt: posterInitiatedMeet ? now : null,
    startedAt: instant ? now : null,
    ringStartedAt: instant || posterInitiatedMeet ? null : now,
    ringExpiresAt,
    ringDurationSeconds: instant || posterInitiatedMeet ? null : ringDurationSeconds,
    readyWindowMinutes: 15,
    createdAt: now,
    updatedAt: now,
  };

  let { error } = await supabase.from('go_get_sessions').insert(payload);
  if (error && /coordinationMode|ringStartedAt|readyWindowMinutes|schema cache|PGRST204/i.test(`${error.code || ''} ${error.message || ''}`)) {
    const {
      coordinationMode: _mode,
      ringStartedAt: _started,
      readyWindowMinutes: _window,
      ...legacy
    } = payload;
    const retry = await supabase.from('go_get_sessions').insert(legacy);
    error = retry.error;
  }
  if (error) {
    if (isMissingTableError(error)) return { ok: false, errorMessage: MISSING_TABLE_MESSAGE };
    return { ok: false, errorMessage: error.message };
  }

  const session = normalizeGoGetSession(payload);

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  if (posterInitiatedMeet) {
    await createSupabaseMessage(
      chatId,
      `🔁 ${fulfillerName} is ready to meet to trade "${item.title}". You can both navigate to the meetup pin.`,
      fulfillerUserId,
      messageId,
      { skipPush: true },
    );
    await runGoGetPushTask(() =>
      import('./pushEvents').then((m) =>
        m.notifyGoGetFulfillerReady({
          item,
          requesterUserId,
          fulfillerName,
          sessionId: id,
        }),
      ),
    );
  } else if (!instant) {
    await createSupabaseMessage(
      chatId,
      copy.requestLine(requesterName, item.title) + ' Are you available now?',
      requesterUserId,
      messageId,
      { skipPush: true },
    );
    await runGoGetPushTask(() =>
      import('./pushEvents').then((m) =>
        m.notifyGoGetAvailabilityRequest({
          item,
          fulfillerUserId,
          requesterName,
          sessionId: id,
          ringDurationSeconds,
          ringPattern: fulfillerProfile?.goGetRingPattern,
        }),
      ),
    );
  }

  return { ok: true, session };
}

export function isGoGetRingActive(session: GoGetSession): boolean {
  if (session.status !== 'awaiting_availability') return false;
  if (!session.ringExpiresAt) return true;
  return Date.now() < new Date(session.ringExpiresAt).getTime();
}

/** Move a timed-out live ring into async scheduling for the requester. */
export async function expireGoGetRing(
  session: GoGetSession,
  item?: ItemPost | null,
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'expire_ring',
    fallbackPatch: { status: 'awaiting_schedule' },
  });
  if (!result.ok || !result.session) return result;

  if (!session.ringExpiredNotifiedAt && item) {
    await createSupabaseMessage(
      session.chatId,
      `⏳ No response yet for "${item.title}". You can propose a pickup time.`,
      session.requesterUserId,
      `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      { skipPush: true },
    );
    await runGoGetPushTask(() =>
      import('./pushEvents').then((m) =>
        m.notifyGoGetExpired({
          item,
          requesterUserId: session.requesterUserId,
          fulfillerName: session.fulfillerName,
          sessionId: session.id,
        }),
      ),
    );
    await updateSession(session.id, { ringExpiredNotifiedAt: new Date().toISOString() });
  }

  return { ok: true, session: result.session };
}

/** End a live ring when the listing is gone — requester should not wait forever. */
export async function abandonGoGetRing(
  session: GoGetSession,
  reason = 'Listing is no longer available',
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'abandon_ring',
    payload: { cancelReason: reason },
    fallbackPatch: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: reason,
      fulfillerSharingLocation: false,
    },
  });
  if (!result.ok || !result.session) return result;

  await createSupabaseMessage(
    session.chatId,
    `❌ This pickup request ended: ${reason}.`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  return { ok: true, session: result.session };
}

export async function declineGoGetRing(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'decline',
    payload: { cancelReason: 'Not available' },
    fallbackPatch: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledByUserId: session.fulfillerUserId,
      cancelReason: 'Not available',
      fulfillerSharingLocation: false,
    },
  });
  if (!result.ok || !result.session) return result;

  await createSupabaseMessage(
    session.chatId,
    `❌ ${session.fulfillerName} isn't available for "${item.title}" right now.`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetDeclined({
        item,
        requesterUserId: session.requesterUserId,
        fulfillerName: session.fulfillerName,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

/** Requester picks a meet time after the live ring timed out (no urgent ring). */
export async function requesterProposeScheduledMeet(
  session: GoGetSession,
  item: ItemPost,
  scheduledAt: string,
  schedules: {
    poster: Pick<UserProfile, 'pickupAvailability'>;
    requester: Pick<UserProfile, 'pickupAvailability'>;
  },
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'awaiting_schedule') {
    return { ok: false, errorMessage: 'This pickup is not awaiting a scheduled time.' };
  }
  const chosen = new Date(scheduledAt);
  if (Number.isNaN(chosen.getTime())) {
    return { ok: false, errorMessage: 'Pick a valid time.' };
  }
  const posterSchedule = getPickupAvailability(schedules.poster);
  const requesterSchedule = getPickupAvailability(schedules.requester);
  if (!isTimeInSharedAvailability(posterSchedule, requesterSchedule, scheduledAt)) {
    return { ok: false, errorMessage: 'Pick a time when both of you are within your pickup availability.' };
  }
  if (await userHasConflictingLiveTrip(session.requesterUserId, session.id)) {
    return { ok: false, errorMessage: 'Finish your current pickup before scheduling another.' };
  }
  if (await userHasConflictingLiveTrip(session.fulfillerUserId, session.id)) {
    return { ok: false, errorMessage: `${session.fulfillerName} is already in an active pickup.` };
  }

  const result = await applyPickupTransition({
    session,
    action: 'propose_schedule',
    payload: { scheduledAt },
    fallbackPatch: { status: 'scheduled', scheduledAt },
  });
  if (!result.ok || !result.session) return result;

  const whenLabel = chosen.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  await createSupabaseMessage(
    session.chatId,
    `📅 Pickup scheduled for ${whenLabel}.`,
    session.requesterUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetScheduleConfirmed({
        item,
        fulfillerUserId: session.fulfillerUserId,
        requesterName: session.requesterName,
        whenLabel,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

async function updateSession(
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; errorMessage?: string; session?: GoGetSession }> {
  const { data, error } = await supabase
    .from('go_get_sessions')
    .update({ ...patch, updatedAt: new Date().toISOString() })
    .eq('id', sessionId)
    .select('*')
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return { ok: false, errorMessage: MISSING_TABLE_MESSAGE };
    return { ok: false, errorMessage: error.message };
  }
  if (!data) return { ok: false, errorMessage: 'Session not found.' };
  return { ok: true, session: normalizeGoGetSession(data as Record<string, unknown>) };
}

function isMissingRpcError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const text = `${error.code || ''} ${error.message || ''}`;
  return /PGRST202|function.*transition_go_get_session|schema cache/i.test(text);
}

async function applyPickupTransition(params: {
  session: GoGetSession;
  action: PickupTransitionAction;
  payload?: Record<string, unknown>;
  fallbackPatch: Record<string, unknown>;
}): Promise<Result<{ session: GoGetSession }>> {
  const { data: authData } = await supabase.auth.getSession();
  const actorUserId = authData.session?.user?.id || '';
  const cancelReason =
    typeof params.payload?.cancelReason === 'string' ? params.payload.cancelReason : undefined;
  const check = canPerformPickupAction({
    session: params.session,
    action: params.action,
    actorUserId,
    cancelReason,
  });
  if (check.ok === false) return { ok: false, errorMessage: check.error };

  const { data, error } = await supabase.rpc('transition_go_get_session', {
    p_session_id: params.session.id,
    p_action: params.action,
    p_payload: params.payload ?? {},
  });
  if (!error && data && typeof data === 'object') {
    const body = data as { ok?: boolean; error?: string; session?: Record<string, unknown> };
    if (body.ok === false) return { ok: false, errorMessage: body.error || 'Could not update this pickup.' };
    if (body.session) return { ok: true, session: normalizeGoGetSession(body.session) };
  }
  if (error && !isMissingRpcError(error) && !isMissingTableError(error)) {
    return { ok: false, errorMessage: error.message };
  }
  return updateSession(params.session.id, { ...params.fallbackPatch, status: check.nextStatus });
}

export async function userHasConflictingLiveTrip(userId: string, exceptSessionId?: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const live: GoGetSessionStatus[] = ['active', 'arrived'];
    const [asRequester, asFulfiller] = await Promise.all([
      supabase.from('go_get_sessions').select('id,status').eq('requesterUserId', userId).in('status', live).limit(4),
      supabase.from('go_get_sessions').select('id,status').eq('fulfillerUserId', userId).in('status', live).limit(4),
    ]);
    const rows = [...(asRequester.data ?? []), ...(asFulfiller.data ?? [])];
    return rows.some((row) => String(row.id) !== exceptSessionId);
  } catch {
    return false;
  }
}

/** Fulfiller: "Yes, I'm available now" — starts the ready-to-drive state immediately. */
export async function respondAvailableNow(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  const now = new Date().toISOString();
  const result = await applyPickupTransition({
    session,
    action: 'available_now',
    fallbackPatch: {
      status: 'scheduled',
      scheduledAt: now,
      fulfillerReadyAt: now,
    },
  });
  if (!result.ok || !result.session) return result;

  await createSupabaseMessage(
    session.chatId,
    `✅ ${session.fulfillerName} is available now — ${session.requesterName} can head over.`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetAvailableNow({
        item,
        requesterUserId: session.requesterUserId,
        fulfillerName: session.fulfillerName,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

/** Fulfiller: "No, but I'm free between X and Y." */
export async function proposeAvailabilityWindow(
  session: GoGetSession,
  item: ItemPost,
  window: { from: string; until: string },
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'awaiting_availability') {
    return { ok: false, errorMessage: 'This request was already answered.' };
  }
  if (new Date(window.until).getTime() <= new Date(window.from).getTime()) {
    return { ok: false, errorMessage: 'The end time must be after the start time.' };
  }

  const result = await applyPickupTransition({
    session,
    action: 'propose_window',
    payload: { availableFrom: window.from, availableUntil: window.until },
    fallbackPatch: {
      status: 'window_offered',
      availableFrom: window.from,
      availableUntil: window.until,
    },
  });
  if (!result.ok || !result.session) return result;

  const windowLabel = `between ${new Date(window.from).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} and ${new Date(window.until).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;

  await createSupabaseMessage(
    session.chatId,
    `🕐 ${session.fulfillerName} isn't available right now, but is free ${windowLabel}.`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetScheduleProposed({
        item,
        requesterUserId: session.requesterUserId,
        fulfillerName: session.fulfillerName,
        windowLabel,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

/** Requester: pick a specific time inside the fulfiller's offered window. */
export async function pickScheduledTime(
  session: GoGetSession,
  item: ItemPost,
  scheduledAt: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'window_offered') {
    return { ok: false, errorMessage: 'This pickup is not awaiting a scheduled time.' };
  }
  const chosen = new Date(scheduledAt).getTime();
  const from = session.availableFrom ? new Date(session.availableFrom).getTime() : -Infinity;
  const until = session.availableUntil ? new Date(session.availableUntil).getTime() : Infinity;
  if (Number.isNaN(chosen) || chosen < from || chosen > until) {
    return { ok: false, errorMessage: 'Pick a time inside the available window.' };
  }
  if (await userHasConflictingLiveTrip(session.requesterUserId, session.id)) {
    return { ok: false, errorMessage: 'Finish your current pickup before scheduling another.' };
  }

  const result = await applyPickupTransition({
    session,
    action: 'pick_time',
    payload: { scheduledAt },
    fallbackPatch: { status: 'scheduled', scheduledAt },
  });
  if (!result.ok || !result.session) return result;

  const whenLabel = new Date(scheduledAt).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  await createSupabaseMessage(
    session.chatId,
    `📅 Pickup scheduled for ${whenLabel}. Both of you will get a reminder.`,
    session.requesterUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetScheduleConfirmed({
        item,
        fulfillerUserId: session.fulfillerUserId,
        requesterName: session.requesterName,
        whenLabel,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

/** Fulfiller taps Ready once the scheduled time has arrived. */
export async function markFulfillerReady(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'mark_ready',
    fallbackPatch: { fulfillerReadyAt: new Date().toISOString() },
  });
  if (!result.ok || !result.session) return result;

  const copy = meetCopyForSession(session);
  await createSupabaseMessage(
    session.chatId,
    `✅ ${copy.theyAreReady(session.fulfillerName)} ${session.requesterName} can ${copy.startTrip} now.`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetFulfillerReady({
        item,
        requesterUserId: session.requesterUserId,
        fulfillerName: session.fulfillerName,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

/** Either traveler starts live navigation once the fulfiller is ready. */
export async function startGoGetTrip(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  if (item.status !== 'active' && item.status !== 'pending_pickup') {
    return { ok: false, errorMessage: 'This listing is no longer available.' };
  }
  const { checkLocationPermission, requestLocationPermission } = await import('./systemPermissions');
  let locationState = await checkLocationPermission();
  if (locationState === 'prompt') {
    locationState = await requestLocationPermission();
  }
  if (locationState === 'denied') {
    return { ok: false, errorMessage: 'Location permission is required to start navigation.' };
  }
  if (locationState === 'unsupported') {
    return { ok: false, errorMessage: 'This device cannot start navigation without GPS.' };
  }
  const result = await applyPickupTransition({
    session,
    action: 'start_trip',
    fallbackPatch: { status: 'active', startedAt: new Date().toISOString() },
  });
  if (!result.ok || !result.session) return result;

  const { data: authData } = await supabase.auth.getSession();
  const actor = sessionActor(session, authData.session?.user?.id || session.requesterUserId);
  const bothTravel = PICKUP_MODE_CONFIG[normalizeCoordinationMode(session.coordinationMode)].bothTravel;
  await createSupabaseMessage(
    session.chatId,
    bothTravel
      ? `📍 ${actor.name} started heading to the meetup pin for "${item.title}".`
      : `📍 ${session.requesterName} started the trip to pick up "${item.title}".`,
    actor.userId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );

  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetStarted({
        item,
        recipientUserId: actor.otherUserId,
        travelerName: actor.name,
        sessionId: session.id,
      }),
    ),
  );
  return { ok: true, session: result.session };
}

export async function markGoGetArrived(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'mark_arrived',
    fallbackPatch: { status: 'arrived', arrivedAt: new Date().toISOString() },
  });
  if (!result.ok || !result.session) return result;

  const { data: authData } = await supabase.auth.getSession();
  const actor = sessionActor(session, authData.session?.user?.id || session.requesterUserId);
  const copy = meetCopyForSession(session);
  await createSupabaseMessage(
    session.chatId,
    `📍 ${actor.name} arrived for "${item.title}".`,
    actor.userId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );

  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetArrived({
        item,
        recipientUserId: actor.otherUserId,
        travelerName: actor.name,
        sessionId: session.id,
        confirmHandoff: copy.confirmHandoff,
      }),
    ),
  );
  await clearLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Marks the listing claimed/fulfilled/traded to match this Go Get handoff. */
export async function completeGoGetItemForSession(
  item: ItemPost,
  session: GoGetSession,
): Promise<Result> {
  if (item.type === 'giveaway') {
    return recordGiveawayPickupFromGoGet({
      itemId: item.id,
      itemTitle: item.title,
      giverUserId: session.fulfillerUserId,
      claimerUserId: session.requesterUserId,
      chatId: session.chatId,
      claimMessage: formatItemClaimedChatMessage(item.title),
    });
  }
  if (item.type === 'looking') {
    return markItemFulfilledFromChat({
      itemId: item.id,
      ownerUserId: session.fulfillerUserId,
      helperUserId: session.requesterUserId,
      chatId: session.chatId,
      message: formatItemFulfilledChatMessage(item.title, session.requesterName),
    });
  }
  return markTradeCompletedFromChat({
    itemId: item.id,
    posterUserId: session.fulfillerUserId,
    partnerUserId: session.requesterUserId,
    chatId: session.chatId,
    message: formatTradeCompletedChatMessage(item.title, session.requesterName),
  });
}

/** Fulfiller confirms the handoff actually happened — separate item-type completion is handled by the caller. */
export async function confirmGoGetCompletion(session: GoGetSession): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'confirm_complete',
    fallbackPatch: {
      status: 'completed',
      completedAt: new Date().toISOString(),
      fulfillerSharingLocation: false,
    },
  });
  if (!result.ok || !result.session) return result;
  const copy = meetCopyForSession(session);
  await createSupabaseMessage(
    session.chatId,
    `✅ ${copy.completedChat}`,
    session.fulfillerUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Fulfiller disputes the handoff (item never actually handed off) — caller should also file a violation. */
export async function disputeGoGetCompletion(
  session: GoGetSession,
  reason: string,
): Promise<Result<{ session: GoGetSession }>> {
  const result = await applyPickupTransition({
    session,
    action: 'dispute',
    payload: { cancelReason: reason },
    fallbackPatch: { status: 'disputed', cancelReason: reason, fulfillerSharingLocation: false },
  });
  if (!result.ok || !result.session) return result;
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetDisputed({
        sessionId: session.id,
        recipientUserId: session.requesterUserId,
        title: 'Pickup reported',
        body: 'A neighbor reported a problem with this pickup. Moderators will review it.',
      }),
    ),
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

export async function cancelGoGetSession(
  session: GoGetSession,
  item: ItemPost,
  cancelledByUserId: string,
  reason?: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (isTerminalGoGetStatus(session.status)) {
    return { ok: false, errorMessage: 'This Go Get is already finished.' };
  }
  const result = await applyPickupTransition({
    session,
    action: 'cancel',
    payload: { cancelReason: reason ?? '' },
    fallbackPatch: {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledByUserId,
      cancelReason: reason ?? null,
      fulfillerSharingLocation: false,
    },
  });
  if (!result.ok || !result.session) return result;

  const otherUserId =
    cancelledByUserId === session.fulfillerUserId ? session.requesterUserId : session.fulfillerUserId;
  const cancelledByName =
    cancelledByUserId === session.fulfillerUserId ? session.fulfillerName : session.requesterName;

  await createSupabaseMessage(
    session.chatId,
    `❌ ${cancelledByName} cancelled this Go Get${reason ? `: ${reason}` : '.'}`,
    cancelledByUserId,
    `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetCancelled({ item, recipientUserId: otherUserId, cancelledByName, sessionId: session.id }),
    ),
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Fulfiller opts in/out of sharing their live location with the picker during pickup. */
export async function setFulfillerSharingLocation(
  session: GoGetSession,
  enabled: boolean,
): Promise<Result<{ session: GoGetSession }>> {
  if (!['active', 'arrived'].includes(session.status)) {
    return { ok: false, errorMessage: 'Location sharing is only available during an active pickup.' };
  }
  const result = await updateSession(session.id, { fulfillerSharingLocation: enabled });
  if (!result.ok || !result.session) return result;
  if (!enabled) {
    await clearFulfillerLiveLocation(session.id);
  }
  return { ok: true, session: result.session };
}

// ---------------------------------------------------------------------------
// Live location — one row per session, latest position only. See RLS: only
// the requester's own device may write it; both participants may read it.
// ---------------------------------------------------------------------------

// Throttle trail recording: one point every 30 s OR if moved > 30 m from last point.
const _trailLastTime = new Map<string, number>();
const _trailLastCoord = new Map<string, [number, number]>();
const TRAIL_MIN_INTERVAL_MS = 30_000;
const TRAIL_MIN_DISTANCE_M = 30;

function haversineMetersSimple(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const x = sinDLat * sinDLat + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function appendLocationTrailPoint(
  sessionId: string,
  position: { lat: number; lng: number; heading?: number | null; speedMph?: number | null; etaSeconds?: number | null; distanceMeters?: number | null },
): Promise<void> {
  try {
    await supabase.from('go_get_location_trail').insert({
      id: `trail_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading ?? null,
      speedMph: position.speedMph ?? null,
      etaSeconds: position.etaSeconds ?? null,
      distanceMeters: position.distanceMeters ?? null,
      recordedAt: new Date().toISOString(),
    });
  } catch {
    // best-effort; trail table may not exist yet
  }
}

export async function upsertLiveLocation(
  sessionId: string,
  position: {
    lat: number;
    lng: number;
    heading?: number | null;
    speedMph?: number | null;
    etaSeconds?: number | null;
    distanceMeters?: number | null;
  },
): Promise<void> {
  try {
    await supabase.from('go_get_live_locations').upsert({
      sessionId,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading ?? null,
      speedMph: position.speedMph ?? null,
      etaSeconds: position.etaSeconds ?? null,
      distanceMeters: position.distanceMeters ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update Go Get live location:', err);
  }

  // Append to location trail (throttled by time + distance).
  const now = Date.now();
  const lastTime = _trailLastTime.get(sessionId) ?? 0;
  const lastCoord = _trailLastCoord.get(sessionId);
  const elapsed = now - lastTime;
  const dist = lastCoord ? haversineMetersSimple(lastCoord, [position.lat, position.lng]) : Infinity;

  if (elapsed >= TRAIL_MIN_INTERVAL_MS || dist >= TRAIL_MIN_DISTANCE_M) {
    _trailLastTime.set(sessionId, now);
    _trailLastCoord.set(sessionId, [position.lat, position.lng]);
    void appendLocationTrailPoint(sessionId, position);
  }
}

export async function getLiveLocation(sessionId: string): Promise<GoGetLiveLocation | null> {
  if (isPlayStoreDemo()) {
    return getPlayStoreDemoLiveLocation(sessionId);
  }
  try {
    const { data, error } = await supabase
      .from('go_get_live_locations')
      .select('*')
      .eq('sessionId', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeGoGetLiveLocation(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function clearLiveLocation(sessionId: string): Promise<void> {
  try {
    await supabase.from('go_get_live_locations').delete().eq('sessionId', sessionId);
  } catch {
    // best effort — RLS/missing table are both fine to ignore here
  }
}

// ---------------------------------------------------------------------------
// Fulfiller live location — optional opt-in so the picker can see where the
// poster actually is vs. the listed pickup pin.
// ---------------------------------------------------------------------------

export async function upsertFulfillerLiveLocation(
  sessionId: string,
  position: { lat: number; lng: number; heading?: number | null },
): Promise<void> {
  try {
    await supabase.from('go_get_fulfiller_live_locations').upsert({
      sessionId,
      lat: position.lat,
      lng: position.lng,
      heading: position.heading ?? null,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Could not update Go Get fulfiller live location:', err);
  }
}

export async function getFulfillerLiveLocation(sessionId: string): Promise<GoGetFulfillerLiveLocation | null> {
  if (isPlayStoreDemo()) {
    return getPlayStoreDemoFulfillerLiveLocation(sessionId);
  }
  try {
    const { data, error } = await supabase
      .from('go_get_fulfiller_live_locations')
      .select('*')
      .eq('sessionId', sessionId)
      .maybeSingle();
    if (error || !data) return null;
    return normalizeGoGetFulfillerLiveLocation(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function clearFulfillerLiveLocation(sessionId: string): Promise<void> {
  try {
    await supabase.from('go_get_fulfiller_live_locations').delete().eq('sessionId', sessionId);
  } catch {
    // best effort
  }
}

export function subscribeToFulfillerLiveLocationChanges(
  sessionId: string,
  onChange: (location: GoGetFulfillerLiveLocation) => void,
): () => void {
  if (isPlayStoreDemo()) {
    const loc = getPlayStoreDemoFulfillerLiveLocation(sessionId);
    if (loc) onChange(loc);
    return () => undefined;
  }
  return subscribePostgresChanges<Record<string, unknown>>(
    {
      channelName: `go-get-fulfiller-live-location-${sessionId}`,
      table: 'go_get_fulfiller_live_locations',
      event: '*',
      filter: `sessionId=eq.${sessionId}`,
    },
    (payload) => {
      const row = payload.new as Record<string, unknown> | undefined;
      if (row && Object.keys(row).length > 0) onChange(normalizeGoGetFulfillerLiveLocation(row));
    },
  );
}

/** Live-updates for one session's status/fields (both participants see the same row). */
export function subscribeToGoGetSession(
  sessionId: string,
  onChange: (session: GoGetSession) => void,
): () => void {
  return subscribePostgresChanges<Record<string, unknown>>(
    {
      channelName: `go-get-session-${sessionId}`,
      table: 'go_get_sessions',
      event: '*',
      filter: `id=eq.${sessionId}`,
    },
    (payload) => {
      const row = payload.new as Record<string, unknown> | undefined;
      if (row && Object.keys(row).length > 0) onChange(normalizeGoGetSession(row));
    },
  );
}

export function subscribeToLiveLocationChanges(
  sessionId: string,
  onChange: (location: GoGetLiveLocation) => void,
): () => void {
  if (isPlayStoreDemo()) {
    const loc = getPlayStoreDemoLiveLocation(sessionId);
    if (loc) onChange(loc);
    return () => undefined;
  }
  return subscribePostgresChanges<Record<string, unknown>>(
    {
      channelName: `go-get-live-location-${sessionId}`,
      table: 'go_get_live_locations',
      event: '*',
      filter: `sessionId=eq.${sessionId}`,
    },
    (payload) => {
      const row = payload.new as Record<string, unknown> | undefined;
      if (row && Object.keys(row).length > 0) onChange(normalizeGoGetLiveLocation(row));
    },
  );
}

// ---------------------------------------------------------------------------
// Staff-only: bulk session access + location trail
// ---------------------------------------------------------------------------

export interface LocationTrailPoint {
  id: string;
  sessionId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speedMph?: number | null;
  etaSeconds?: number | null;
  distanceMeters?: number | null;
  recordedAt: string;
}

export async function staffGetAllSessions(
  options: {
    statusFilter?: GoGetSessionStatus | 'all';
    limit?: number;
    offset?: number;
  } = {},
): Promise<GoGetSession[]> {
  const { statusFilter = 'all', limit = 200, offset = 0 } = options;
  try {
    let q = supabase
      .from('go_get_sessions')
      .select('*')
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter);
    }

    const { data, error } = await q;
    if (error || !data) return [];
    return data.map((r) => normalizeGoGetSession(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getSessionLocationTrail(sessionId: string): Promise<LocationTrailPoint[]> {
  try {
    const { data, error } = await supabase
      .from('go_get_location_trail')
      .select('*')
      .eq('sessionId', sessionId)
      .order('recordedAt', { ascending: true });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id ?? ''),
      sessionId: String(r.sessionId ?? ''),
      lat: Number(r.lat ?? 0),
      lng: Number(r.lng ?? 0),
      heading: r.heading != null ? Number(r.heading) : null,
      speedMph: r.speedMph != null ? Number(r.speedMph) : null,
      etaSeconds: r.etaSeconds != null ? Number(r.etaSeconds) : null,
      distanceMeters: r.distanceMeters != null ? Number(r.distanceMeters) : null,
      recordedAt: String(r.recordedAt ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function getLiveLocationForStaff(sessionId: string): Promise<GoGetLiveLocation | null> {
  return getLiveLocation(sessionId);
}

export function subscribeToSessionForStaff(
  sessionId: string,
  onChange: (session: GoGetSession) => void,
): () => void {
  return subscribeToGoGetSession(sessionId, onChange);
}

type StaffSessionActor = Pick<UserProfile, 'uid' | 'displayName' | 'role'>;

async function staffSessionItem(session: GoGetSession): Promise<ItemPost | null> {
  return staffGetListingById(session.itemId);
}

async function postStaffSessionChatMessage(
  session: GoGetSession,
  actor: StaffSessionActor,
  message: string,
): Promise<void> {
  await createSupabaseMessage(
    session.chatId,
    message,
    actor.uid,
    `msg_staff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    { skipPush: true },
  );
}

/** Staff: cancel any non-terminal Go Get session. */
export async function staffCancelGoGetSession(
  session: GoGetSession,
  actor: StaffSessionActor,
  reason: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };
  if (isTerminalGoGetStatus(session.status)) {
    return { ok: false, errorMessage: 'This session is already closed.' };
  }
  if (!reason.trim()) return { ok: false, errorMessage: 'A reason is required.' };

  const item = await staffSessionItem(session);
  if (!item) return { ok: false, errorMessage: 'Could not load the linked listing.' };

  const result = await updateSession(session.id, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledByUserId: actor.uid,
    cancelReason: `[Staff] ${reason.trim()}`,
    fulfillerSharingLocation: false,
  });
  if (!result.ok || !result.session) return result;

  const staffLabel = actor.displayName || 'Staff';
  await postStaffSessionChatMessage(
    session,
    actor,
    `🛡️ ${staffLabel} cancelled this Go Get: ${reason.trim()}`,
  );

  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetCancelled({
        item,
        recipientUserId: session.requesterUserId,
        cancelledByName: staffLabel,
        sessionId: session.id,
      }),
    ),
  );
  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetCancelled({
        item,
        recipientUserId: session.fulfillerUserId,
        cancelledByName: staffLabel,
        sessionId: session.id,
      }),
    ),
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Staff: mark an arrived session complete when parties need help closing it out. */
export async function staffCompleteGoGetSession(
  session: GoGetSession,
  actor: StaffSessionActor,
  note?: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };
  if (session.status !== 'arrived') {
    return { ok: false, errorMessage: 'Only arrived sessions can be marked complete.' };
  }

  const result = await updateSession(session.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    fulfillerSharingLocation: false,
  });
  if (!result.ok || !result.session) return result;

  const staffLabel = actor.displayName || 'Staff';
  await postStaffSessionChatMessage(
    session,
    actor,
    `✅ ${staffLabel} marked this Go Get complete${note?.trim() ? `: ${note.trim()}` : '.'}`,
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Staff: expire a stale session that never finished scheduling or pickup. */
export async function staffExpireGoGetSession(
  session: GoGetSession,
  actor: StaffSessionActor,
  reason: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };
  if (isTerminalGoGetStatus(session.status)) {
    return { ok: false, errorMessage: 'This session is already closed.' };
  }
  if (!reason.trim()) return { ok: false, errorMessage: 'A reason is required.' };

  const result = await updateSession(session.id, {
    status: 'expired',
    cancelReason: `[Staff expired] ${reason.trim()}`,
    fulfillerSharingLocation: false,
  });
  if (!result.ok || !result.session) return result;

  const staffLabel = actor.displayName || 'Staff';
  await postStaffSessionChatMessage(
    session,
    actor,
    `⏱️ ${staffLabel} expired this Go Get: ${reason.trim()}`,
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Staff: mark a session disputed for review (e.g. handoff disagreement). */
export async function staffDisputeGoGetSession(
  session: GoGetSession,
  actor: StaffSessionActor,
  reason: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (!isStaffRole(actor.role)) return { ok: false, errorMessage: 'Staff only.' };
  if (!['active', 'arrived'].includes(session.status)) {
    return { ok: false, errorMessage: 'Only active or arrived sessions can be disputed.' };
  }
  if (!reason.trim()) return { ok: false, errorMessage: 'A reason is required.' };

  const result = await updateSession(session.id, {
    status: 'disputed',
    cancelReason: `[Staff dispute] ${reason.trim()}`,
    fulfillerSharingLocation: false,
  });
  if (!result.ok || !result.session) return result;

  const staffLabel = actor.displayName || 'Staff';
  await postStaffSessionChatMessage(
    session,
    actor,
    `⚠️ ${staffLabel} flagged this Go Get for review: ${reason.trim()}`,
  );
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}
