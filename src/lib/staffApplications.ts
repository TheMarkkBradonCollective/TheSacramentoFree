import {
  ROLE_LABELS,
  STAFF_ROLE_SLOTS,
  isStaffRole,
  normalizeUserRole,
  roleRank,
  type UserRole,
} from './roles';

export const STAFF_APPLY_ROLES = [
  'city_moderator',
  'city_administrator',
  'city_manager',
  'director',
] as const;

export type StaffApplyRole = (typeof STAFF_APPLY_ROLES)[number];
export type StaffApplicationStatus = 'pending' | 'yes' | 'no' | 'maybe';
export type StaffApplicationDecision = 'yes' | 'no' | 'maybe';

export interface StaffApplication {
  id: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail: string;
  neighborhood: string;
  role: StaffApplyRole;
  statement: string;
  responseTime: string;
  otherGroups: string;
  otherInfo: string;
  status: StaffApplicationStatus;
  reviewedByUserId?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicantStaffApplyState {
  blocked: boolean;
  pending: StaffApplication | null;
}

export type ApplicantApplyView =
  | { kind: 'staff' }
  | { kind: 'blocked' }
  | { kind: 'pending'; application: StaffApplication }
  | { kind: 'open' };

export const RESPONSE_TIME_OPTIONS = [
  'Within a few hours',
  'Same day',
  'A few times a week',
  'Weekends or evenings',
] as const;

export const STAFF_ROLE_APPLY_COPY: Record<
  StaffApplyRole,
  { summary: string; duties: string[] }
> = {
  city_moderator: {
    summary:
      'Front-line neighbor help. Moderators keep listings, chats, and pickups respectful so the circle stays safe.',
    duties: [
      'Review reports and step in when a post or chat goes off the rails.',
      'Suspend when needed, and help stalled Go Get handoffs get unstuck.',
      'Answer neighbors with a calm, local voice — not cop energy.',
    ],
  },
  city_administrator: {
    summary:
      'Elevated community management. Administrators handle harder calls and keep the city circle running.',
    duties: [
      'Ban when a neighbor has to leave, and manage listings or events that need a firmer hand.',
      'Back up moderators and review the trickier reports.',
      'Help set the tone so staff stay consistent with each other.',
    ],
  },
  city_manager: {
    summary:
      'Trusted leadership. The City Manager sees the audit trail and can edit or remove accounts when it is truly needed.',
    duties: [
      'Watch the audit log and step in on account-level decisions.',
      'Support administrators and keep staff process honest.',
      'There is one City Manager seat.',
    ],
  },
  director: {
    summary:
      'Sacramento Buy Nothing Director — full owner-level access, public welcome note, and app updates.',
    duties: [
      'Set the public voice of the project and ship neighbor-facing updates.',
      'Assign staff roles and hold the last call on hard decisions.',
      'There is one Director seat.',
    ],
  },
};

export function isStaffApplyRole(value: string): value is StaffApplyRole {
  return (STAFF_APPLY_ROLES as readonly string[]).includes(value);
}

export function staffApplyRoleLabel(role: StaffApplyRole): string {
  return ROLE_LABELS[role];
}

export function staffApplySeatLabel(role: StaffApplyRole): string {
  const limit = STAFF_ROLE_SLOTS[role];
  if (!limit) return '';
  return limit === 1 ? '1 seat' : `${limit} seats`;
}

export function applicantApplyView(params: {
  role?: UserRole | string | null;
  blocked: boolean;
  pending: StaffApplication | null;
}): ApplicantApplyView {
  if (isStaffRole(normalizeUserRole(params.role))) return { kind: 'staff' };
  if (params.blocked) return { kind: 'blocked' };
  if (params.pending && params.pending.status === 'pending') {
    return { kind: 'pending', application: params.pending };
  }
  return { kind: 'open' };
}

/** Oldest pending application is the only one staff should see right now. */
export function nextPendingApplication<T extends { status: string; createdAt: string }>(
  applications: T[],
): { current: T | null; waiting: number } {
  const pending = applications
    .filter((row) => row.status === 'pending')
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const current = pending[0] ?? null;
  return { current, waiting: Math.max(0, pending.length - (current ? 1 : 0)) };
}

/**
 * City Administrator+ can review. Yes (assign the role) needs a strictly higher
 * rank than the seat, except the Director who can approve any seat.
 */
export function canReviewStaffApplications(role?: UserRole | string | null): boolean {
  return roleRank(normalizeUserRole(role)) >= roleRank('city_administrator');
}

export function canApproveAppliedRole(
  actorRole: UserRole | string | null | undefined,
  appliedRole: StaffApplyRole,
): boolean {
  const normalized = normalizeUserRole(actorRole);
  if (!canReviewStaffApplications(normalized)) return false;
  if (normalized === 'director') return true;
  return roleRank(normalized) > roleRank(appliedRole);
}
