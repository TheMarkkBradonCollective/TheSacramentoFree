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
export type StaffApplySeatCounts = Partial<Record<StaffApplyRole, number>>;
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
  lastDecision: StaffApplication | null;
  seatCounts: StaffApplySeatCounts;
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
      'TheSacramentoFree Director — full owner-level access, public welcome note, and app updates.',
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

export function staffApplySeatLabel(
  role: StaffApplyRole,
  seatCounts?: StaffApplySeatCounts,
): string {
  const limit = STAFF_ROLE_SLOTS[role];
  if (!limit) return '';
  const filled = seatCounts?.[role];
  if (filled !== undefined && filled >= limit) return 'Seat filled';
  if (limit === 1) return filled !== undefined ? `${filled}/1 seat` : '1 seat';
  if (filled !== undefined) return `${filled}/${limit} seats`;
  return limit === 1 ? '1 seat' : `${limit} seats`;
}

export function staffApplySeatPillClass(
  role: StaffApplyRole,
  seatCounts?: StaffApplySeatCounts,
): string {
  const filled = seatCounts?.[role];
  if (filled === undefined) {
    return 'bg-inset text-muted border-app';
  }
  if (isStaffApplySeatFilled(role, seatCounts)) {
    return 'bg-red-500/15 text-red-400 border-red-500/25';
  }
  return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
}

export function isStaffApplySeatFilled(
  role: StaffApplyRole,
  seatCounts?: StaffApplySeatCounts,
): boolean {
  const limit = STAFF_ROLE_SLOTS[role];
  if (limit === undefined) return false;
  return (seatCounts?.[role] ?? 0) >= limit;
}

export function firstOpenStaffApplyRole(
  seatCounts?: StaffApplySeatCounts,
): StaffApplyRole | null {
  return STAFF_APPLY_ROLES.find((role) => !isStaffApplySeatFilled(role, seatCounts)) ?? null;
}

export function parseStaffApplySeatCounts(value: unknown): StaffApplySeatCounts {
  if (!value || typeof value !== 'object') return {};
  const counts: StaffApplySeatCounts = {};
  for (const role of STAFF_APPLY_ROLES) {
    const raw = (value as Record<string, unknown>)[role];
    const parsed = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
    if (Number.isFinite(parsed) && parsed >= 0) counts[role] = parsed;
  }
  return counts;
}

export function staffApplicationDecisionNotice(
  app: Pick<StaffApplication, 'role' | 'status'>,
): { title: string; body: string } {
  const label = staffApplyRoleLabel(app.role);
  if (app.status === 'yes') {
    return {
      title: "You're on the staff team",
      body: `Welcome — you are now a ${label}. Staff tools are in the app.`,
    };
  }
  if (app.status === 'maybe') {
    return {
      title: 'Staff application update',
      body: `Your ${label} application came back as maybe. You can apply again for that role or any other from Account.`,
    };
  }
  return {
    title: 'Staff application update',
    body: `Your ${label} application was not approved. This account can't apply for staff roles.`,
  };
}

export function deriveApplicantStaffApplyState(applications: StaffApplication[]): ApplicantStaffApplyState {
  const blocked = applications.some((row) => row.status === 'no');
  const pending = applications
    .filter((row) => row.status === 'pending')
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0] ?? null;
  const lastDecision =
    applications
      .filter((row) => row.status === 'yes' || row.status === 'no' || row.status === 'maybe')
      .slice()
      .sort((a, b) => {
        const aAt = new Date(a.reviewedAt || a.updatedAt || a.createdAt).getTime();
        const bAt = new Date(b.reviewedAt || b.updatedAt || b.createdAt).getTime();
        return bAt - aAt;
      })[0] ?? null;
  return { blocked, pending, lastDecision, seatCounts: {} };
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
