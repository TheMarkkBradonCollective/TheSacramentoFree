import { getSupabaseAdmin } from './supabaseAdmin';
import { runReportNotify } from './reportNotify';
import { runSupportNotify, type SupportNotifyEvent } from './supportNotify';
import { isStaffRole } from './staffRoles';

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
};

export async function runSupabasePushWebhook(
  body: WebhookPayload,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const table = body.table;
  const type = body.type;
  const record = body.record;

  if (type !== 'INSERT' || !table || !record) {
    return { status: 200, body: { ok: true, skipped: 'not an insert' } };
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
