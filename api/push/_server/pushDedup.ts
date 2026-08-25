import { getSupabaseAdmin } from './supabaseAdmin';
import type { DeliveryMode, NotificationPriority } from '../../../shared/notificationTypes';

export interface NotificationEventRecord {
  id: string;
  eventType: string;
  dedupKey: string;
  actorId?: string;
  recipientId: string;
  entityType?: string;
  entityId?: string;
  priority: NotificationPriority;
  deliveryMode: DeliveryMode;
  source?: string;
  title?: string;
  body?: string;
  url?: string;
  createdAt: string;
}

export interface ClaimNotificationEventInput {
  eventType: string;
  dedupKey: string;
  recipientId: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  priority: NotificationPriority;
  deliveryMode: DeliveryMode;
  source?: string;
  title?: string;
  body?: string;
  url?: string;
}

/**
 * Claim a deterministic notification event for one recipient.
 * Returns false when (recipientId, dedupKey) already exists — client + webhook dedup.
 */
export async function claimNotificationEvent(input: ClaimNotificationEventInput): Promise<boolean> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('notification_events').insert({
      id: crypto.randomUUID(),
      eventType: input.eventType,
      dedupKey: input.dedupKey,
      actorId: input.actorId || null,
      recipientId: input.recipientId,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      priority: input.priority,
      deliveryMode: input.deliveryMode,
      source: input.source || null,
      title: input.title || null,
      body: input.body || null,
      url: input.url || null,
      createdAt: new Date().toISOString(),
    });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') return false;
      console.warn('[push] notification_events insert failed, allowing send:', error.message);
      return true;
    }
    return true;
  } catch (err) {
    console.warn('[push] notification event claim failed, allowing send:', (err as Error).message);
    return true;
  }
}

/** Release a claim when nothing was delivered (inbox + push both skipped). */
export async function releaseNotificationEvent(recipientId: string, dedupKey: string): Promise<void> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin
      .from('notification_events')
      .delete()
      .eq('recipientId', recipientId)
      .eq('dedupKey', dedupKey);
  } catch (err) {
    console.warn('[push] notification event release failed:', (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Legacy global tag dedup (push_dispatch_log) — kept for campaign sends that
// use a single global tag before per-recipient fan-out.
// ---------------------------------------------------------------------------

const LEGACY_DEDUP_WINDOW_MS = 90_000;

/** @deprecated Prefer claimNotificationEvent with per-recipient dedup keys. */
export async function claimPushDispatch(tag?: string): Promise<boolean> {
  if (!tag) return true;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const cutoff = new Date(Date.now() - LEGACY_DEDUP_WINDOW_MS).toISOString();

    await supabaseAdmin.from('push_dispatch_log').delete().lt('createdAt', cutoff);

    const { error } = await supabaseAdmin.from('push_dispatch_log').insert({
      id: crypto.randomUUID(),
      tag,
      createdAt: new Date().toISOString(),
    });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') return false;
      console.warn('[push] dedup insert failed, allowing send:', error.message);
      return true;
    }

    return true;
  } catch (err) {
    console.warn('[push] dedup check failed, allowing send:', (err as Error).message);
    return true;
  }
}

/** @deprecated Prefer releaseNotificationEvent. */
export async function releasePushDispatch(tag?: string): Promise<void> {
  if (!tag) return;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    await supabaseAdmin.from('push_dispatch_log').delete().eq('tag', tag);
  } catch (err) {
    console.warn('[push] dedup release failed:', (err as Error).message);
  }
}
