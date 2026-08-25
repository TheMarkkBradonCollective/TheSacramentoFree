import { supabase } from '../supabase';
import type { GoGetSession, ItemPost } from '../types';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './pushConfig';
import { pushUrlForGoGetSession } from './pushDeepLink';
import { sendPushNotification } from './pushNotifications';

const APPROACHING_ETA_SECONDS = 5 * 60;

async function claimEmissionFlag(
  sessionId: string,
  column: 'onTheWayNotifiedAt' | 'approachingNotifiedAt',
): Promise<boolean> {
  const { data, error } = await supabase
    .from('go_get_sessions')
    .update({ [column]: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', sessionId)
    .is(column, null)
    .select('id')
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
}

/**
 * Navigation engine → business rule → push.
 * Called from live location updates — never push on raw GPS alone without threshold checks.
 */
export async function maybeEmitGoGetNavigationPushes(params: {
  session: GoGetSession;
  item: ItemPost;
  etaSeconds?: number | null;
  distanceMeters?: number | null;
}): Promise<void> {
  if (!CLIENT_PUSH_DISPATCH_ENABLED) return;
  if (params.session.status !== 'active') return;

  const { session, item, etaSeconds } = params;
  const url = pushUrlForGoGetSession(session.id);
  const baseData = {
    goGetSessionId: session.id,
    sessionId: session.id,
    listingId: item.id,
  };

  if (!session.onTheWayNotifiedAt) {
    const claimed = await claimEmissionFlag(session.id, 'onTheWayNotifiedAt');
    if (claimed) {
      await sendPushNotification({
        eventType: 'on_the_way',
        title: "They're on the way",
        body: `${session.requesterName} is heading to pick up "${item.title}"`,
        url,
        listingId: item.id,
        recipientUserIds: [session.fulfillerUserId],
        tag: `on-the-way-${session.id}`,
        data: baseData,
      });
    }
  }

  if (
    etaSeconds != null &&
    etaSeconds > 0 &&
    etaSeconds <= APPROACHING_ETA_SECONDS &&
    !session.approachingNotifiedAt
  ) {
    const claimed = await claimEmissionFlag(session.id, 'approachingNotifiedAt');
    if (claimed) {
      const minutes = Math.max(1, Math.round(etaSeconds / 60));
      await sendPushNotification({
        eventType: 'go_get_approaching',
        title: 'Pickup approaching',
        body: `${session.requesterName} is about ${minutes} min away for "${item.title}"`,
        url,
        listingId: item.id,
        recipientUserIds: [session.fulfillerUserId],
        tag: `go-get-approaching-${session.id}`,
        data: baseData,
      });
    }
  }
}
