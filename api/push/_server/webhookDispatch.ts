import {
  runDirectorClaimRequestNotify,
  runDirectorJoinNotify,
  runDirectorLeaveNotify,
  runDirectorListingNotify,
  runDirectorMessageRequestNotify,
  runDirectorModerationNotify,
} from './directorNotify';
import {
  runItemCompletedNotify,
  runListingStatusNotify,
  runNeighborClaimRequestNotify,
  runNeighborItemClaimedNotify,
  runNeighborMessageRequestAcceptedNotify,
  runNeighborMessageRequestNotify,
  runNeighborItemVoteNotify,
  runNeighborNewCommentNotify,
  runNeighborNewListingNotify,
  runNeighborNewMessageNotify,
  runNeighborPickupScheduledNotify,
  runSavedItemsListingUpdatedNotify,
  runSavedItemsStatusNotify,
} from './neighborNotify';
import { runAnnouncementNotify } from './announcementNotify';
import { runAppUpdateNotify } from './appUpdateNotify';
import { runReportNotify } from './reportNotify';
import { runSupportNotify, type SupportNotifyEvent } from './supportNotify';
import { isStaffRole } from './staffRoles';
import { getSupabaseAdmin } from './supabaseAdmin';

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
  old_record?: Record<string, unknown>;
};

function mergeResults(
  results: Array<{ status: number; body: Record<string, unknown> }>,
): { status: number; body: Record<string, unknown> } {
  const sent = results.reduce((sum, r) => sum + Number(r.body.sent || 0), 0);
  const skipped = results.every((r) => r.body.skipped);
  return {
    status: 200,
    body: {
      ok: true,
      skipped: skipped && sent === 0,
      sent,
      handlers: results.map((r) => r.body),
    },
  };
}

const LISTING_CONTENT_FIELDS = ['title', 'description', 'category', 'neighborhood', 'imageUrl', 'type'] as const;

function listingContentChanged(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown>,
): boolean {
  return LISTING_CONTENT_FIELDS.some((key) => String(record[key] ?? '') !== String(oldRecord[key] ?? ''));
}

async function handleItemContentUpdate(
  record: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const callerId = String(record.userId || 'system');
  return runSavedItemsListingUpdatedNotify(callerId, {
    id: String(record.id || ''),
    userId: callerId,
    title: String(record.title || ''),
    updatedAt: String(record.updatedAt || new Date().toISOString()),
  });
}

async function handleItemStatusUpdate(
  record: Record<string, unknown>,
  oldRecord: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const previousStatus = String(oldRecord.status || '');
  const status = String(record.status || '');
  if (!status || previousStatus === status) {
    return { status: 200, body: { ok: true, skipped: 'status unchanged' } };
  }

  const callerId = String(record.userId || 'system');
  const item = {
    id: String(record.id || ''),
    userId: callerId,
    title: String(record.title || ''),
    type: String(record.type || ''),
    status,
  };

  const pending: Promise<{ status: number; body: Record<string, unknown> }>[] = [];

  // pending_pickup uses pickup_scheduled; skip generic listing_status noise.
  if (status !== 'pending_pickup') {
    pending.push(runListingStatusNotify(callerId, item, previousStatus));
  }
  pending.push(runSavedItemsStatusNotify(callerId, item, previousStatus));

  if (status === 'completed') {
    pending.push(runItemCompletedNotify(callerId, item));
  }

  if (status === 'pending_pickup') {
    pending.push(runNeighborPickupScheduledNotify(callerId, item));
  }

  const results = await Promise.all(pending);
  return mergeResults(results);
}

export async function runSupabasePushWebhook(
  body: WebhookPayload,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const table = body.table;
  const type = body.type;

  if (!table || !type) {
    return { status: 200, body: { ok: true, skipped: 'missing table or event type' } };
  }

  if (type === 'DELETE') {
    if (table === 'users' && body.old_record) {
      const row = body.old_record;
      return runDirectorLeaveNotify(String(row.uid || 'system'), {
        uid: String(row.uid || ''),
        displayName: String(row.displayName || 'A neighbor'),
        neighborhood: String(row.neighborhood || 'Sacramento area'),
        email: String(row.email || ''),
        detail: 'account deleted',
      });
    }
    return { status: 200, body: { ok: true, skipped: 'delete not handled' } };
  }

  if (type === 'UPDATE') {
    if (table === 'items' && body.record && body.old_record) {
      const record = body.record;
      const oldRecord = body.old_record;
      const statusChanged = String(record.status || '') !== String(oldRecord.status || '');
      if (statusChanged) {
        return handleItemStatusUpdate(record, oldRecord);
      }
      if (listingContentChanged(record, oldRecord)) {
        return handleItemContentUpdate(record);
      }
      return { status: 200, body: { ok: true, skipped: 'item update not notifiable' } };
    }

    if (table === 'item_votes' && body.record) {
      const record = body.record;
      const oldRecord = body.old_record;
      const voteType = String(record.voteType || '');
      if (voteType !== 'up' && voteType !== 'down') {
        return { status: 200, body: { ok: true, skipped: 'invalid vote type' } };
      }
      if (oldRecord && oldRecord.voteType === record.voteType) {
        return { status: 200, body: { ok: true, skipped: 'vote unchanged' } };
      }
      return runNeighborItemVoteNotify(String(record.userId || 'system'), {
        itemId: String(record.itemId || ''),
        userId: String(record.userId || ''),
        voteType: voteType as 'up' | 'down',
      });
    }

    if (table === 'message_requests' && body.record && body.old_record) {
      const record = body.record;
      const oldRecord = body.old_record;
      if (oldRecord.status === 'pending' && record.status === 'accepted') {
        return runNeighborMessageRequestAcceptedNotify(String(record.toUserId || 'system'), {
          id: String(record.id || ''),
          fromUserId: String(record.fromUserId || ''),
          toUserId: String(record.toUserId || ''),
          fromUserName: String(record.fromUserName || ''),
        });
      }
    }

    return { status: 200, body: { ok: true, skipped: `update on ${table} not handled` } };
  }

  if (type !== 'INSERT') {
    return { status: 200, body: { ok: true, skipped: `event ${type} not handled` } };
  }

  const record = body.record;
  if (!record) {
    return { status: 200, body: { ok: true, skipped: 'missing record' } };
  }

  if (table === 'users') {
    return runDirectorJoinNotify(String(record.uid || 'system'), {
      uid: String(record.uid || ''),
      displayName: String(record.displayName || 'A neighbor'),
      neighborhood: String(record.neighborhood || 'Sacramento area'),
      email: String(record.email || ''),
    });
  }

  if (table === 'items') {
    const item = {
      id: String(record.id || ''),
      userId: String(record.userId || ''),
      userDisplayName: String(record.userDisplayName || 'A neighbor'),
      title: String(record.title || 'New post'),
      neighborhood: String(record.neighborhood || 'Sacramento area'),
      type: String(record.type || 'giving'),
      description: String(record.description || ''),
      category: String(record.category || ''),
    };
    return mergeResults([
      await runDirectorListingNotify(item.userId, item),
      await runNeighborNewListingNotify(item.userId, item),
    ]);
  }

  if (table === 'message_requests') {
    const request = {
      id: String(record.id || ''),
      fromUserId: String(record.fromUserId || ''),
      toUserId: String(record.toUserId || ''),
      fromUserName: String(record.fromUserName || 'A neighbor'),
      message: record.message == null ? null : String(record.message),
    };
    return mergeResults([
      await runDirectorMessageRequestNotify(request.fromUserId, request),
      await runNeighborMessageRequestNotify(request.fromUserId, request),
    ]);
  }

  if (table === 'item_claim_requests') {
    const claim = {
      id: String(record.id || ''),
      itemId: String(record.itemId || ''),
      claimerUserId: String(record.claimerUserId || ''),
      claimerName: String(record.claimerName || 'A neighbor'),
      giverUserId: String(record.giverUserId || ''),
    };
    return mergeResults([
      await runDirectorClaimRequestNotify(claim.claimerUserId, claim),
      await runNeighborClaimRequestNotify(claim.claimerUserId, claim),
    ]);
  }

  if (table === 'item_claims') {
    const claimerUserId = String(record.claimerUserId || '');
    return runNeighborItemClaimedNotify(claimerUserId || 'system', {
      itemId: String(record.itemId || ''),
      claimerUserId,
    });
  }

  if (table === 'item_votes') {
    const voteType = String(record.voteType || '');
    if (voteType !== 'up' && voteType !== 'down') {
      return { status: 200, body: { ok: true, skipped: 'invalid vote type' } };
    }
    return runNeighborItemVoteNotify(String(record.userId || 'system'), {
      itemId: String(record.itemId || ''),
      userId: String(record.userId || ''),
      voteType: voteType as 'up' | 'down',
    });
  }

  if (table === 'item_comments') {
    return runNeighborNewCommentNotify(String(record.userId || 'system'), {
      id: String(record.id || ''),
      itemId: String(record.itemId || ''),
      userId: String(record.userId || ''),
      userName: String(record.userName || 'A neighbor'),
      text: String(record.text || ''),
    });
  }

  if (table === 'messages') {
    return runNeighborNewMessageNotify(String(record.senderId || 'system'), {
      id: String(record.id || ''),
      chatId: String(record.chatId || ''),
      senderId: String(record.senderId || ''),
      text: String(record.text || ''),
    });
  }

  if (table === 'moderation_audit_log') {
    return runDirectorModerationNotify(String(record.actorUserId || 'system'), {
      id: String(record.id || ''),
      actorUserId: String(record.actorUserId || ''),
      actorName: String(record.actorName || 'Staff'),
      targetUserId: String(record.targetUserId || ''),
      targetName: String(record.targetName || 'a neighbor'),
      action: String(record.action || ''),
      detail: record.detail == null ? null : String(record.detail),
    });
  }

  if (table === 'user_reports') {
    const reportId = String(record.id || '');
    const reporterUserId = String(record.reporterUserId || '');
    if (!reportId || !reporterUserId) {
      return { status: 400, body: { error: 'Invalid report record' } };
    }
    return runReportNotify(reporterUserId, reportId);
  }

  if (table === 'support_ticket_messages') {
    const ticketId = String(record.ticketId || '');
    const senderUserId = String(record.senderUserId || '');
    if (!ticketId || !senderUserId) {
      return { status: 400, body: { error: 'Invalid support message record' } };
    }

    const supabaseAdmin = await getSupabaseAdmin();
    const { data: ticket } = await supabaseAdmin
      .from('support_tickets')
      .select('openerUserId')
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      return { status: 404, body: { error: 'Support ticket not found' } };
    }

    const openerUserId = String((ticket as { openerUserId: string }).openerUserId);
    const { count } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('id', { count: 'exact', head: true })
      .eq('ticketId', ticketId);

    const { data: callerRow } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('uid', senderUserId)
      .maybeSingle();
    const callerIsStaff = isStaffRole((callerRow as { role?: string } | null)?.role);

    let event: SupportNotifyEvent;
    if (count === 1 && senderUserId === openerUserId) {
      event = 'opened';
    } else if (callerIsStaff && senderUserId !== openerUserId) {
      event = 'staff_reply';
    } else if (senderUserId === openerUserId) {
      event = 'user_message';
    } else {
      return { status: 200, body: { ok: true, skipped: 'message not eligible for push' } };
    }

    const messageId = String(record.id || '');
    return runSupportNotify(senderUserId, ticketId, event, messageId);
  }

  if (table === 'app_updates') {
    const updateId = String(record.id || '');
    const postedByUserId = String(record.postedByUserId || 'system');
    if (!updateId) {
      return { status: 200, body: { ok: true, skipped: 'missing update id' } };
    }
    return runAppUpdateNotify(postedByUserId, {
      id: updateId,
      title: String(record.title || 'App update'),
      body: String(record.body || ''),
    });
  }

  if (table === 'help_announcements') {
    const announcementId = String(record.id || '');
    const postedByUserId = String(record.postedByUserId || 'system');
    if (!announcementId) {
      return { status: 200, body: { ok: true, skipped: 'missing announcement id' } };
    }
    return runAnnouncementNotify(postedByUserId, {
      id: announcementId,
      title: String(record.title || 'Community announcement'),
      body: String(record.body || ''),
    });
  }

  return { status: 200, body: { ok: true, skipped: `table ${table} not handled` } };
}

export async function runPushResubscribe(params: {
  userId: string;
  subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  userAgent?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const userId = String(params.userId || '');
  const endpoint = params.subscription?.endpoint;
  const p256dh = params.subscription?.keys?.p256dh;
  const auth = params.subscription?.keys?.auth;

  if (!userId || !endpoint || !p256dh || !auth) {
    return { status: 400, body: { error: 'Invalid subscription payload' } };
  }

  const { claimPushSubscriptionForUser } = await import('./pushSubscribe');
  const claimed = await claimPushSubscriptionForUser(userId, {
    endpoint,
    p256dh,
    auth,
    userAgent: params.userAgent,
  });

  if (!claimed.ok) {
    return { status: 500, body: { error: claimed.error || 'Could not save subscription' } };
  }

  return { status: 200, body: { ok: true, userId } };
}
