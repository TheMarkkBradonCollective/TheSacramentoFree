import type { UserNotificationItem } from '../types';
import {
  STAFF_APPLY_INVITE_ACTOR,
  STAFF_APPLY_INVITE_AT,
  STAFF_APPLY_INVITE_BODY,
  STAFF_APPLY_INVITE_ID,
  STAFF_APPLY_INVITE_KIND,
  STAFF_APPLY_INVITE_TITLE,
  STAFF_APPLY_INVITE_URL,
} from '../../shared/staffApplyInvite';

export {
  STAFF_APPLY_INVITE_ID,
  STAFF_APPLY_INVITE_KIND,
  STAFF_APPLY_INVITE_URL,
} from '../../shared/staffApplyInvite';

export const STAFF_APPLY_INVITE: UserNotificationItem = {
  id: STAFF_APPLY_INVITE_ID,
  kind: STAFF_APPLY_INVITE_KIND,
  title: STAFF_APPLY_INVITE_TITLE,
  body: STAFF_APPLY_INVITE_BODY,
  at: STAFF_APPLY_INVITE_AT,
  url: STAFF_APPLY_INVITE_URL,
  actorName: STAFF_APPLY_INVITE_ACTOR,
};

export function isStaffApplyInviteItem(item: {
  url?: string | null;
  kind?: string | null;
}): boolean {
  return item.url === STAFF_APPLY_INVITE_URL || item.kind === STAFF_APPLY_INVITE_KIND;
}

function seenKey(userId: string): string {
  return `sbn_staff_apply_invite_seen_v1:${userId}`;
}

export function isStaffApplyInviteSeen(userId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(seenKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markStaffApplyInviteSeen(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(seenKey(userId), '1');
  } catch {
    // private mode
  }
}
