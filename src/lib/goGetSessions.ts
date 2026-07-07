import { supabase, buildDmChatId, getOrCreateSupabaseChat, createSupabaseMessage } from '../supabase';
import type { GoGetFulfillerLiveLocation, GoGetHandshakeMode, GoGetLiveLocation, GoGetSession, GoGetSessionStatus, ItemPost } from '../types';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './pushConfig';
import { subscribePostgresChanges } from './supabaseRealtime';

/** Curb Alert / Porch Pickup — first-come items meant to be grabbed with no handshake. */
export const INSTANT_CLAIM_CATEGORIES = ['Curb Alert', 'Porch Pickup'];

export function isInstantClaimCategory(category: string): boolean {
  return INSTANT_CLAIM_CATEGORIES.includes(category);
}

export function goGetHandshakeModeForItem(item: Pick<ItemPost, 'type' | 'category'>): GoGetHandshakeMode {
  return item.type === 'giveaway' && isInstantClaimCategory(item.category) ? 'instant' : 'availability';
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
  'Run the Go Get pickup sessions SQL (section 20/21 in supabase-complete.sql) in Supabase.';

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01';
}

/** Any non-terminal session for this item involving this user (either role). */
export async function getActiveGoGetSession(itemId: string, userId: string): Promise<GoGetSession | null> {
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
  try {
    const { data, error } = await supabase.from('go_get_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (error || !data) return null;
    return normalizeGoGetSession(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export interface CreateGoGetSessionParams {
  item: ItemPost;
  fulfillerUserId: string;
  fulfillerName: string;
  requesterUserId: string;
  requesterName: string;
  destination: { lat: number; lng: number };
  destinationLabel: string;
}

/** Start a "Go Get" — creates (or reuses) the pairing chat and the session row. */
export async function createGoGetSession(
  params: CreateGoGetSessionParams,
): Promise<Result<{ session: GoGetSession }>> {
  const { item, fulfillerUserId, fulfillerName, requesterUserId, requesterName, destination, destinationLabel } =
    params;

  if (fulfillerUserId === requesterUserId) {
    return { ok: false, errorMessage: 'You cannot Go Get your own listing.' };
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
  const now = new Date().toISOString();
  const instant = handshakeMode === 'instant';

  const id = `ggs_${item.id}_${requesterUserId}_${Date.now()}`;
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
    status: instant ? 'active' : 'awaiting_availability',
    destinationLat: destination.lat,
    destinationLng: destination.lng,
    destinationLabel,
    startedAt: instant ? now : null,
    createdAt: now,
    updatedAt: now,
  };

  const { error } = await supabase.from('go_get_sessions').insert(payload);
  if (error) {
    if (isMissingTableError(error)) return { ok: false, errorMessage: MISSING_TABLE_MESSAGE };
    return { ok: false, errorMessage: error.message };
  }

  const session = normalizeGoGetSession(payload);

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await createSupabaseMessage(
    chatId,
    instant
      ? `🚗 ${requesterName} is heading over to grab "${item.title}" — no need to do anything, just have it ready.`
      : `📦 ${requesterName} wants to Go Get "${item.title}". Are you available for pickup right now?`,
    requesterUserId,
    messageId,
    { skipPush: true },
  );

  if (!instant) {
    await runGoGetPushTask(() =>
      import('./pushEvents').then((m) =>
        m.notifyGoGetAvailabilityRequest({ item, fulfillerUserId, requesterName, sessionId: id }),
      ),
    );
  }

  return { ok: true, session };
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

/** Fulfiller: "Yes, I'm available now" — starts the ready-to-drive state immediately. */
export async function respondAvailableNow(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'awaiting_availability') {
    return { ok: false, errorMessage: 'This request was already answered.' };
  }
  const now = new Date().toISOString();
  const result = await updateSession(session.id, {
    status: 'scheduled',
    scheduledAt: now,
    fulfillerReadyAt: now,
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

  const result = await updateSession(session.id, {
    status: 'window_offered',
    availableFrom: window.from,
    availableUntil: window.until,
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

  const result = await updateSession(session.id, { status: 'scheduled', scheduledAt });
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
  if (session.status !== 'scheduled' || session.fulfillerReadyAt) {
    return { ok: false, errorMessage: 'Nothing to confirm right now.' };
  }
  const result = await updateSession(session.id, { fulfillerReadyAt: new Date().toISOString() });
  if (!result.ok || !result.session) return result;

  await createSupabaseMessage(
    session.chatId,
    `✅ ${session.fulfillerName} is ready — ${session.requesterName} can Go Get it now.`,
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

/** Requester taps "Go Get" once the fulfiller is ready — this is what starts the trip. */
export async function startGoGetTrip(
  session: GoGetSession,
  item: ItemPost,
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'scheduled' || !session.fulfillerReadyAt) {
    return { ok: false, errorMessage: `${session.fulfillerName} hasn't confirmed they're ready yet.` };
  }
  const result = await updateSession(session.id, { status: 'active', startedAt: new Date().toISOString() });
  if (!result.ok || !result.session) return result;

  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetStarted({
        item,
        fulfillerUserId: session.fulfillerUserId,
        requesterName: session.requesterName,
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
  if (session.status !== 'active') {
    return { ok: false, errorMessage: 'This trip is not active.' };
  }
  const result = await updateSession(session.id, { status: 'arrived', arrivedAt: new Date().toISOString() });
  if (!result.ok || !result.session) return result;

  await runGoGetPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyGoGetArrived({
        item,
        fulfillerUserId: session.fulfillerUserId,
        requesterName: session.requesterName,
        sessionId: session.id,
      }),
    ),
  );
  await clearLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Fulfiller confirms the handoff actually happened — separate item-type completion is handled by the caller. */
export async function confirmGoGetCompletion(session: GoGetSession): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'arrived') {
    return { ok: false, errorMessage: 'Nothing to confirm yet.' };
  }
  const result = await updateSession(session.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    fulfillerSharingLocation: false,
  });
  if (!result.ok || !result.session) return result;
  await clearLiveLocation(session.id);
  await clearFulfillerLiveLocation(session.id);
  return { ok: true, session: result.session };
}

/** Fulfiller disputes the handoff (item never actually handed off) — caller should also file a violation. */
export async function disputeGoGetCompletion(
  session: GoGetSession,
  reason: string,
): Promise<Result<{ session: GoGetSession }>> {
  if (session.status !== 'arrived') {
    return { ok: false, errorMessage: 'Nothing to dispute yet.' };
  }
  const result = await updateSession(session.id, { status: 'disputed', cancelReason: reason, fulfillerSharingLocation: false });
  if (!result.ok || !result.session) return result;
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
  const result = await updateSession(session.id, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledByUserId,
    cancelReason: reason ?? null,
    fulfillerSharingLocation: false,
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
}

export async function getLiveLocation(sessionId: string): Promise<GoGetLiveLocation | null> {
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
