import { getSupabaseAdmin } from './supabaseAdmin';

const DEDUP_WINDOW_MS = 90_000;

/** Returns false if the same tag was dispatched recently (prevents client+webhook doubles). */
export async function claimPushDispatch(tag?: string): Promise<boolean> {
  if (!tag) return true;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

    await supabaseAdmin.from('push_dispatch_log').delete().lt('createdAt', cutoff);

    const { data: existing } = await supabaseAdmin
      .from('push_dispatch_log')
      .select('id')
      .eq('tag', tag)
      .gte('createdAt', cutoff)
      .maybeSingle();

    if (existing) return false;

    await supabaseAdmin.from('push_dispatch_log').insert({
      id: crypto.randomUUID(),
      tag,
      createdAt: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    console.warn('[push] dedup check failed, allowing send:', (err as Error).message);
    return true;
  }
}
