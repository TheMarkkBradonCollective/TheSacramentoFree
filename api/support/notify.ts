import type { VercelRequest, VercelResponse } from '@vercel/node';

type NotifyBody = {
  ticketId?: string;
  event?: 'opened' | 'user_message' | 'staff_reply';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { getBearerToken, getUserFromBearer, getSupabaseAdmin, getServiceRoleKey, parseJsonBody, runPushSend, isStaffRole } =
      await import('../../push-server.bundle.cjs');

    if (!getServiceRoleKey()) {
      return res.status(503).json({
        error:
          'Push delivery requires SUPABASE_SERVICE_ROLE_KEY on the server. Add it in Vercel environment variables and redeploy.',
        sent: 0,
      });
    }

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await getUserFromBearer(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = parseJsonBody<NotifyBody>(req);
    const ticketId = body.ticketId?.trim();
    const event = body.event;
    if (!ticketId || !event) {
      return res.status(400).json({ error: 'ticketId and event are required' });
    }

    const supabaseAdmin = await getSupabaseAdmin();
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const openerUserId = String((ticket as { openerUserId: string }).openerUserId);
    const openerName = String((ticket as { openerName: string }).openerName || 'A neighbor');
    const subject = String((ticket as { subject: string }).subject || 'Support ticket');
    const minStaffRank = Number((ticket as { minStaffRank?: number }).minStaffRank ?? 1);

    const { data: callerRow } = await supabaseAdmin.from('users').select('role').eq('uid', user.id).maybeSingle();
    const callerIsStaff = isStaffRole((callerRow as { role?: string } | null)?.role);

    if (event === 'staff_reply') {
      if (!callerIsStaff) {
        return res.status(403).json({ error: 'Staff access required' });
      }
    } else if (user.id !== openerUserId) {
      return res.status(403).json({ error: 'Only the ticket opener can trigger this notification' });
    }

    const { data: latestMessages } = await supabaseAdmin
      .from('support_ticket_messages')
      .select('text')
      .eq('ticketId', ticketId)
      .order('createdAt', { ascending: false })
      .limit(1);

    const preview = String((latestMessages?.[0] as { text?: string } | undefined)?.text || 'New activity');

    if (event === 'staff_reply') {
      const result = await runPushSend(user.id, {
        eventType: 'support_reply',
        title: 'Support reply',
        body: `${subject}: ${preview.slice(0, 120)}`,
        url: '/menu',
        recipientUserIds: [openerUserId],
        tag: `support-${ticketId}`,
        data: { ticketId },
      });
      return res.status(result.status).json(result.body);
    }

    const staffResult = await runPushSend(user.id, {
      eventType: 'staff_support',
      title: 'New support ticket activity',
      body: `${openerName}: ${subject} — ${preview.slice(0, 100)}`,
      url: '/staff/tickets',
      excludeUserIds: [openerUserId],
      minStaffRank,
      tag: `staff-ticket-${ticketId}`,
      data: { ticketId },
    });

    const directorResult = await runPushSend(user.id, {
      eventType: 'director_alert',
      title: event === 'opened' ? 'Support ticket opened' : 'Support ticket reply',
      body: `${openerName}: ${subject}`,
      url: '/director/overview',
      excludeUserIds: [openerUserId],
      tag: event === 'opened' ? `director-ticket-${ticketId}` : `director-ticket-reply-${ticketId}`,
      data: { directorCategory: 'ticket', ticketId },
    });

    return res.status(200).json({
      ok: true,
      staff: staffResult.body,
      director: directorResult.body,
    });
  } catch (err) {
    console.error('[api/support/notify]', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Support push notification failed.',
    });
  }
}
