import type { EventComment, ItemComment, UserProfile } from '../types';
import { isStaffRole } from './roles';

/** How staff choose to participate in neighbor-facing surfaces. */
export type StaffInteractionMode = 'staff' | 'neighbor';

export const DEFAULT_STAFF_INTERACTION_MODE: StaffInteractionMode = 'staff';

export function normalizeStaffInteractionMode(value: unknown): StaffInteractionMode {
  return value === 'neighbor' ? 'neighbor' : 'staff';
}

/** True when a staff account is acting in official capacity (badge, support threads, restricted flows). */
export function isStaffActingOfficial(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  if (!profile || !isStaffRole(profile.role)) return false;
  return normalizeStaffInteractionMode(profile.staffInteractionMode) !== 'neighbor';
}

/** Staff console, sidebar, and moderation tools — only in staff mode. */
export function hasStaffConsoleAccess(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  return isStaffActingOfficial(profile);
}

/** Role used for chrome (badges, theme) — user mode presents as a neighbor. */
export function profileUiRole(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): UserProfile['role'] {
  if (!profile) return 'user';
  return isStaffActingOfficial(profile) ? profile.role : 'user';
}

/** Whether a new comment should be stored without a staff badge. */
export function commentPostedAsNeighbor(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  return Boolean(profile && isStaffRole(profile.role) && !isStaffActingOfficial(profile));
}

/** Whether to show the staff role badge on a comment for neighbors. */
export function shouldShowStaffBadgeOnComment(
  commenterRole: UserProfile['role'] | undefined,
  comment?: Pick<ItemComment | EventComment, 'postedAsNeighbor'> | null,
): boolean {
  return isStaffRole(commenterRole) && !comment?.postedAsNeighbor;
}
