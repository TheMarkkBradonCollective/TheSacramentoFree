import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchAllNeighborEmails(admin: SupabaseClient): Promise<string[]> {
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

/** Play Console format: one email per line, no header, UTF-8 without BOM. */
export function playTestersCsvBody(emails: string[]): string {
  return `${emails.join('\n')}\n`;
}
