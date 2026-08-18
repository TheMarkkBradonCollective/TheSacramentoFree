import {
  STAFF_APPLY_INVITE_ACTOR,
  STAFF_APPLY_INVITE_BODY,
  STAFF_APPLY_INVITE_TAG,
  STAFF_APPLY_INVITE_TITLE,
  STAFF_APPLY_INVITE_URL,
} from '../../../shared/staffApplyInvite';
import {
  getPreferencesForUsers,
  sendToSubscription,
  userAllowsEvent,
  type NotificationPreferencesRow,
  type PushPayload,
} from './pushDelivery';
import { isStaffRole } from './staffRoles';
import { getSupabaseAdmin } from './supabaseAdmin';
import { logUserNotifications } from './userNotificationLog';

const PAGE_SIZE = 1000;
const IN_CHUNK = 100;

type UserRow = { uid?: string; role?: string; accountStatus?: string };
type SubscriptionRow = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchAllRows<T>(table: string, columns: string): Promise<T[]> {
  const admin = await getSupabaseAdmin();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await admin.from(table).select(columns).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function staffApplyPayload(): PushPayload {
  return {
    title: STAFF_APPLY_INVITE_TITLE,
    body: STAFF_APPLY_INVITE_BODY,
    url: STAFF_APPLY_INVITE_URL,
    tag: STAFF_APPLY_INVITE_TAG,
    eventType: 'account_update',
    data: {
      actorName: STAFF_APPLY_INVITE_ACTOR,
      campaign: 'staff_apply_invite',
    },
  };
}

/**
 * One-shot fan-out: Notify inbox + device push for active neighbors (not staff).
 * Idempotent via the stable tag on user_notifications.
 */
export async function sendStaffApplyInviteCampaign(): Promise<{
  skipped?: string;
  recipients: number;
  sent: number;
  failed: number;
  removed: number;
  subscriptionCount: number;
}> {
  const admin = await getSupabaseAdmin();
  const payload = staffApplyPayload();

  const { data: existing, error: existingError } = await admin
    .from('user_notifications')
    .select('id')
    .eq('tag', STAFF_APPLY_INVITE_TAG)
    .limit(1)
    .maybeSingle();
  if (existingError && existingError.code !== 'PGRST116') {
    throw new Error(`staff-apply invite lookup failed: ${existingError.message}`);
  }
  if (existing) {
    return { skipped: 'already_sent', recipients: 0, sent: 0, failed: 0, removed: 0, subscriptionCount: 0 };
  }

  const users = await fetchAllRows<UserRow>('users', 'uid, role, accountStatus');
  const neighborIds = users
    .map((row) => {
      const uid = String(row.uid || '').trim();
      if (!uid) return '';
      const status = String(row.accountStatus || 'active').trim() || 'active';
      if (status !== 'active') return '';
      if (isStaffRole(row.role)) return '';
      return uid;
    })
    .filter(Boolean);

  if (!neighborIds.length) {
    return { skipped: 'no_neighbors', recipients: 0, sent: 0, failed: 0, removed: 0, subscriptionCount: 0 };
  }

  const prefsMap = new Map<string, NotificationPreferencesRow>();
  for (const group of chunk(neighborIds, IN_CHUNK)) {
    const part = await getPreferencesForUsers(group);
    for (const [uid, prefs] of part) prefsMap.set(uid, prefs);
  }

  const allowed = neighborIds.filter((uid) => {
    const prefs = prefsMap.get(uid);
    if (!prefs) return true;
    return userAllowsEvent(prefs, 'account_update');
  });

  if (!allowed.length) {
    return { skipped: 'prefs_off', recipients: 0, sent: 0, failed: 0, removed: 0, subscriptionCount: 0 };
  }

  const { claimPushDispatch, releasePushDispatch } = await import('./pushDedup');
  const claimed = await claimPushDispatch(STAFF_APPLY_INVITE_TAG);
  if (!claimed) {
    return { skipped: 'in_flight', recipients: allowed.length, sent: 0, failed: 0, removed: 0, subscriptionCount: 0 };
  }

  for (const group of chunk(allowed, IN_CHUNK)) {
    await logUserNotifications(group, payload);
  }

  const allowedSet = new Set(allowed);
  const subscriptions = (await fetchAllRows<SubscriptionRow>('push_subscriptions', '*')).filter((row) =>
    allowedSet.has(String(row.userId || '')),
  );

  let sent = 0;
  let failed = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendToSubscription(sub, payload);
      if (result.ok) sent += 1;
      else {
        failed += 1;
        if (result.removed) removed += 1;
      }
    }),
  );

  if (sent === 0) {
    await admin.from('user_notifications').delete().eq('tag', STAFF_APPLY_INVITE_TAG);
    await releasePushDispatch(STAFF_APPLY_INVITE_TAG);
  }

  return {
    recipients: allowed.length,
    sent,
    failed,
    removed,
    subscriptionCount: subscriptions.length,
  };
}
