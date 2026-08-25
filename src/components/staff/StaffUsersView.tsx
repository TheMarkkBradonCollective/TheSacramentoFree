import { useEffect, useMemo, useState } from 'react';
import {
  Ban,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  CircleOff,
  Loader2,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import type { StaffUserRow, UserProfile } from '../../types';
import {
  getStaffUserDirectory,
  staffSuspendUser,
  staffUnsuspendUser,
  staffBanUser,
  staffUnbanUser,
} from '../../supabase';
import {
  roleLabel,
  roleRank,
  isStaffRole,
  ROLE_LABELS,
} from '../../lib/roles';
import { unlockViolationLockedAccount } from '../../lib/violations';
import { useStaffPermission } from '../../hooks/useStaffPermission';
import { useConfirm } from '../../contexts/ConfirmContext';
import NoPermissionModal from './NoPermissionModal';
import UserAvatar from '../UserAvatar';

type SortField = 'displayName' | 'role' | 'accountStatus' | 'neighborhood' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  suspended: 'bg-accent/15 text-accent',
  banned: 'bg-red-500/15 text-red-400',
  locked: 'bg-accent/15 text-accent',
};

interface StaffUsersViewProps {
  actor: UserProfile;
  onViewProfile: (userId: string) => void;
}

export default function StaffUsersView({ actor, onViewProfile }: StaffUsersViewProps) {
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [suspendDays, setSuspendDays] = useState<Record<string, number>>({});
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const perm = useStaffPermission(actor);
  const { confirm } = useConfirm();
  const canUnlockViolations = roleRank(actor.role) >= roleRank('city_administrator');

  const load = async () => {
    setLoading(true);
    const rows = await getStaffUserDirectory();
    setUsers(rows);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    let rows = users;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.neighborhood.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') rows = rows.filter((u) => u.accountStatus === statusFilter);
    if (roleFilter !== 'all') rows = rows.filter((u) => (u.role ?? 'user') === roleFilter);

    rows = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'displayName') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortField === 'role') cmp = roleRank(a.role) - roleRank(b.role);
      else if (sortField === 'accountStatus')
        cmp = (a.accountStatus ?? 'active').localeCompare(b.accountStatus ?? 'active');
      else if (sortField === 'neighborhood')
        cmp = (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '');
      else if (sortField === 'createdAt') {
        const ta = typeof a.createdAt === 'object' && 'seconds' in a.createdAt
          ? (a.createdAt as { seconds: number }).seconds
          : new Date(a.createdAt ?? 0).getTime() / 1000;
        const tb = typeof b.createdAt === 'object' && 'seconds' in b.createdAt
          ? (b.createdAt as { seconds: number }).seconds
          : new Date(b.createdAt ?? 0).getTime() / 1000;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }, [users, search, statusFilter, roleFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 text-subtle" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-accent" />
      : <ChevronDown className="w-3.5 h-3.5 text-accent" />;
  };

  const run = async (uid: string, fn: () => Promise<{ ok: boolean; errorMessage?: string }>) => {
    setBusy(uid); setErr('');
    const result = await fn();
    setBusy(null);
    if (!result.ok) setErr(result.errorMessage ?? 'Something went wrong.');
    else { void load(); setExpandedRow(null); }
  };

  const handleSuspend = (user: StaffUserRow) => {
    if (!perm.checkSuspend(user)) return;
    const days = suspendDays[user.uid] ?? 3;
    void run(user.uid, () =>
      staffSuspendUser({ actor, targetUserId: user.uid, targetName: user.displayName, durationDays: days }),
    );
  };

  const handleUnsuspend = (user: StaffUserRow) => {
    if (!perm.checkSuspend(user)) return;
    void run(user.uid, () =>
      staffUnsuspendUser({ actor, targetUserId: user.uid, targetName: user.displayName }),
    );
  };

  const handleBan = (user: StaffUserRow) => {
    if (!perm.checkBan(user)) return;
    void run(user.uid, () =>
      staffBanUser({ actor, targetUserId: user.uid, targetName: user.displayName }),
    );
  };

  const handleUnban = (user: StaffUserRow) => {
    if (!perm.checkBan(user)) return;
    void run(user.uid, () =>
      staffUnbanUser({ actor, targetUserId: user.uid, targetName: user.displayName }),
    );
  };

  const handleUnlockViolations = async (user: StaffUserRow) => {
    if (!canUnlockViolations) return;
    const confirmed = await confirm({
      title: 'Unlock account',
      message: `Unlock ${user.displayName}'s account after their Go Get violations review?`,
      confirmLabel: 'Unlock account',
    });
    if (!confirmed) return;
    void run(user.uid, () => unlockViolationLockedAccount({ actor, targetUserId: user.uid }));
  };

  const formatDate = (createdAt: unknown) => {
    if (!createdAt) return '—';
    const ms = typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt
      ? (createdAt as { seconds: number }).seconds * 1000
      : new Date(createdAt as string).getTime();
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <NoPermissionModal open={perm.noPermOpen} reason={perm.noPermReason} onClose={perm.closeNoPerm} />

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-app space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">User Management</h2>
            <p className="text-xs text-muted mt-0.5">{users.length} neighbors</p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Refresh
          </button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, neighborhood…"
              className="sbn-input text-xs pl-8"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-app">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sbn-input text-xs w-auto"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="locked">Locked</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="sbn-input text-xs w-auto"
          >
            <option value="all">All roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-xs border-collapse min-w-[640px]">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b border-app">
                <th className="text-left px-3 py-2.5 font-semibold text-muted w-[240px]">
                  <button type="button" onClick={() => toggleSort('displayName')} className="flex items-center gap-1 hover:text-app">
                    Name <SortIcon field="displayName" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted">
                  <button type="button" onClick={() => toggleSort('role')} className="flex items-center gap-1 hover:text-app">
                    Role <SortIcon field="role" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted">
                  <button type="button" onClick={() => toggleSort('accountStatus')} className="flex items-center gap-1 hover:text-app">
                    Status <SortIcon field="accountStatus" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden md:table-cell">
                  <button type="button" onClick={() => toggleSort('neighborhood')} className="flex items-center gap-1 hover:text-app">
                    Neighborhood <SortIcon field="neighborhood" />
                  </button>
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-muted hidden lg:table-cell">
                  <button type="button" onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-app">
                    Joined <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="text-right px-3 py-2.5 font-semibold text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isSelf = user.uid === actor.uid;
                const canAct = perm.canActOn(user);
                const isBusy = busy === user.uid;
                const isExpanded = expandedRow === user.uid;

                return (
                  <>
                    <tr
                      key={user.uid}
                      className={`border-b border-app/50 hover:bg-inset transition-colors ${isExpanded ? 'bg-inset' : ''}`}
                    >
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => onViewProfile(user.uid)}
                          className="flex items-center gap-2 text-left hover:text-accent"
                        >
                          <UserAvatar uid={user.uid} src={user.photoURL} name={user.displayName} size="xs" />
                          <div className="min-w-0">
                            <p className="font-semibold text-app truncate max-w-[160px]">{user.displayName}</p>
                            <p className="text-muted truncate max-w-[160px]">{user.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isStaffRole(user.role)
                            ? 'bg-accent/15 text-accent'
                            : 'bg-inset text-muted'
                        }`}>
                          {roleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[user.accountStatus ?? 'active'] ?? ''}`}>
                          {user.accountStatus ?? 'active'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-muted">{user.neighborhood}</td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-muted">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {isBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent inline" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedRow(isExpanded ? null : user.uid)}
                            className={`sbn-btn sbn-btn-secondary sbn-btn-sm ${!canAct && !isSelf ? 'opacity-50' : ''}`}
                          >
                            {isExpanded ? 'Close' : 'Actions'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${user.uid}-actions`} className="bg-inset border-b border-app">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap gap-2 items-center">
                            {isSelf && (
                              <p className="text-xs text-muted italic">This is your account — you cannot moderate yourself.</p>
                            )}
                            {!isSelf && !canAct && (
                              <p className="text-xs text-muted italic">
                                You cannot moderate {user.displayName} — they are at or above your rank.
                              </p>
                            )}

                            <button
                              type="button"
                              onClick={() => onViewProfile(user.uid)}
                              className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                            >
                              View profile
                            </button>

                            {/* Suspend / Unsuspend */}
                            {user.accountStatus === 'suspended' ? (
                              <button
                                type="button"
                                onClick={() => handleUnsuspend(user)}
                                className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                              </button>
                            ) : user.accountStatus === 'locked' && canUnlockViolations ? (
                              <button
                                type="button"
                                onClick={() => void handleUnlockViolations(user)}
                                className="sbn-btn sbn-btn-primary sbn-btn-sm"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Unlock (Go Get)
                              </button>
                            ) : user.accountStatus === 'active' || user.accountStatus === 'locked' ? (
                              <div className="flex items-center gap-1">
                                <select
                                  value={suspendDays[user.uid] ?? 3}
                                  onChange={(e) => setSuspendDays((p) => ({ ...p, [user.uid]: Number(e.target.value) }))}
                                  className="sbn-input text-xs py-1 h-auto w-auto"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value={1}>1 day</option>
                                  <option value={3}>3 days</option>
                                  <option value={7}>7 days</option>
                                  <option value={30}>30 days</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleSuspend(user)}
                                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                                >
                                  <ShieldOff className="w-3.5 h-3.5" /> Suspend
                                </button>
                              </div>
                            ) : null}

                            {/* Ban / Unban */}
                            {user.accountStatus === 'banned' ? (
                              <button
                                type="button"
                                onClick={() => handleUnban(user)}
                                className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Unban
                              </button>
                            ) : user.accountStatus !== 'banned' && (
                              <button
                                type="button"
                                onClick={() => handleBan(user)}
                                className="sbn-btn sbn-btn-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                              >
                                <Ban className="w-3.5 h-3.5" /> Ban
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted text-sm">
                    <CircleOff className="w-8 h-8 mx-auto mb-2 text-subtle" />
                    No users match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
