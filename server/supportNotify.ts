import { isStaffRole, supabaseAdmin } from './auth';
import { runPushSend } from './pushSend';

export type SupportNotifyEvent = 'opened' | 'user_message' | 'staff_reply';

export async function runSupportNotify(
  callerId: string,
  ticketId: string,
  event: SupportNotifyEvent,
): Promise<{ status: number; body: Record<string, unknown> }> {
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

  const preview = String((latestMessages?.[0] as { text?: string } | undefined)?.text || '').trim();
  const messagePreview = preview || 'Open the app to read the message.';
  const subjectLine = subject.trim() || 'Help request';

  if (event === 'staff_reply') {
    return runPushSend(callerId, {
      eventType: 'support_reply',
      title: 'Support team replied',
      body: `${subjectLine}: ${messagePreview.slice(0, 140)}`,
      url: '/menu',
      recipientUserIds: [openerUserId],
      tag: `support-${ticketId}`,
      data: { ticketId },
    });
  }

  const staffTitle =
    event === 'opened' ? `Support ticket from ${openerName}` : `${openerName} replied on support`;
  const staffBody = `${subjectLine}: ${messagePreview.slice(0, 140)}`;

  const staffResult = await runPushSend(callerId, {
    eventType: 'staff_support',
    title: staffTitle,
    body: staffBody,
    url: '/staff/tickets',
    excludeUserIds: [openerUserId],
    minStaffRank,
    tag: `staff-ticket-${ticketId}`,
    data: { ticketId },
  });

  const directorTitle =
    event === 'opened' ? `New support ticket — ${openerName}` : `Support reply — ${openerName}`;
  const directorBody = `${subjectLine}: ${messagePreview.slice(0, 140)}`;

  const directorResult = await runPushSend(callerId, {
    eventType: 'director_alert',
    title: directorTitle,
    body: directorBody,
    url: '/director/overview',
    excludeUserIds: [openerUserId],
    tag: event === 'opened' ? `director-ticket-${ticketId}` : `director-ticket-reply-${ticketId}`,
    data: { directorCategory: 'ticket', ticketId },
  });

  return {
    status: 200,
    body: { ok: true, staff: staffResult.body, director: directorResult.body },
  };
}
