import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Shield, ShieldOff, Users } from 'lucide-react';
import type { StaffUserRow, UserProfile } from '../../types';
import { getStaffUserDirectory, getPendingStaffApplications, setUserRole, staffSuspendUser, staffUnsuspendUser } from '../../supabase';
import {
  ASSIGNABLE_ROLE_OPTIONS,
  ROLE_LABELS,
  STAFF_ROLE_SLOTS,
  isStaffRole,
  normalizeUserRole,
  roleRank,
  staffRoleSlotMessage,
} from '../../lib/roles';
import type { UserRole } from '../../lib/roles';
import { nextPendingApplication, type StaffApplication } from '../../lib/staffApplications';
import { useStaffPermission } from '../../hooks/useStaffPermission';
import NoPermissionModal from './NoPermissionModal';
import StaffApplicationQueue from './StaffApplicationQueue';
import UserAvatar from '../UserAvatar';

const ROLE_ORDER: UserRole[] = ['director', 'city_manager', 'city_administrator', 'city_moderator'];

interface StaffTeamViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
}

export default function StaffTeamView({ actor, onViewProfile }: StaffTeamViewProps) {
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [expandedUid, setExpandedUid] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<Record<string, UserRole>>({});
  const [applications, setApplications] = useState<StaffApplication[]>([]);

  const perm = useStaffPermission(actor);

  const actorRank = roleRank(actor.role);
  const isDirector = normalizeUserRole(actor.role) === 'director';
  const canAccessTeam = actorRank >= roleRank('city_administrator');

  const load = async () => {
    setLoading(true);
    const [all, pending] = await Promise.all([getStaffUserDirectory(), getPendingStaffApplications()]);
    setUsers(all);
    setApplications(pending);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const staffMembers = useMemo(
    () => users.filter((u) => isStaffRole(u.role)).sort((a, b) => roleRank(b.role) - roleRank(a.role)),
    [users],
  );

  const applicationQueue = useMemo(() => nextPendingApplication(applications), [applications]);

  const run = async (uid: string, fn: () => Promise<{ ok: boolean; errorMessage?: string }>) => {
    setBusy(uid); setErr('');
    const result = await fn();
    setBusy(null);
    if (!result.ok) setErr(result.errorMessage ?? 'Something went wrong.');
    else { void load(); setExpandedUid(null); }
  };

  const handleRoleChange = (user: StaffUserRow) => {
    const newRole = pendingRole[user.uid] ?? normalizeUserRole(user.role);
    if (!perm.checkAssignRole(user, newRole)) return;
    void run(user.uid, () =>
      setUserRole(user.uid, newRole, {
        actorUserId: actor.uid,
        actorName: actor.displayName,
        targetName: user.displayName,
        previousRole: normalizeUserRole(user.role),
      }),
    );
  };

  const handleSuspend = (user: StaffUserRow) => {
    if (!perm.checkSuspend(user)) return;
    void run(user.uid, () =>
      staffSuspendUser({ actor, targetUserId: user.uid, targetName: user.displayName, durationDays: 3 }),
    );
  };

  const handleUnsuspend = (user: StaffUserRow) => {
    if (!perm.checkSuspend(user)) return;
    void run(user.uid, () =>
      staffUnsuspendUser({ actor, targetUserId: user.uid, targetName: user.displayName }),
    );
  };

  const slotSummary = useMemo(() => {
    const counts: Partial<Record<UserRole, number>> = {};
    for (const u of staffMembers) {
      const r = normalizeUserRole(u.role);
      counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [staffMembers]);

  if (!canAccessTeam) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h3 className="font-display font-bold text-app text-lg">No permission</h3>
          <p className="text-sm text-muted mt-1">
            City Administrator rank or above is required to access team management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <NoPermissionModal open={perm.noPermOpen} reason={perm.noPermReason} onClose={perm.closeNoPerm} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Team Management</h2>
            <p className="text-xs text-muted mt-0.5">{staffMembers.length} staff members</p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Refresh
          </button>
        </div>

        {/* Seat summary */}
        <div className="flex flex-wrap gap-2">
          {ROLE_ORDER.filter((r) => r !== 'user').map((role) => {
            const limit = STAFF_ROLE_SLOTS[role];
            const count = slotSummary[role] ?? 0;
            return limit ? (
              <div key={role} className="bg-inset border border-app rounded-lg px-3 py-1.5 text-[10px] font-semibold">
                <span className="text-muted">{ROLE_LABELS[role]}: </span>
                <span className={count >= limit ? 'text-accent' : 'text-accent'}>{count}/{limit}</span>
              </div>
            ) : null;
          })}
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          <StaffApplicationQueue
            actor={actor}
            current={applicationQueue.current}
            waiting={applicationQueue.waiting}
            onViewProfile={onViewProfile}
            onReviewed={() => void load()}
          />

          {staffMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Users className="w-10 h-10 text-subtle" />
              <p className="text-sm text-muted">No staff members found.</p>
            </div>
          ) : (
            ROLE_ORDER.filter((r) => r !== 'user').map((roleTier) => {
            const members = staffMembers.filter((u) => normalizeUserRole(u.role) === roleTier);
            if (members.length === 0) return null;
            return (
              <div key={roleTier} className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono px-1 pt-2">
                  {ROLE_LABELS[roleTier]}
                </p>
                {members.map((user) => {
                  const isSelf = user.uid === actor.uid;
                  const canAct = perm.canActOn(user);
                  const isBusy = busy === user.uid;
                  const isExpanded = expandedUid === user.uid;
                  const currentPendingRole = pendingRole[user.uid] ?? normalizeUserRole(user.role);

                  return (
                    <div key={user.uid} className={`sbn-card rounded-xl border ${isExpanded ? 'border-accent/40' : 'border-app'}`}>
                      <div className="flex items-center gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => onViewProfile(user.uid)}
                          className="shrink-0"
                        >
                          <UserAvatar uid={user.uid} src={user.photoURL} name={user.displayName} size="sm" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => onViewProfile(user.uid)}
                              className="font-semibold text-sm text-app hover:text-accent"
                            >
                              {user.displayName}
                            </button>
                            {isSelf && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate">{user.email}</p>
                          {user.accountStatus !== 'active' && (
                            <span className="text-[10px] font-semibold capitalize text-accent">
                              {user.accountStatus}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedUid(isExpanded ? null : user.uid)}
                              className={`sbn-btn sbn-btn-secondary sbn-btn-sm ${!canAct && !isSelf ? 'opacity-40' : ''}`}
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-app pt-3 space-y-3">
                          {isSelf && (
                            <p className="text-xs text-muted italic">
                              You cannot modify your own staff account from here.
                            </p>
                          )}
                          {!isSelf && !canAct && (
                            <p className="text-xs text-muted italic">
                              You cannot modify {user.displayName} — they are at or above your rank.
                            </p>
                          )}

                          {/* Role assignment — director only */}
                          {isDirector && !isSelf && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Change role</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ASSIGNABLE_ROLE_OPTIONS.map((opt) => {
                                  const wouldExceedSlot =
                                    opt.value !== normalizeUserRole(user.role) &&
                                    opt.value !== 'user' &&
                                    (slotSummary[opt.value] ?? 0) >= (STAFF_ROLE_SLOTS[opt.value] ?? Infinity);
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      disabled={wouldExceedSlot}
                                      title={
                                        wouldExceedSlot
                                          ? staffRoleSlotMessage(opt.value, STAFF_ROLE_SLOTS[opt.value]!)
                                          : opt.description
                                      }
                                      onClick={() =>
                                        setPendingRole((p) => ({ ...p, [user.uid]: opt.value }))
                                      }
                                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                        currentPendingRole === opt.value
                                          ? 'bg-accent text-on-accent border-accent'
                                          : 'border-app text-muted hover:border-accent hover:text-accent'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                              {currentPendingRole !== normalizeUserRole(user.role) && (
                                <button
                                  type="button"
                                  onClick={() => handleRoleChange(user)}
                                  className="sbn-btn sbn-btn-primary sbn-btn-sm"
                                >
                                  Save role change
                                </button>
                              )}
                            </div>
                          )}

                          {/* Suspend actions — admin+ can suspend lower ranks */}
                          {!isSelf && canAct && (
                            <div className="flex flex-wrap gap-2">
                              {user.accountStatus === 'suspended' ? (
                                <button
                                  type="button"
                                  onClick={() => handleUnsuspend(user)}
                                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                                >
                                  Unsuspend
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSuspend(user)}
                                  className="sbn-btn sbn-btn-sm bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20"
                                >
                                  Suspend (3 days)
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => onViewProfile(user.uid)}
                                className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                              >
                                Full profile
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
          )}
        </div>
      )}
    </div>
  );
}
