import type { UserProfile } from '../types';

export type UserRole = NonNullable<UserProfile['role']>;

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Neighbor',
  city_moderator: 'City Moderator',
  city_administrator: 'City Administrator',
  city_manager: 'City Manager',
  director: 'Buy Nothing Director',
};

/** Director panel: assign roles from neighbor → staff → leadership. */
export const ASSIGNABLE_ROLE_OPTIONS: {
  value: UserRole;
  label: string;
  description: string;
}[] = [
  { value: 'user', label: ROLE_LABELS.user, description: 'Standard community member' },
  {
    value: 'city_moderator',
    label: ROLE_LABELS.city_moderator,
    description: 'Staff — helps moderate the city circle',
  },
  {
    value: 'city_administrator',
    label: ROLE_LABELS.city_administrator,
    description: 'City Administrator — elevated community management',
  },
  {
    value: 'city_manager',
    label: ROLE_LABELS.city_manager,
    description: 'City Manager — trusted leadership',
  },
  {
    value: 'director',
    label: ROLE_LABELS.director,
    description: 'Buy Nothing Director — full owner-level access',
  },
];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  moderator: 'city_administrator',
  admin: 'city_manager',
};

/** Map stored role values (including legacy slugs) to the current set. */
export function normalizeUserRole(role: unknown): UserRole {
  if (typeof role !== 'string' || !role.trim()) return 'user';
  const key = role.trim();
  if (key in ROLE_LABELS) return key as UserRole;
  return LEGACY_ROLE_MAP[key] ?? 'user';
}

export function roleLabel(role?: UserProfile['role']): string {
  if (!role || role === 'user') return ROLE_LABELS.user;
  const normalized = normalizeUserRole(role);
  return ROLE_LABELS[normalized] ?? ROLE_LABELS.user;
}

export function isStaffRole(role?: UserProfile['role']): boolean {
  const normalized = normalizeUserRole(role);
  return (
    normalized === 'city_moderator' ||
    normalized === 'city_administrator' ||
    normalized === 'city_manager' ||
    normalized === 'director'
  );
}

/** Staff neighbor directory (all staff roles). */
export function canAccessStaffDirectory(role?: UserProfile['role']): boolean {
  return isStaffRole(role);
}

/** Director + City Manager audit log. */
export function canViewAuditLog(role?: UserProfile['role']): boolean {
  const r = normalizeUserRole(role);
  return r === 'director' || r === 'city_manager';
}

/** Suspend / unsuspend (mods and above). */
export function canStaffSuspend(role?: UserProfile['role']): boolean {
  return isStaffRole(role);
}

/** Platform ban / unban (admins and above — not city moderator). */
export function canStaffBan(role?: UserProfile['role']): boolean {
  const r = normalizeUserRole(role);
  return r === 'city_administrator' || r === 'city_manager' || r === 'director';
}

/** Edit neighbor profile fields (manager + director). */
export function canStaffEditUser(role?: UserProfile['role']): boolean {
  const r = normalizeUserRole(role);
  return r === 'city_manager' || r === 'director';
}

/** Permanently delete a neighbor account (manager + director). */
export function canStaffDeleteAccount(role?: UserProfile['role']): boolean {
  const r = normalizeUserRole(role);
  return r === 'city_manager' || r === 'director';
}

/** Numeric rank for ticket visibility (higher = more authority). */
export const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  city_moderator: 1,
  city_administrator: 2,
  city_manager: 3,
  director: 4,
};

export function roleRank(role?: UserProfile['role']): number {
  return ROLE_RANK[normalizeUserRole(role)] ?? 0;
}

/** Minimum staff rank required to view/handle a ticket opened by someone at openerRole. */
export function minStaffRankForTicket(openerRole?: UserProfile['role']): number {
  const rank = roleRank(openerRole);
  if (rank === 0) return ROLE_RANK.city_moderator;
  return Math.min(rank + 1, ROLE_RANK.director);
}

export function canViewerAccessTicket(
  viewer: Pick<UserProfile, 'uid' | 'role'>,
  ticket: { openerUserId: string; minStaffRank: number },
): boolean {
  if (viewer.uid === ticket.openerUserId) return true;
  if (!isStaffRole(viewer.role)) return false;
  return roleRank(viewer.role) >= ticket.minStaffRank;
}

export function canViewStaffReports(role?: UserProfile['role']): boolean {
  return isStaffRole(role);
}

export function canViewStaffTicketInbox(role?: UserProfile['role']): boolean {
  return isStaffRole(role);
}
