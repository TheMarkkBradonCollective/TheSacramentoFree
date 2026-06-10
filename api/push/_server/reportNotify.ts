import { getSupabaseAdmin } from './supabaseAdmin';
import { runPushSend } from './runPushSend';

export async function runReportNotify(
  callerId: string,
  reportId: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: report, error } = await supabaseAdmin
    .from('user_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error || !report) {
    return { status: 404, body: { error: 'Report not found' } };
  }

  const reporterUserId = String((report as { reporterUserId: string }).reporterUserId);
  if (callerId !== reporterUserId) {
    return { status: 403, body: { error: 'Only the reporter can trigger this notification' } };
  }

  const reporterName = String((report as { reporterName: string }).reporterName || 'A neighbor');
  const subject = String((report as { subject: string }).subject || 'Neighbor report');
  const body = String((report as { body: string }).body || '');
  const preview = body.slice(0, 100);

  const staffResult = await runPushSend(callerId, {
    eventType: 'staff_report',
    title: 'New neighbor report',
    body: `${reporterName}: ${subject} — ${preview}`,
    url: '/staff/reports',
    excludeUserIds: [reporterUserId],
    tag: `staff-report-${reportId}`,
    data: { reportId },
  });

  const directorResult = await runPushSend(callerId, {
    eventType: 'director_alert',
    title: 'Neighbor report',
    body: `${reporterName}: ${subject}`,
    url: '/director/overview',
    excludeUserIds: [reporterUserId],
    tag: `director-report-${reportId}`,
    data: { directorCategory: 'report', reportId },
  });

  return {
    status: 200,
    body: { ok: true, staff: staffResult.body, director: directorResult.body },
  };
}
