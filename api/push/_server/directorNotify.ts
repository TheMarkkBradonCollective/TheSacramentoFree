import type { PushSendBody } from './runPushSend';
import { isDirectorRole } from './directorIdentity';
import { runPushSend } from './runPushSend';
import { getSupabaseAdmin } from './supabaseAdmin';
import { getUserRole, roleLabelFor } from './staffRoles';

/** Join alerts should only fire for brand-new auth accounts — not sign-in backfills. */
const FRESH_SIGNUP_MAX_AGE_MS = 15 * 60 * 1000;

async function isFreshAuthSignup(uid: string): Promise<boolean> {
  try {
    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
    if (error || !data?.user?.created_at) return false;

    const createdMs = Date.parse(data.user.created_at);
    if (!Number.isFinite(createdMs)) return false;
    return Date.now() - createdMs <= FRESH_SIGNUP_MAX_AGE_MS;
  } catch {
    return false;
  }
}

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
  if (!uid || isDirectorRole((profile as { role?: string }).role)) {
    return { status: 200, body: { ok: true, skipped: 'not a join alert candidate' } };
  }

  if (!(await isFreshAuthSignup(uid))) {
    return { status: 200, body: { ok: true, skipped: 'not a fresh signup' } };
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
  if (!uid || isDirectorRole((profile as { role?: string }).role)) {
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

  // Look up actor's role so we can show "[City Moderator] Jane did X" in notifications.
  const actorRole = await getUserRole(actorUserId).catch(() => 'user');
  const actorRoleLabel = roleLabelFor(actorRole);
  const byLine = `${actorRoleLabel} ${actorName}`;

  // --- Director alert body ------------------------------------------------
  let directorTitle = 'Moderation action';
  let directorBody = `${byLine} took action on ${targetName}`;

  switch (action) {
    case 'suspend':
      directorTitle = 'Neighbor suspended';
      directorBody = `${byLine} suspended ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    case 'unsuspend':
      directorTitle = 'Suspension lifted';
      directorBody = `${byLine} unsuspended ${targetName}`;
      break;
    case 'ban':
      directorTitle = 'Neighbor banned';
      directorBody = `${byLine} banned ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    case 'unban':
      directorTitle = 'Ban lifted';
      directorBody = `${byLine} unbanned ${targetName}`;
      break;
    case 'delete_account':
      return { status: 200, body: { ok: true, skipped: 'departure alert handles account deletion' } };
    case 'edit_profile':
      directorTitle = 'Profile updated';
      directorBody = `${byLine} updated ${targetName}'s profile${detail ? ` — ${detail}` : ''}`;
      break;
    case 'set_role':
      directorTitle = 'Role changed';
      directorBody = detail || `${byLine} updated ${targetName}'s role`;
      break;
    case 'withdraw_listing':
      directorTitle = 'Listing withdrawn';
      directorBody = `${byLine} withdrew a listing by ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    case 'delete_listing':
      directorTitle = 'Listing deleted';
      directorBody = `${byLine} permanently deleted a listing by ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    case 'cancel_event':
      directorTitle = 'Event cancelled';
      directorBody = `${byLine} cancelled an event by ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    case 'delete_event':
      directorTitle = 'Event deleted';
      directorBody = `${byLine} permanently deleted an event by ${targetName}${detail ? ` — ${detail}` : ''}`;
      break;
    default:
      directorBody = `${byLine}: ${action} on ${targetName}${detail ? ` — ${detail}` : ''}`;
  }

  const auditId = audit.id || `${action}-${audit.targetUserId || 'unknown'}`;
  const directorResult = await runDirectorCategoryAlert(actorUserId, {
    category: 'moderation',
    title: directorTitle,
    body: directorBody.slice(0, 200),
    excludeUserIds: [actorUserId],
    tag: `director-mod-${auditId}`,
    data: audit.targetUserId ? { targetUserId: String(audit.targetUserId) } : undefined,
  });

  // --- User-facing notification: "[Role] [Name] [did action]" --------------
  const targetUserId = String(audit.targetUserId || '');

  type AccountMsg = { title: string; body: string };
  const accountMessages: Record<string, AccountMsg> = {
    suspend: {
      title: 'Your account has been suspended',
      body: `${byLine} suspended your account${detail ? ` — ${detail}` : ''}`,
    },
    unsuspend: {
      title: 'Your account suspension has been lifted',
      body: `${byLine} restored your account`,
    },
    ban: {
      title: 'Your account has been banned',
      body: `${byLine} banned your account from the community${detail ? ` — ${detail}` : ''}`,
    },
    unban: {
      title: 'Your account ban has been removed',
      body: `${byLine} removed your ban and re-enabled your account`,
    },
    edit_profile: {
      title: 'Your profile was updated by staff',
      body: `${byLine} made changes to your profile${detail ? ` — ${detail}` : ''}`,
    },
    set_role: {
      title: 'Your role has been updated',
      body: detail || `${byLine} changed your role`,
    },
    withdraw_listing: {
      title: 'Your listing was withdrawn by staff',
      body: `${byLine} withdrew your listing${detail ? ` — ${detail}` : ''}`,
    },
    delete_listing: {
      title: 'Your listing was removed by staff',
      body: `${byLine} permanently removed your listing${detail ? ` — ${detail}` : ''}`,
    },
    cancel_event: {
      title: 'Your event was cancelled by staff',
      body: `${byLine} cancelled your event${detail ? ` — ${detail}` : ''}`,
    },
    delete_event: {
      title: 'Your event was removed by staff',
      body: `${byLine} permanently removed your event${detail ? ` — ${detail}` : ''}`,
    },
  };

  const accountMessage = accountMessages[action];
  if (!targetUserId || !accountMessage) {
    return directorResult;
  }

  const accountResult = await runPushSend(actorUserId, {
    eventType: 'account_update',
    title: accountMessage.title,
    body: accountMessage.body.slice(0, 200),
    url: '/profile',
    recipientUserIds: [targetUserId],
    tag: `account-${targetUserId}-${action}-${auditId}`,
  });

  return {
    status: 200,
    body: {
      ok: true,
      director: directorResult.body,
      account: accountResult.body,
      sent: Number(directorResult.body.sent || 0) + Number(accountResult.body.sent || 0),
    },
  };
}
