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

/** Director + City Manager can browse the full member list. */
export function canManageTeamMembers(role?: UserProfile['role']): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'director' || normalized === 'city_manager';
}

/** Whether this leader may edit the target neighbor's role. */
export function canAssignRolesToUser(
  actorRole?: UserProfile['role'],
  targetRole?: UserProfile['role'],
): boolean {
  const actor = normalizeUserRole(actorRole);
  const target = normalizeUserRole(targetRole);
  if (!canManageTeamMembers(actor)) return false;
  if (actor === 'city_manager' && target === 'director') return false;
  return true;
}

/** Role options shown in team management for the acting user. */
export function assignableRoleOptionsFor(actorRole?: UserProfile['role']) {
  const actor = normalizeUserRole(actorRole);
  if (actor === 'director') return ASSIGNABLE_ROLE_OPTIONS;
  if (actor === 'city_manager') {
    return ASSIGNABLE_ROLE_OPTIONS.filter((option) => option.value !== 'director');
  }
  return [];
}
