import { isDirectorAccount } from './directorIdentity';
import { getSupabaseAdmin } from './supabaseAdmin';

async function fetchAllNeighborEmails(): Promise<string[]> {
  const admin = await getSupabaseAdmin();
  const pageSize = 1000;
  const emails: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from('users')
      .select('email')
      .order('email', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const email = String((row as { email?: string | null }).email || '').trim();
      if (email) emails.push(email.toLowerCase());
    }

    from += data.length;
  }

  return emails;
}

export async function runExportPlayTesters(
  callerId: string,
): Promise<{ status: number; body: Record<string, unknown> | string; csv?: boolean }> {
  const admin = await getSupabaseAdmin();
  const { data: caller } = await admin.from('users').select('role').eq('uid', callerId).maybeSingle();

  if (!isDirectorAccount(callerId, (caller as { role?: string } | null)?.role)) {
    return { status: 403, body: { error: 'Director access required' } };
  }

  const emails = await fetchAllNeighborEmails();
  if (emails.length === 0) {
    return { status: 404, body: { error: 'No neighbor emails found' } };
  }

  return {
    status: 200,
    csv: true,
    body: `${emails.join('\n')}\n`,
  };
}
