import { getSupabaseAdmin } from './supabaseAdmin';

/** Skip vote push alerts when a voter is clearly mass-voting (backup to client cooldown). */
const VOTE_NOTIFY_BURST_WINDOW_MS = 3 * 60 * 1000;
const VOTE_NOTIFY_BURST_MAX = 10;

export async function shouldThrottleVoteNotify(voterUserId: string): Promise<boolean> {
  const supabaseAdmin = await getSupabaseAdmin();
  const cutoff = new Date(Date.now() - VOTE_NOTIFY_BURST_WINDOW_MS).toISOString();

  const { count, error } = await supabaseAdmin
    .from('item_votes')
    .select('itemId', { count: 'exact', head: true })
    .eq('userId', voterUserId)
    .gte('createdAt', cutoff);

  if (error) {
    console.warn('vote notify cooldown check failed:', error.message);
    return false;
  }

  return (count ?? 0) > VOTE_NOTIFY_BURST_MAX;
}
