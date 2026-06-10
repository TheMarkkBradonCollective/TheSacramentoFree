import type { PushSendBody } from './runPushSend';
import { isDirectorUser } from './directorIdentity';
import { runPushSend } from './runPushSend';

export type DirectorAlertCategory =
  | 'join'
  | 'leave'
  | 'moderation'
  | 'report'
  | 'ticket'
  | 'listing'
  | 'message_request'
  | 'claim_request';

export async function runDirectorCategoryAlert(
  callerId: string,
  params: {
    category: DirectorAlertCategory;
    title: string;
    body: string;
    tag?: string;
    excludeUserIds?: string[];
    data?: Record<string, string>;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload: PushSendBody = {
    eventType: 'director_alert',
    title: params.title,
    body: params.body.slice(0, 200),
    url: '/director/overview',
    excludeUserIds: params.excludeUserIds,
    tag: params.tag || `director-${params.category}`,
    data: {
      directorCategory: params.category,
      ...(params.data || {}),
    },
  };

  return runPushSend(callerId, payload);
}

export async function runDirectorJoinNotify(
  callerId: string,
  profile: { uid: string; displayName?: string; neighborhood?: string; email?: string | null },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uid = String(profile.uid || '');
  if (!uid || isDirectorUser(uid, profile.email)) {
    return { status: 200, body: { ok: true, skipped: 'not a join alert candidate' } };
  }

  const displayName = String(profile.displayName || 'A neighbor').trim() || 'A neighbor';
  const neighborhood = String(profile.neighborhood || 'Sacramento area').trim() || 'Sacramento area';

  return runDirectorCategoryAlert(uid, {
    category: 'join',
    title: `New neighbor — ${displayName}`,
    body: `${neighborhood} · joined Sacramento Buy Nothing`,
    excludeUserIds: [uid],
    tag: `director-join-${uid}`,
  });
}

export async function runDirectorLeaveNotify(
  callerId: string,
  profile: {
    uid: string;
    displayName?: string;
    neighborhood?: string;
    email?: string | null;
    detail?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const uid = String(profile.uid || '');
  if (!uid || isDirectorUser(uid, profile.email)) {
    return { status: 200, body: { ok: true, skipped: 'not a departure alert candidate' } };
  }

  const displayName = String(profile.displayName || 'A neighbor').trim() || 'A neighbor';
  const neighborhood = String(profile.neighborhood || 'Sacramento area').trim() || 'Sacramento area';
  const detail = String(profile.detail || 'account deleted').trim() || 'account deleted';

  return runDirectorCategoryAlert(uid, {
    category: 'leave',
    title: `Neighbor left — ${displayName}`,
    body: `${neighborhood} · ${detail}`,
    excludeUserIds: [uid],
    tag: `director-leave-${uid}`,
  });
}

export async function runDirectorListingNotify(
  callerId: string,
  item: {
    id: string;
    userId: string;
    userDisplayName?: string;
    title?: string;
    neighborhood?: string;
    type?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const userId = String(item.userId || callerId);
  if (!item.id) {
    return { status: 200, body: { ok: true, skipped: 'not a listing alert candidate' } };
  }

  const isRequest = item.type === 'looking';
  const displayName = String(item.userDisplayName || 'A neighbor');
  const title = String(item.title || 'New post');
  const neighborhood = String(item.neighborhood || 'Sacramento area');

  return runDirectorCategoryAlert(userId, {
    category: 'listing',
    title: isRequest ? 'New neighbor request' : 'New listing posted',
    body: `${displayName}: ${title} (${neighborhood})`,
    excludeUserIds: [userId],
    tag: `director-listing-${item.id}`,
    data: { listingId: item.id },
  });
}

export async function runDirectorMessageRequestNotify(
  callerId: string,
  request: {
    id: string;
    fromUserId: string;
    fromUserName?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const fromUserId = String(request.fromUserId || callerId);
  if (!request.id) {
    return { status: 200, body: { ok: true, skipped: 'not a message request alert candidate' } };
  }

  const fromUserName = String(request.fromUserName || 'A neighbor');

  return runDirectorCategoryAlert(fromUserId, {
    category: 'message_request',
    title: 'Message request',
    body: `${fromUserName} asked to start a chat`,
    excludeUserIds: [fromUserId],
    tag: `director-dmreq-${request.id}`,
    data: { requestId: request.id },
  });
}

export async function runDirectorClaimRequestNotify(
  callerId: string,
  claim: {
    id: string;
    itemId: string;
    claimerUserId: string;
    claimerName?: string;
    giverUserId?: string;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const claimerUserId = String(claim.claimerUserId || callerId);
  if (!claim.id || !claim.itemId) {
    return { status: 200, body: { ok: true, skipped: 'not a claim request alert candidate' } };
  }

  const { getSupabaseAdmin } = await import('./supabaseAdmin');
  const supabaseAdmin = await getSupabaseAdmin();
  const { data: item } = await supabaseAdmin
    .from('items')
    .select('title, userId')
    .eq('id', claim.itemId)
    .maybeSingle();

  const itemTitle = String((item as { title?: string } | null)?.title || 'a listing');
  const claimerName = String(claim.claimerName || 'A neighbor');

  return runDirectorCategoryAlert(claimerUserId, {
    category: 'claim_request',
    title: 'Claim request',
    body: `${claimerName} requested pickup: ${itemTitle}`,
    excludeUserIds: [String((item as { userId?: string } | null)?.userId || claim.giverUserId || '')],
    tag: `director-claim-${claim.id}`,
    data: { requestId: claim.id, listingId: claim.itemId },
  });
}

export async function runDirectorModerationNotify(
  callerId: string,
  audit: {
    id?: string;
    actorUserId: string;
    actorName?: string;
    targetUserId?: string;
    targetName?: string;
    action?: string;
    detail?: string | null;
  },
): Promise<{ status: number; body: Record<string, unknown> }> {
  const actorUserId = String(audit.actorUserId || callerId);
  const actorName = String(audit.actorName || 'Staff');
  const targetName = String(audit.targetName || 'a neighbor');
  const action = String(audit.action || 'moderation');
  const detail = audit.detail ? String(audit.detail) : '';

  let title = 'Moderation action';
  let body = `${actorName} took action on ${targetName}`;

  switch (action) {
    case 'suspend':
      title = 'Neighbor suspended';
      body = `${actorName} suspended ${targetName}`;
      break;
    case 'unsuspend':
      title = 'Suspension lifted';
      body = `${actorName} unsuspended ${targetName}`;
      break;
    case 'ban':
      title = 'Neighbor banned';
      body = `${actorName} banned ${targetName}`;
      break;
    case 'unban':
      title = 'Ban lifted';
      body = `${actorName} unbanned ${targetName}`;
      break;
    case 'delete_account':
      title = 'Account deleted by staff';
      body = `${actorName} removed ${targetName}'s account`;
      break;
    case 'edit_profile':
      title = 'Profile updated by staff';
      body = `${actorName} updated ${targetName}'s profile`;
      break;
    default:
      body = `${actorName}: ${action} on ${targetName}`;
  }

  if (detail) body = `${body} — ${detail}`.slice(0, 200);

  return runDirectorCategoryAlert(actorUserId, {
    category: 'moderation',
    title,
    body,
    excludeUserIds: [actorUserId],
    tag: `director-mod-${audit.id || `${action}-${audit.targetUserId || 'unknown'}`}`,
    data: audit.targetUserId ? { targetUserId: String(audit.targetUserId) } : undefined,
  });
}
