import { computeDedupKey } from '../../../shared/dedupKey';
import {
  getEventMetadata,
  shouldDeliverInApp,
  shouldDeliverPush,
  type AndroidNotificationChannel,
  type DeliveryMode,
  type NotificationPriority,
} from '../../../shared/notificationTypes';
import { isStaffModePushEvent, receivesStaffModeNotifications } from '../../../shared/staffInteractionMode';
import { claimNotificationEvent, releaseNotificationEvent } from './pushDedup';
import { shouldSuppressForQuietHours } from './quietHours';
import {
  getPreferencesForUsers,
  getStaffInteractionModesForUsers,
  getSubscriptionsForUsers,
  sendToSubscription,
  userAllowsDirectorAlert,
  userAllowsEvent,
  type NotificationPreferencesRow,
  type PushEventType,
  type PushPayload,
} from './pushDelivery';
import { filterSubscriptionsForPickupPush } from './pickupPushEvents';
import { configureVapidAsync } from './webPushLoader';
import { isFcmConfigured } from './fcmDelivery';

export type NotificationSource = 'client' | 'webhook' | 'cron' | 'internal';

export interface NotificationIntent {
  eventType: PushEventType;
  title: string;
  body: string;
  url: string;
  tag?: string;
  data?: Record<string, string>;
  recipientUserIds: string[];
  excludeUserIds?: string[];
  actorId?: string;
  entityType?: string;
  entityId?: string;
  source?: NotificationSource;
  skipPreferenceCheck?: boolean;
  skipDedup?: boolean;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  removed: number;
  skipped: number;
  subscriptionCount: number;
  deduped: number;
  inboxWritten: number;
}

interface RecipientPlan {
  userId: string;
  dedupKey: string;
  priority: NotificationPriority;
  deliveryMode: DeliveryMode;
  androidChannel: AndroidNotificationChannel;
  bypassQuietHours?: boolean;
  deliverInApp: boolean;
  deliverPush: boolean;
}

async function canDeliverPush(): Promise<boolean> {
  return (await configureVapidAsync()) || isFcmConfigured();
}

function extractEntityId(payload: PushPayload): string | undefined {
  const data = payload.data || {};
  return (
    data.listingId ||
    data.itemId ||
    data.messageId ||
    data.conversationId ||
    data.requestId ||
    data.postId ||
    data.commentId ||
    undefined
  );
}

function buildPayload(intent: NotificationIntent): PushPayload {
  return {
    title: intent.title,
    body: intent.body,
    url: intent.url,
    tag: intent.tag,
    eventType: intent.eventType,
    data: intent.data,
  };
}

async function planRecipients(
  intent: NotificationIntent,
  payload: PushPayload,
): Promise<{ plans: RecipientPlan[]; skipped: number }> {
  const exclude = new Set(intent.excludeUserIds || []);
  const targets = [...new Set(intent.recipientUserIds)].filter((id) => id && !exclude.has(id));
  if (!targets.length) return { plans: [], skipped: 0 };

  const metadata = getEventMetadata(intent.eventType);
  let allowed = targets;

  if (!intent.skipPreferenceCheck) {
    const prefsMap = await getPreferencesForUsers(targets);
    allowed = targets.filter((uid) => {
      const prefs = prefsMap.get(uid);
      if (!prefs) return true;
      if (intent.eventType === 'director_alert') {
        return userAllowsDirectorAlert(prefs, intent.data?.directorCategory);
      }
      return userAllowsEvent(prefs, intent.eventType);
    });
  }

  if (isStaffModePushEvent(intent.eventType)) {
    const modeMap = await getStaffInteractionModesForUsers(allowed);
    allowed = allowed.filter((uid) => receivesStaffModeNotifications(modeMap.get(uid)));
  }

  const prefsMap = await getPreferencesForUsers(allowed);
  const plans: RecipientPlan[] = [];
  let skipped = targets.length - allowed.length;

  for (const userId of allowed) {
    const prefs = prefsMap.get(userId);
    const quietSuppressed =
      prefs &&
      shouldSuppressForQuietHours(
        prefs as NotificationPreferencesRow & { quietHoursEnabled?: boolean },
        metadata.priority,
        metadata.bypassQuietHours,
      );

    const deliverInApp = shouldDeliverInApp(metadata.deliveryMode);
    let deliverPush = shouldDeliverPush(metadata.deliveryMode) && !quietSuppressed;

    // Silent events never push
    if (metadata.priority === 'silent') deliverPush = false;

    if (!deliverInApp && !deliverPush) {
      skipped += 1;
      continue;
    }

    const dedupKey = computeDedupKey({
      eventType: intent.eventType,
      recipientUserId: userId,
      tag: intent.tag,
      entityId: intent.entityId || extractEntityId(payload),
      data: intent.data,
    });

    plans.push({
      userId,
      dedupKey,
      priority: metadata.priority,
      deliveryMode: metadata.deliveryMode,
      androidChannel: metadata.androidChannel,
      bypassQuietHours: metadata.bypassQuietHours,
      deliverInApp,
      deliverPush,
    });
  }

  return { plans, skipped };
}

/**
 * Central notification engine — every meaningful event creates a notification
 * record first; delivery (inbox, push) is secondary and preference-aware.
 */
export async function dispatchNotification(intent: NotificationIntent): Promise<DispatchResult> {
  const payload = buildPayload(intent);
  const { plans, skipped } = await planRecipients(intent, payload);

  if (!plans.length) {
    return { sent: 0, failed: 0, removed: 0, skipped, subscriptionCount: 0, deduped: 0, inboxWritten: 0 };
  }

  const claimedPlans: RecipientPlan[] = [];
  let deduped = 0;

  for (const plan of plans) {
    if (intent.skipDedup) {
      claimedPlans.push(plan);
      continue;
    }

    const claimed = await claimNotificationEvent({
      eventType: intent.eventType,
      dedupKey: plan.dedupKey,
      recipientId: plan.userId,
      actorId: intent.actorId,
      entityType: intent.entityType,
      entityId: intent.entityId || extractEntityId(payload),
      priority: plan.priority,
      deliveryMode: plan.deliveryMode,
      source: intent.source,
      title: intent.title,
      body: intent.body,
      url: intent.url,
    });

    if (claimed) claimedPlans.push(plan);
    else deduped += 1;
  }

  if (!claimedPlans.length) {
    return { sent: 0, failed: 0, removed: 0, skipped, subscriptionCount: 0, deduped, inboxWritten: 0 };
  }

  const inboxRecipients = claimedPlans.filter((p) => p.deliverInApp).map((p) => p.userId);
  let inboxWritten = 0;

  if (inboxRecipients.length) {
    const { logUserNotifications } = await import('./userNotificationLog');
    await logUserNotifications(inboxRecipients, payload);
    inboxWritten = inboxRecipients.length;
  }

  const pushRecipients = claimedPlans.filter((p) => p.deliverPush).map((p) => p.userId);
  let sent = 0;
  let failed = 0;
  let removed = 0;
  let subscriptionCount = 0;
  const usersWithPush = new Set<string>();

  if (pushRecipients.length && (await canDeliverPush())) {
    const subscriptions = filterSubscriptionsForPickupPush(
      await getSubscriptionsForUsers(pushRecipients),
      intent.eventType,
    );
    subscriptionCount = subscriptions.length;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = claimedPlans.find((p) => p.userId === sub.userId);
        const pushPayload: PushPayload = {
          ...payload,
          data: {
            ...(payload.data || {}),
            priority: plan?.priority,
            androidChannel: plan?.androidChannel,
          },
        };
        const result = await sendToSubscription(sub, pushPayload);
        if (result.ok) {
          sent += 1;
          usersWithPush.add(sub.userId);
        } else {
          failed += 1;
          if (result.removed) removed += 1;
        }
      }),
    );
  }

  // Release claims when nothing was actually delivered for a recipient
  for (const plan of claimedPlans) {
    const gotInbox = plan.deliverInApp;
    const gotPush = plan.deliverPush && usersWithPush.has(plan.userId);
    if (!gotInbox && !gotPush && !intent.skipDedup) {
      await releaseNotificationEvent(plan.userId, plan.dedupKey);
    }
  }

  return { sent, failed, removed, skipped, subscriptionCount, deduped, inboxWritten };
}
