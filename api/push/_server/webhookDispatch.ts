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
  runSavedItemsStatusNotify,
} from './neighborNotify';
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

  const results = [
    await runListingStatusNotify(callerId, item, previousStatus),
    await runSavedItemsStatusNotify(callerId, item, previousStatus),
  ];

  if (status === 'completed') {
    results.push(await runItemCompletedNotify(callerId, item));
  }

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
      return handleItemStatusUpdate(body.record, body.old_record);
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
    return runNeighborItemClaimedNotify(String(record.userId || 'system'), {
      itemId: String(record.itemId || ''),
      userId: String(record.userId || ''),
      userName: String(record.userName || 'A neighbor'),
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

    return runSupportNotify(senderUserId, ticketId, event);
  }

  return { status: 200, body: { ok: true, skipped: `table ${table} not handled` } };
}

export async function runPushResubscribe(params: {
  oldEndpoint?: string;
  subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  userAgent?: string;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const endpoint = params.subscription?.endpoint;
  const p256dh = params.subscription?.keys?.p256dh;
  const auth = params.subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return { status: 400, body: { error: 'Invalid subscription payload' } };
  }

  const supabaseAdmin = await getSupabaseAdmin();
  let userId: string | null = null;

  if (params.oldEndpoint) {
    const { data } = await supabaseAdmin
      .from('push_subscriptions')
      .select('userId')
      .eq('endpoint', params.oldEndpoint)
      .maybeSingle();
    userId = (data as { userId?: string } | null)?.userId || null;
  }

  if (!userId) {
    const { data } = await supabaseAdmin
      .from('push_subscriptions')
      .select('userId')
      .eq('endpoint', endpoint)
      .maybeSingle();
    userId = (data as { userId?: string } | null)?.userId || null;
  }

  if (!userId) {
    return { status: 404, body: { error: 'No existing subscription to refresh' } };
  }

  if (params.oldEndpoint && params.oldEndpoint !== endpoint) {
    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', params.oldEndpoint);
  }

  const row = {
    id: crypto.randomUUID(),
    userId,
    endpoint,
    p256dh,
    auth,
    userAgent: params.userAgent?.slice(0, 512) || null,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error) {
    return { status: 500, body: { error: error.message || 'Could not save subscription' } };
  }

  return { status: 200, body: { ok: true, userId } };
}
