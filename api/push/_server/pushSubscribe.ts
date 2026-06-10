import { getSupabaseAdmin } from './supabaseAdmin';

export async function claimPushSubscriptionForUser(
  userId: string,
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !subscription.endpoint || !subscription.p256dh || !subscription.auth) {
    return { ok: false, error: 'Invalid subscription payload' };
  }

  const supabaseAdmin = await getSupabaseAdmin();

  // Reassign this browser endpoint to the signed-in user (fixes shared-device mix-ups).
  await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);

  const row = {
    id: crypto.randomUUID(),
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth: subscription.auth,
    userAgent: subscription.userAgent?.slice(0, 512) || null,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
  if (error) {
    return { ok: false, error: error.message || 'Could not save subscription' };
  }

  return { ok: true };
}
