import { getSupabaseAdmin } from './supabaseAdmin';

const DEDUP_WINDOW_MS = 90_000;

/** Returns false if the same tag was dispatched recently (prevents client+webhook doubles). */
export async function claimPushDispatch(tag?: string): Promise<boolean> {
  if (!tag) return true;

  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

    await supabaseAdmin.from('push_dispatch_log').delete().lt('createdAt', cutoff);

    const { error } = await supabaseAdmin.from('push_dispatch_log').insert({
      id: crypto.randomUUID(),
      tag,
      createdAt: new Date().toISOString(),
    });

    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') return false;
      console.warn('[push] dedup insert failed, blocking send:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[push] dedup check failed, blocking send:', (err as Error).message);
    return false;
  }
}
