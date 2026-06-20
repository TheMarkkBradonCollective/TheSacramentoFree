import type { Message, UserProfile } from '../types';
import { isCommunityChat, isGlobalCommunityChat } from './communityChats';

export type UserRole = NonNullable<UserProfile['role']>;

/** Max seats per leadership/staff role across the whole community. */
export const STAFF_ROLE_SLOTS: Partial<Record<UserRole, number>> = {
  city_moderator: 5,
  city_administrator: 3,
  city_manager: 1,
  director: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Neighbor',
  city_moderator: 'City Moderator',
  city_administrator: 'City Administrator',
  city_manager: 'City Manager',
  director: 'Buy Nothing Director',
};

export function staffRoleSlotMessage(role: UserRole, limit: number): string {
  const label = ROLE_LABELS[role];
  if (limit === 1) {
    return `There can only be one ${label}. Demote the current ${label} first.`;
  }
  return `All ${limit} ${label} seats are filled. Demote someone first.`;
}

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

/** Buy Nothing Director — full platform oversight. */
export function isDirectorRole(role?: UserProfile['role']): boolean {
  return normalizeUserRole(role) === 'director';
}

/** Director site overview in Help & safety. */
export function canViewDirectorOverview(role?: UserProfile['role']): boolean {
  return isDirectorRole(role);
}

/** Post, edit, and delete app changelog updates. */
export function canManageAppUpdates(role?: UserProfile['role']): boolean {
  return isDirectorRole(role);
}

/** Post announcements in Help & support. */
export function canPostAnnouncements(role?: UserProfile['role']): boolean {
  return isStaffRole(role);
}

/** Edit or delete an announcement — author or director. */
export function canEditAnnouncement(
  actor: Pick<UserProfile, 'uid' | 'role'>,
  postedByUserId: string,
): boolean {
  return isDirectorRole(actor.role) || actor.uid === postedByUserId;
}

/** Publish or edit this staff member's own public welcome message (director uses director_message). */
export function canEditOwnStaffMessage(role?: UserProfile['role']): boolean {
  const r = normalizeUserRole(role);
  return isStaffRole(r) && r !== 'director';
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

/** Listing post chat is read-only once gifted or withdrawn (same as chat UI). */
export function isListingPostChatReadOnly(status?: string): boolean {
  return status === 'completed' || status === 'withdrawn';
}

/**
 * Participant may delete a 1:1 direct chat (not community channels).
 * Profile DMs: either neighbor. Post (listing) chats: both users, but the poster
 * only after the listing is archived read-only (gifted/withdrawn).
 */
export function canDeleteDirectChat(
  viewer: Pick<UserProfile, 'uid'>,
  chat: { id: string; participantIds: string[]; itemId?: string },
  listing?: { userId: string; status: string } | null,
): boolean {
  if (isCommunityChat(chat.id)) return false;
  if (!Array.isArray(chat.participantIds) || !chat.participantIds.includes(viewer.uid)) {
    return false;
  }

  const itemId = String(chat.itemId || '').trim();
  if (!itemId) return true;

  if (!listing || listing.userId !== viewer.uid) {
    return true;
  }

  return isListingPostChatReadOnly(listing.status);
}

/** Closed tickets may be deleted by the opener or staff with access. */
export function canDeleteSupportTicket(
  viewer: Pick<UserProfile, 'uid' | 'role'>,
  ticket: { openerUserId: string; minStaffRank: number; status: string },
): boolean {
  if (ticket.status !== 'closed') return false;
  return canViewerAccessTicket(viewer, ticket);
}

/** Unsend own chat messages everywhere; director + city manager may remove any in community chat. */
export function canDeleteChatMessage(
  viewer: Pick<UserProfile, 'uid' | 'role'>,
  message: Pick<Message, 'senderId'>,
  chatId: string,
): boolean {
  if (viewer.uid === message.senderId) return true;
  if (!isGlobalCommunityChat(chatId)) return false;
  return canStaffDeleteAccount(viewer.role);
}
