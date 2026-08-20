import { supabase } from '../supabase';
import type { GoGetSession, UserProfile, UserViolation, ViolationCategory, ViolationStatus } from '../types';
import { isStaffRole, roleRank } from './roles';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './pushConfig';

async function runViolationPushTask(task: () => Promise<unknown>): Promise<void> {
  if (!CLIENT_PUSH_DISPATCH_ENABLED) return;
  try {
    await task();
  } catch (err) {
    console.warn('[violation push]', err);
  }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeViolation(row: Record<string, unknown>): UserViolation {
  return {
    id: str(row.id),
    userId: str(row.userId),
    sessionId: nullableStr(row.sessionId),
    reportedByUserId: str(row.reportedByUserId),
    reportedByName: str(row.reportedByName, 'Neighbor'),
    category: (str(row.category, 'other') as ViolationCategory) || 'other',
    description: str(row.description),
    status: (str(row.status, 'pending_review') as ViolationStatus) || 'pending_review',
    countsTowardStrikes: Boolean(row.countsTowardStrikes),
    reviewedByUserId: nullableStr(row.reviewedByUserId),
    reviewedByName: nullableStr(row.reviewedByName),
    reviewedAt: nullableStr(row.reviewedAt),
    reviewNote: nullableStr(row.reviewNote),
    appealText: nullableStr(row.appealText),
    appealedAt: nullableStr(row.appealedAt),
    appealDecisionByUserId: nullableStr(row.appealDecisionByUserId),
    appealDecisionByName: nullableStr(row.appealDecisionByName),
    appealDecisionAt: nullableStr(row.appealDecisionAt),
    appealDecisionNote: nullableStr(row.appealDecisionNote),
    createdAt: str(row.createdAt, new Date().toISOString()),
    updatedAt: str(row.updatedAt, new Date().toISOString()),
  };
}

type Result = { ok: boolean; errorMessage?: string };

const MISSING_TABLE_MESSAGE = 'Run the Go Get violations SQL (section 21 in complete-schema.sql) in Supabase.';

function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01';
}

/** Max strikes before an account auto-locks — kept in sync with the DB trigger in complete-schema.sql. */
export const VIOLATION_LOCK_THRESHOLD = 6;

export interface FileViolationParams {
  targetUserId: string;
  targetName: string;
  sessionId?: string | null;
  reportedByUserId: string;
  reportedByName: string;
  category: ViolationCategory;
  description: string;
}

export async function fileGoGetViolation(params: FileViolationParams): Promise<Result & { violationId?: string }> {
  if (params.targetUserId === params.reportedByUserId) {
    return { ok: false, errorMessage: 'You cannot report yourself.' };
  }
  const id = `viol_${params.targetUserId}_${Date.now()}`;
  const { error } = await supabase.from('user_violations').insert({
    id,
    userId: params.targetUserId,
    sessionId: params.sessionId ?? null,
    reportedByUserId: params.reportedByUserId,
    reportedByName: params.reportedByName,
    category: params.category,
    description: params.description,
    status: 'pending_review',
    countsTowardStrikes: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (error) {
    if (isMissingTableError(error)) return { ok: false, errorMessage: MISSING_TABLE_MESSAGE };
    return { ok: false, errorMessage: error.message };
  }

  await runViolationPushTask(() =>
    import('./pushEvents').then((m) => m.notifyViolationFiled({ userId: params.targetUserId, violationId: id })),
  );

  return { ok: true, violationId: id };
}

export async function getViolationsForSession(sessionId: string): Promise<UserViolation[]> {
  if (!sessionId) return [];
  try {
    const { data, error } = await supabase
      .from('user_violations')
      .select('*')
      .eq('sessionId', sessionId)
      .order('createdAt', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => normalizeViolation(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** Staff files a Go Get violation on behalf of the community. */
export async function staffFileGoGetViolation(params: {
  actor: UserProfile;
  targetUserId: string;
  targetName: string;
  sessionId: string;
  category: ViolationCategory;
  description: string;
}): Promise<Result & { violationId?: string }> {
  if (!isStaffRole(params.actor.role)) {
    return { ok: false, errorMessage: 'Staff only.' };
  }
  if (!params.description.trim()) {
    return { ok: false, errorMessage: 'A description is required.' };
  }
  if (params.targetUserId === params.actor.uid) {
    return { ok: false, errorMessage: 'Choose a participant to report.' };
  }

  const description = `[Staff escalation by ${params.actor.displayName}] ${params.description.trim()}`;
  return fileGoGetViolation({
    targetUserId: params.targetUserId,
    targetName: params.targetName,
    sessionId: params.sessionId,
    reportedByUserId: params.actor.uid,
    reportedByName: params.actor.displayName,
    category: params.category,
    description,
  });
}

export type StaffSessionCloseAction = 'cancel' | 'expire' | 'dispute' | 'complete' | 'none';

/** Close (or leave) a session and file a violation in one staff workflow step. */
export async function staffEscalateGoGetSession(params: {
  actor: UserProfile;
  session: GoGetSession;
  accusedUserId: string;
  accusedName: string;
  category: ViolationCategory;
  description: string;
  closeAction: StaffSessionCloseAction;
  closeReason?: string;
}): Promise<Result & { violationId?: string; session?: GoGetSession }> {
  const { actor, session, closeAction, closeReason } = params;
  let updatedSession = session;

  if (closeAction !== 'none') {
    const {
      staffCancelGoGetSession,
      staffCompleteGoGetSession,
      staffDisputeGoGetSession,
      staffExpireGoGetSession,
    } = await import('./goGetSessions');

    let closeResult: { ok: boolean; errorMessage?: string; session?: GoGetSession };
    if (closeAction === 'cancel') {
      closeResult = await staffCancelGoGetSession(session, actor, closeReason || params.description);
    } else if (closeAction === 'expire') {
      closeResult = await staffExpireGoGetSession(session, actor, closeReason || params.description);
    } else if (closeAction === 'dispute') {
      closeResult = await staffDisputeGoGetSession(session, actor, closeReason || params.description);
    } else {
      closeResult = await staffCompleteGoGetSession(session, actor, closeReason || params.description);
    }

    if (!closeResult.ok) return closeResult;
    if (closeResult.session) updatedSession = closeResult.session;
  }

  const violationResult = await staffFileGoGetViolation({
    actor,
    targetUserId: params.accusedUserId,
    targetName: params.accusedName,
    sessionId: session.id,
    category: params.category,
    description: params.description,
  });
  if (!violationResult.ok) return violationResult;

  return { ok: true, violationId: violationResult.violationId, session: updatedSession };
}

export function suggestViolationCategoryForSession(session: GoGetSession): ViolationCategory {
  if (session.status === 'disputed' || session.status === 'arrived') return 'false_claim';
  if (['awaiting_availability', 'awaiting_schedule', 'window_offered', 'scheduled'].includes(session.status)) return 'no_show';
  if (session.status === 'active') return 'no_show';
  return 'other';
}

export function suggestAccusedUserForSession(session: GoGetSession): {
  userId: string;
  name: string;
} {
  if (['awaiting_availability', 'awaiting_schedule', 'window_offered', 'scheduled'].includes(session.status)) {
    return { userId: session.fulfillerUserId, name: session.fulfillerName };
  }
  if (session.status === 'active' || session.status === 'arrived' || session.status === 'disputed') {
    return { userId: session.requesterUserId, name: session.requesterName };
  }
  return { userId: session.requesterUserId, name: session.requesterName };
}

export async function getViolationsForUser(userId: string): Promise<UserViolation[]> {
  try {
    const { data, error } = await supabase
      .from('user_violations')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => normalizeViolation(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** Staff review queue: anything not yet resolved (new reports + pending appeals). */
export async function getOpenViolationsForStaff(limit = 200): Promise<UserViolation[]> {
  try {
    const { data, error } = await supabase
      .from('user_violations')
      .select('*')
      .in('status', ['pending_review', 'appealed'])
      .order('createdAt', { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => normalizeViolation(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getAllViolationsForStaff(limit = 300): Promise<UserViolation[]> {
  try {
    const { data, error } = await supabase
      .from('user_violations')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r) => normalizeViolation(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

export async function getUserStrikeCount(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('user_violation_strike_count', { target_uid: userId });
    if (error || typeof data !== 'number') return 0;
    return data;
  } catch {
    return 0;
  }
}

/** City Moderator+ confirms or dismisses a freshly reported violation. */
export async function reviewGoGetViolation(params: {
  violation: UserViolation;
  actor: UserProfile;
  decision: 'confirm' | 'dismiss';
  note?: string;
}): Promise<Result> {
  const { violation, actor, decision, note } = params;
  if (violation.status !== 'pending_review') {
    return { ok: false, errorMessage: 'This report was already reviewed.' };
  }

  const { error } = await supabase
    .from('user_violations')
    .update({
      status: decision === 'confirm' ? 'confirmed' : 'dismissed',
      countsTowardStrikes: decision === 'confirm',
      reviewedByUserId: actor.uid,
      reviewedByName: actor.displayName,
      reviewedAt: new Date().toISOString(),
      reviewNote: note ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', violation.id);
  if (error) return { ok: false, errorMessage: error.message };

  const strikes = decision === 'confirm' ? await getUserStrikeCount(violation.userId) : 0;
  await runViolationPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyViolationDecision({
        userId: violation.userId,
        violationId: violation.id,
        strikeCount: strikes,
        confirmed: decision === 'confirm',
      }),
    ),
  );
  if (decision === 'confirm' && strikes >= VIOLATION_LOCK_THRESHOLD) {
    await runViolationPushTask(() =>
      import('./pushEvents').then((m) => m.notifyAccountLockedForViolations({ userId: violation.userId })),
    );
  }

  return { ok: true };
}

/** The accused appeals a confirmed violation — pauses it counting toward strikes while under review. */
export async function appealGoGetViolation(params: {
  violation: UserViolation;
  actorUserId: string;
  appealText: string;
}): Promise<Result> {
  const { violation, actorUserId, appealText } = params;
  if (violation.userId !== actorUserId) {
    return { ok: false, errorMessage: 'Only the account holder can appeal this.' };
  }
  if (violation.status !== 'confirmed') {
    return { ok: false, errorMessage: 'Only a confirmed violation can be appealed.' };
  }
  if (!appealText.trim()) {
    return { ok: false, errorMessage: 'Explain why you are appealing.' };
  }

  const { error } = await supabase
    .from('user_violations')
    .update({
      status: 'appealed',
      countsTowardStrikes: false,
      appealText: appealText.trim(),
      appealedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .eq('id', violation.id);
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

/** City Administrator+ only — mods do not get the final word on disputes. */
export async function decideGoGetViolationAppeal(params: {
  violation: UserViolation;
  actor: UserProfile;
  decision: 'uphold' | 'deny';
  note?: string;
}): Promise<Result> {
  const { violation, actor, decision, note } = params;
  if (roleRank(actor.role) < roleRank('city_administrator')) {
    return { ok: false, errorMessage: 'Only a city administrator or higher can decide an appeal.' };
  }
  if (violation.status !== 'appealed') {
    return { ok: false, errorMessage: 'This violation has no pending appeal.' };
  }

  const upheld = decision === 'uphold';
  const { error } = await supabase
    .from('user_violations')
    .update({
      status: upheld ? 'appeal_upheld' : 'appeal_denied',
      // Upheld = overturned, never counts again. Denied = the original violation stands and counts again.
      countsTowardStrikes: !upheld,
      appealDecisionByUserId: actor.uid,
      appealDecisionByName: actor.displayName,
      appealDecisionAt: new Date().toISOString(),
      appealDecisionNote: note ?? null,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', violation.id);
  if (error) return { ok: false, errorMessage: error.message };

  await runViolationPushTask(() =>
    import('./pushEvents').then((m) =>
      m.notifyAppealDecision({ userId: violation.userId, violationId: violation.id, upheld }),
    ),
  );
  return { ok: true };
}

/** City Administrator+ — lifts a 6-strike account lock (never auto-expires like a timed suspension). */
export async function unlockViolationLockedAccount(params: {
  actor: UserProfile;
  targetUserId: string;
  note?: string;
}): Promise<Result> {
  if (roleRank(params.actor.role) < roleRank('city_administrator')) {
    return { ok: false, errorMessage: 'Only a city administrator or higher can unlock this account.' };
  }
  try {
    const { data, error } = await supabase.rpc('staff_unlock_violation_account', {
      target_uid: params.targetUserId,
      note: params.note ?? null,
    });
    if (error) return { ok: false, errorMessage: error.message };
    if (data !== true) return { ok: false, errorMessage: 'Could not unlock this account.' };
    return { ok: true };
  } catch (err) {
    return { ok: false, errorMessage: err instanceof Error ? err.message : 'Could not unlock this account.' };
  }
}
