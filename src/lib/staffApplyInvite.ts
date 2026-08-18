import type { UserNotificationItem } from '../types';

export const STAFF_APPLY_INVITE_ID = 'seed_staff-apply-invite';
export const STAFF_APPLY_INVITE_URL = '/staff/apply';
export const STAFF_APPLY_INVITE_KIND = 'staff_apply';

export const STAFF_APPLY_INVITE: UserNotificationItem = {
  id: STAFF_APPLY_INVITE_ID,
  kind: STAFF_APPLY_INVITE_KIND,
  title: 'Want to help run the circle?',
  body: 'You can apply for staff — Moderator, Administrator, Manager, or Director. Read each role, then send one application.',
  at: '2026-08-18T11:05:00.000Z',
  url: STAFF_APPLY_INVITE_URL,
  actorName: 'Markeith White',
};

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
