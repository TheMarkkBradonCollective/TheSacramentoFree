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

const DEFAULT_NOTIFICATION_PREFS = {
  enabled: true,
  messages: true,
  messageRequests: true,
  support: true,
  claims: true,
  gifts: true,
  comments: true,
  listingUpvotes: true,
  listingDownvotes: true,
  listingStatus: true,
  nearbyListings: true,
  requests: true,
  announcements: true,
  pickupReminders: true,
  newListings: true,
  savedItems: true,
  accountUpdates: true,
  staffSupport: true,
  staffReports: true,
  directorAlerts: true,
  directorJoins: true,
  directorLeaves: true,
  directorModeration: true,
  directorReports: true,
  directorTickets: true,
  directorListings: true,
  directorMessageRequests: true,
  directorClaimRequests: true,
  nearbyRadiusMiles: 10,
  followedCategories: [] as string[],
};

/** Turn master switch on when a device subscribes; seed defaults for new accounts only. */
export async function ensureNotificationPreferencesOnSubscribe(userId: string): Promise<void> {
  if (!userId) return;

  const supabaseAdmin = await getSupabaseAdmin();
  const { data: existing } = await supabaseAdmin
    .from('notification_preferences')
    .select('userId')
    .eq('userId', userId)
    .maybeSingle();

  const updatedAt = new Date().toISOString();

  if (existing) {
    await supabaseAdmin
      .from('notification_preferences')
      .update({ enabled: true, updatedAt })
      .eq('userId', userId);
    return;
  }

  await supabaseAdmin.from('notification_preferences').insert({
    userId,
    ...DEFAULT_NOTIFICATION_PREFS,
    updatedAt,
  });
}
