/** How staff choose to participate in neighbor-facing surfaces. */
export type StaffInteractionMode = 'staff' | 'neighbor';

export const DEFAULT_STAFF_INTERACTION_MODE: StaffInteractionMode = 'staff';

export function normalizeStaffInteractionMode(value: unknown): StaffInteractionMode {
  return value === 'neighbor' ? 'neighbor' : 'staff';
}

/** Push events that only deliver while the account is in staff mode (not user/neighbor mode). */
export const STAFF_MODE_PUSH_EVENT_TYPES = new Set([
  'staff_chat',
  'staff_support',
  'staff_report',
  'director_alert',
]);

export function isStaffModePushEvent(eventType: string): boolean {
  return STAFF_MODE_PUSH_EVENT_TYPES.has(eventType);
}

/** Inbox kinds that belong to staff/director moderation — hidden in user mode. */
export const STAFF_MODE_NOTIFICATION_KINDS = new Set([
  'staff_chat',
  'staff_support',
  'staff_report',
  'director_alert',
]);

export function isStaffModeNotificationKind(kind: string): boolean {
  return STAFF_MODE_NOTIFICATION_KINDS.has(kind);
}

/** Whether staff/director alerts should deliver for this saved interaction mode. */
export function receivesStaffModeNotifications(staffInteractionMode: unknown): boolean {
  return normalizeStaffInteractionMode(staffInteractionMode) !== 'neighbor';
}
