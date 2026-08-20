import type { EventComment, ItemComment, UserProfile } from '../types';
import { isStaffRole } from './roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
  type StaffInteractionMode,
} from '../../shared/staffInteractionMode';

export {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
  type StaffInteractionMode,
  isStaffModePushEvent,
  isStaffModeNotificationKind,
  receivesStaffModeNotifications,
} from '../../shared/staffInteractionMode';

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

/** Whether a new comment or message should be stored without a staff badge. */
export function commentPostedAsNeighbor(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  return Boolean(profile && isStaffRole(profile.role) && !isStaffActingOfficial(profile));
}

/** Whether to show the staff role badge on persisted neighbor-facing content. */
export function shouldShowStaffBadgeOnComment(
  commenterRole: UserProfile['role'] | undefined,
  content?: Pick<ItemComment | EventComment, 'postedAsNeighbor'> | { postedAsNeighbor?: boolean } | null,
): boolean {
  return isStaffRole(commenterRole) && !content?.postedAsNeighbor;
}

/** Whether to show the staff role badge on a chat message (uses send-time mode, not current mode). */
export function shouldShowStaffBadgeOnMessage(
  senderRole: UserProfile['role'] | undefined,
  message?: { postedAsNeighbor?: boolean } | null,
): boolean {
  return isStaffRole(senderRole) && !message?.postedAsNeighbor;
}

/** Whether staff/director push and inbox alerts should deliver for this profile. */
export function receivesStaffNotifications(
  profile: Pick<UserProfile, 'role' | 'staffInteractionMode'> | null | undefined,
): boolean {
  return isStaffActingOfficial(profile);
}
