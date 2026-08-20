import { getSupabaseAdmin } from './supabaseAdmin';
import { isVoteNotifyBurst, VOTE_NOTIFY_BURST_WINDOW_MS } from '../../../shared/voteNotifyCooldown';

/** Skip vote push alerts when a voter is clearly mass-voting (backup to client cooldown). */
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

  return isVoteNotifyBurst(count);
}

/** Skip feed vote push alerts when a voter is clearly mass-voting. */
export async function shouldThrottleFeedVoteNotify(voterUserId: string): Promise<boolean> {
  const supabaseAdmin = await getSupabaseAdmin();
  const cutoff = new Date(Date.now() - VOTE_NOTIFY_BURST_WINDOW_MS).toISOString();

  const { count, error } = await supabaseAdmin
    .from('community_content_votes')
    .select('targetId', { count: 'exact', head: true })
    .eq('targetType', 'feed_post')
    .eq('userId', voterUserId)
    .gte('createdAt', cutoff);

  if (error) {
    console.warn('feed vote notify cooldown check failed:', error.message);
    return false;
  }

  return isVoteNotifyBurst(count);
}
