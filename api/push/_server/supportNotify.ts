import { getSupabaseAdmin } from './supabaseAdmin';
import { runPushSend } from './runPushSend';
import { isStaffRole } from './staffRoles';

export type SupportNotifyEvent = 'opened' | 'user_message' | 'staff_reply';

export async function runSupportNotify(
  callerId: string,
  ticketId: string,
  event: SupportNotifyEvent,
  messageId?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return { status: 404, body: { error: 'Support ticket not found' } };
  }

  const openerUserId = String((ticket as { openerUserId: string }).openerUserId);
  const openerName = String((ticket as { openerName: string }).openerName || 'A neighbor');
  const subject = String((ticket as { subject: string }).subject || 'Support ticket');
  const minStaffRank = Number((ticket as { minStaffRank?: number }).minStaffRank ?? 1);

  const { data: callerRow } = await supabaseAdmin.from('users').select('role').eq('uid', callerId).maybeSingle();
  const callerIsStaff = isStaffRole((callerRow as { role?: string } | null)?.role);

  if (event === 'staff_reply') {
    if (!callerIsStaff) {
      return { status: 403, body: { error: 'Staff access required' } };
    }
  } else if (callerId !== openerUserId) {
    return { status: 403, body: { error: 'Only the ticket opener can trigger this notification' } };
  }

  const { data: latestMessages } = await supabaseAdmin
    .from('support_ticket_messages')
    .select('text')
    .eq('ticketId', ticketId)
    .order('createdAt', { ascending: false })
    .limit(1);

  const preview = String((latestMessages?.[0] as { text?: string } | undefined)?.text || 'New activity');
  const dedupeKey = messageId || `${ticketId}-${Date.now()}`;

  if (event === 'staff_reply') {
    return runPushSend(callerId, {
      eventType: 'support_reply',
      title: 'Support reply',
      body: `${subject}: ${preview.slice(0, 120)}`,
      url: `/support/${ticketId}`,
      recipientUserIds: [openerUserId],
      tag: `support-${dedupeKey}`,
      data: { ticketId },
    });
  }

  const staffResult = await runPushSend(callerId, {
    eventType: 'staff_support',
    title: 'New support ticket activity',
    body: `${openerName}: ${subject} — ${preview.slice(0, 100)}`,
    url: '/staff/tickets',
    excludeUserIds: [openerUserId],
    minStaffRank,
    tag: `staff-ticket-${dedupeKey}`,
    data: { ticketId },
  });

  const directorResult = await runPushSend(callerId, {
    eventType: 'director_alert',
    title: event === 'opened' ? 'Support ticket opened' : 'Support ticket reply',
    body: `${openerName}: ${subject}`,
    url: '/director/overview',
    excludeUserIds: [openerUserId],
    tag: event === 'opened' ? `director-ticket-${dedupeKey}` : `director-ticket-reply-${dedupeKey}`,
    data: { directorCategory: 'ticket', ticketId },
  });

  return {
    status: 200,
    body: { ok: true, staff: staffResult.body, director: directorResult.body },
  };
}
