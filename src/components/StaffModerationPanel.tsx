import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile, StaffUserRow, ModerationAuditEntry, UserViolation, SACRAMENTO_NEIGHBORHOODS } from '../types';
import {
  getStaffUserDirectory,
  getModerationAuditLog,
  staffSuspendUser,
  staffUnsuspendUser,
  staffBanUser,
  staffUnbanUser,
  staffUpdateUserProfile,
  staffDeleteUserAccount,
} from '../supabase';
import {
  canAccessStaffDirectory,
  canEditOwnStaffMessage,
  canStaffBan,
  canStaffEditUser,
  canStaffDeleteAccount,
  canStaffSuspend,
  canViewAuditLog,
  canViewDirectorOverview,
  roleRank,
  ASSIGNABLE_ROLE_OPTIONS,
} from '../lib/roles';
import {
  decideGoGetViolationAppeal,
  getAllViolationsForStaff,
  reviewGoGetViolation,
  unlockViolationLockedAccount,
} from '../lib/violations';
import LeaderMessageEditModal from './LeaderMessageEditModal';
import { useDirectorMessage } from '../hooks/useDirectorMessage';
import { useStaffMessage } from '../hooks/useStaffMessage';
import RoleBadge from './RoleBadge';
import { useConfirm } from '../contexts/ConfirmContext';
import FullScreenPanel from './FullScreenPanel';
import ListingImage from './ListingImage';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { avatarImageUrl } from '../lib/imageUrl';
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Megaphone,
  MessageSquareQuote,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';

const SUSPEND_DURATIONS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
];

type StaffPanel = 'directory' | 'audit' | 'violations' | null;

interface StaffModerationPanelProps {
  viewer: UserProfile;
  onViewProfile: (userId: string) => void;
}

function neighborAvatarUrl(user: StaffUserRow): string {
  return avatarImageUrl(user.photoURL, user.displayName, user.uid);
}

function statusLabel(user: StaffUserRow): string {
  if (user.accountStatus === 'banned') return 'Banned';
  if (user.accountStatus === 'locked') return 'Locked (Go Get violations)';
  if (user.accountStatus === 'suspended') {
    if (user.suspendedUntil) {
      return `Suspended until ${new Date(user.suspendedUntil).toLocaleDateString()}`;
    }
    return 'Suspended';
  }
  return 'Active';
}

const VIOLATION_CATEGORY_LABEL: Record<UserViolation['category'], string> = {
  no_show: 'No-show',
  false_claim: 'False claim',
  unsafe_behavior: 'Unsafe behavior',
  other: 'Other',
};

export default function StaffModerationPanel({
  viewer,
  onViewProfile,
}: StaffModerationPanelProps) {
  const [panel, setPanel] = useState<StaffPanel>(null);
  const [users, setUsers] = useState<StaffUserRow[]>([]);
  const [audit, setAudit] = useState<ModerationAuditEntry[]>([]);
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [violationBusyId, setViolationBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [editUser, setEditUser] = useState<StaffUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editNeighborhood, setEditNeighborhood] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRole, setEditRole] = useState<UserProfile['role']>('user');
  const [editSaving, setEditSaving] = useState(false);
  const [editingDirectorMessage, setEditingDirectorMessage] = useState(false);
  const [editingStaffMessage, setEditingStaffMessage] = useState(false);
  const { confirm } = useConfirm();

  const canDirectory = canAccessStaffDirectory(viewer.role);
  const canEditDirectorMessage = canViewDirectorOverview(viewer.role);
  const canEditStaffMessage = canEditOwnStaffMessage(viewer.role);
  const { message: directorMessage, saveMessage: saveDirectorMessage } = useDirectorMessage(viewer);
  const {
    message: staffMessage,
    saveMessage: saveStaffMessage,
    isPublished: staffMessagePublished,
  } = useStaffMessage(viewer);
  const canAudit = canViewAuditLog(viewer.role);
  const canSuspend = canStaffSuspend(viewer.role);
  const canBan = canStaffBan(viewer.role);
  const canEdit = canStaffEditUser(viewer.role);
  const canDeleteAccount = canStaffDeleteAccount(viewer.role);
  const canDecideAppeals = roleRank(viewer.role) >= roleRank('city_administrator');

  const reloadDirectory = useCallback(async () => {
    setLoading(true);
    const list = await getStaffUserDirectory();
    setUsers(list);
    setLoading(false);
  }, []);

  const reloadAudit = useCallback(async () => {
    setLoading(true);
    const rows = await getModerationAuditLog(150);
    setAudit(rows);
    setLoading(false);
  }, []);

  const reloadViolations = useCallback(async () => {
    setLoading(true);
    const rows = await getAllViolationsForStaff();
    setViolations(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (panel === 'directory') void reloadDirectory();
    if (panel === 'audit') void reloadAudit();
    if (panel === 'violations') void reloadViolations();
  }, [panel, reloadDirectory, reloadAudit, reloadViolations]);

  // Keep the "open reports" count on the tools grid fresh even before the panel is opened.
  useEffect(() => {
    void reloadViolations();
  }, [reloadViolations]);

  useEffect(() => {
    if (!panel) return;

    const refresh = debounceRealtime(() => {
      if (panel === 'directory') void reloadDirectory();
      else if (panel === 'audit') void reloadAudit();
      else if (panel === 'violations') void reloadViolations();
    }, 100);

    const unsubs: (() => void)[] = [];

    if (panel === 'directory') {
      unsubs.push(
        subscribePostgresChanges({ channelName: 'staff-live-users', table: 'users', event: '*' }, refresh),
      );
    }
    if (panel === 'audit') {
      unsubs.push(
        subscribePostgresChanges(
          { channelName: 'staff-live-audit', table: 'moderation_audit_log', event: 'INSERT' },
          refresh,
        ),
      );
    }
    if (panel === 'violations') {
      unsubs.push(
        subscribePostgresChanges({ channelName: 'staff-live-violations', table: 'user_violations', event: '*' }, refresh),
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [panel, reloadDirectory, reloadAudit, reloadViolations]);

  const handleReviewViolation = async (violation: UserViolation, decision: 'confirm' | 'dismiss') => {
    setViolationBusyId(violation.id);
    setErr('');
    const result = await reviewGoGetViolation({ violation, actor: viewer, decision });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'confirm' ? 'Violation confirmed.' : 'Report dismissed.');
      await reloadViolations();
    } else {
      setErr(result.errorMessage || 'Could not review this report.');
    }
  };

  const handleDecideAppeal = async (violation: UserViolation, decision: 'uphold' | 'deny') => {
    setViolationBusyId(violation.id);
    setErr('');
    const result = await decideGoGetViolationAppeal({ violation, actor: viewer, decision });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'uphold' ? 'Appeal granted — overturned.' : 'Appeal denied.');
      await reloadViolations();
    } else {
      setErr(result.errorMessage || 'Could not decide this appeal.');
    }
  };

  const handleUnlockAccount = async (user: StaffUserRow) => {
    const confirmed = await confirm({
      title: 'Unlock account',
      message: `Unlock ${user.displayName}'s account after their Go Get violations review?`,
      confirmLabel: 'Unlock account',
    });
    if (!confirmed) return;
    const result = await unlockViolationLockedAccount({ actor: viewer, targetUserId: user.uid });
    if (result.ok) {
      setMsg(`${user.displayName}'s account unlocked.`);
      await reloadDirectory();
    } else {
      setErr(result.errorMessage || 'Could not unlock this account.');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.neighborhood.toLowerCase().includes(q),
    );
  }, [users, search]);

  const closePanel = () => {
    setPanel(null);
    setSearch('');
    setMsg('');
    setErr('');
  };

  const runAction = async (user: StaffUserRow, action: string) => {
    setMsg('');
    setErr('');

    if (action === 'view') {
      closePanel();
      onViewProfile(user.uid);
      return;
    }

    if (action === 'edit') {
      setEditUser(user);
      setEditName(user.displayName);
      setEditNeighborhood(user.neighborhood);
      setEditBio(user.bio || '');
      setEditRole(user.role ?? 'user');
      return;
    }

    if (action.startsWith('suspend_')) {
      const days = Number(action.replace('suspend_', ''));
      const confirmed = await confirm({
        title: 'Suspend neighbor',
        message: `Suspend ${user.displayName} for ${days} day(s)? Their account will be disabled until then.`,
        confirmLabel: 'Suspend',
        variant: 'danger',
      });
      if (!confirmed) return;
      const result = await staffSuspendUser({
        actor: viewer,
        targetUserId: user.uid,
        targetName: user.displayName,
        durationDays: days,
      });
      if (result.ok) {
        setMsg(`${user.displayName} suspended.`);
        await reloadDirectory();
      } else {
        setErr(result.errorMessage || 'Suspend failed.');
      }
      return;
    }

    if (action === 'unsuspend') {
      const confirmed = await confirm({
        message: `Unsuspend ${user.displayName}?`,
        confirmLabel: 'Unsuspend',
      });
      if (!confirmed) return;
      const result = await staffUnsuspendUser({
        actor: viewer,
        targetUserId: user.uid,
        targetName: user.displayName,
      });
      if (result.ok) {
        setMsg(`${user.displayName} unsuspended.`);
        await reloadDirectory();
      } else {
        setErr(result.errorMessage || 'Unsuspend failed.');
      }
      return;
    }

    if (action === 'ban') {
      const confirmed = await confirm({
        title: 'Ban neighbor',
        message: `Ban ${user.displayName}? This disables their account until you unban them.`,
        confirmLabel: 'Ban',
        variant: 'danger',
      });
      if (!confirmed) return;
      const result = await staffBanUser({
        actor: viewer,
        targetUserId: user.uid,
        targetName: user.displayName,
      });
      if (result.ok) {
        setMsg(`${user.displayName} banned.`);
        await reloadDirectory();
      } else {
        setErr(result.errorMessage || 'Ban failed.');
      }
      return;
    }

    if (action === 'unban') {
      const confirmed = await confirm({
        message: `Unban ${user.displayName} and restore their account?`,
        confirmLabel: 'Unban',
      });
      if (!confirmed) return;
      const result = await staffUnbanUser({
        actor: viewer,
        targetUserId: user.uid,
        targetName: user.displayName,
      });
      if (result.ok) {
        setMsg(`${user.displayName} unbanned.`);
        await reloadDirectory();
      } else {
        setErr(result.errorMessage || 'Unban failed.');
      }
      return;
    }

    if (action === 'delete_account') {
      const confirmed = await confirm({
        title: 'Delete account',
        message: `Permanently delete ${user.displayName}'s account? All their listings, comments, messages, and profile data will be removed. This cannot be undone.`,
        confirmLabel: 'Delete account',
        variant: 'danger',
      });
      if (!confirmed) return;
      const result = await staffDeleteUserAccount({
        actor: viewer,
        targetUserId: user.uid,
        targetName: user.displayName,
        targetRole: user.role,
      });
      if (result.ok) {
        setMsg(result.errorMessage || `${user.displayName}'s account deleted.`);
        await reloadDirectory();
      } else {
        setErr(result.errorMessage || 'Could not delete account.');
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setEditSaving(true);
    setErr('');
    const result = await staffUpdateUserProfile({
      actor: viewer,
      targetUserId: editUser.uid,
      targetName: editUser.displayName,
      displayName: editName,
      neighborhood: editNeighborhood,
      bio: editBio,
      role: viewer.role === 'director' ? editRole : undefined,
    });
    setEditSaving(false);
    if (result.ok) {
      setMsg(`${editName} updated.`);
      setEditUser(null);
      await reloadDirectory();
    } else {
      setErr(result.errorMessage || 'Could not save changes.');
    }
  };

  if (!canDirectory) return null;

  const statusBanner = (msg || err) && panel && !editUser && (
    <div className="sbn-help-card mb-3 py-2">
      {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
      {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
    </div>
  );

  return (
    <div className="space-y-3 min-w-0 w-full overflow-x-hidden" id="staff_moderation_panel">
      <h3 className="font-display font-bold text-sm text-app flex items-center gap-2">
        <Shield className="w-4 h-4 text-accent" />
        Staff tools
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPanel('directory')}
          className="sbn-help-list-item"
        >
          <span className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
            <Users className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Neighbor directory</span>
            <span className="text-[11px] text-muted">All community members</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => setPanel('violations')}
          className="sbn-help-list-item"
        >
          <span className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Go Get violations</span>
            <span className="text-[11px] text-muted">
              {violations.filter((v) => v.status === 'pending_review' || v.status === 'appealed').length || 'No'}{' '}
              open reports
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        {canAudit && (
          <button
            type="button"
            onClick={() => setPanel('audit')}
            className="sbn-help-list-item"
          >
            <span className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
              <ClipboardList className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-app block">Audit log</span>
              <span className="text-[11px] text-muted">Moderation action history</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        )}
        {canEditDirectorMessage && (
          <button
            type="button"
            onClick={() => setEditingDirectorMessage(true)}
            className="sbn-help-list-item"
          >
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Megaphone className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-app block">Public welcome message</span>
              <span className="text-[11px] text-muted">Director note on the home and reviews pages</span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        )}
        {canEditStaffMessage && staffMessage && (
          <button
            type="button"
            onClick={() => setEditingStaffMessage(true)}
            className="sbn-help-list-item"
          >
            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
              <MessageSquareQuote className="w-4 h-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold text-sm text-app block">Your team message</span>
              <span className="text-[11px] text-muted">
                {staffMessagePublished
                  ? 'Live on the home and reviews pages'
                  : 'Not published yet — tap to write yours'}
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted shrink-0" />
          </button>
        )}
      </div>

      {panel === 'directory' && (
        <FullScreenPanel wide title="Neighbor directory" subtitle="All community members" onClose={closePanel}>
          {statusBanner}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, neighborhood…"
                className="sbn-input pl-9 text-sm"
              />
            </div>

            {loading ? (
              <p className="text-sm text-muted sbn-help-empty">Loading neighbors…</p>
            ) : filteredUsers.length === 0 ? (
              <div className="sbn-help-empty">
                <p className="text-sm text-muted">No neighbors found.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {filteredUsers.map((user) => {
                  const isSuspended = user.accountStatus === 'suspended';
                  const isBanned = user.accountStatus === 'banned';
                  const isLocked = user.accountStatus === 'locked';

                  return (
                    <li
                      key={user.uid}
                      className="sbn-help-list-item flex-col sm:flex-row sm:items-center !items-stretch gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ListingImage
                          src={neighborAvatarUrl(user)}
                          alt=""
                          width={96}
                          className="w-10 h-10 rounded-full border border-app object-cover shrink-0 bg-inset"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-app truncate">{user.displayName}</p>
                          <p className="text-[11px] text-muted truncate">{user.email}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {user.role && user.role !== 'user' && <RoleBadge role={user.role} />}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                isBanned || isLocked
                                  ? 'bg-red-500/15 text-red-400'
                                  : isSuspended
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : 'bg-emerald-500/10 text-emerald-500'
                              }`}
                            >
                              {statusLabel(user)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === 'unlock_violations') {
                            void handleUnlockAccount(user);
                          } else if (v) {
                            void runAction(user, v);
                          }
                          e.target.value = '';
                        }}
                        className="sbn-input text-xs py-2 min-w-[9rem] shrink-0"
                        aria-label={`Actions for ${user.displayName}`}
                      >
                        <option value="">Actions…</option>
                        <option value="view">View profile</option>
                        {canEdit && user.uid !== viewer.uid && (
                          <option value="edit">Edit profile</option>
                        )}
                        {canSuspend && user.uid !== viewer.uid && !isBanned && !isSuspended &&
                          SUSPEND_DURATIONS.map((d) => (
                            <option key={d.days} value={`suspend_${d.days}`}>
                              Suspend {d.label}
                            </option>
                          ))}
                        {canSuspend && user.uid !== viewer.uid && isSuspended && (
                          <option value="unsuspend">Unsuspend</option>
                        )}
                        {canBan && user.uid !== viewer.uid && !isBanned && (
                          <option value="ban">Ban / block account</option>
                        )}
                        {canBan && user.uid !== viewer.uid && isBanned && (
                          <option value="unban">Unban / unblock</option>
                        )}
                        {canDecideAppeals && user.uid !== viewer.uid && isLocked && (
                          <option value="unlock_violations">Unlock account (Go Get violations)</option>
                        )}
                        {canDeleteAccount && user.uid !== viewer.uid && (
                          <option value="delete_account">Delete account permanently</option>
                        )}
                      </select>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </FullScreenPanel>
      )}

      {panel === 'audit' && (
        <FullScreenPanel wide title="Moderation audit log" subtitle="Director & City Manager" onClose={closePanel}>
          {loading ? (
              <p className="text-sm text-muted sbn-help-empty">Loading audit log…</p>
            ) : audit.length === 0 ? (
              <div className="sbn-help-empty">
                <p className="text-sm text-muted">No moderation actions recorded yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {audit.map((entry) => (
                  <li key={entry.id} className="sbn-help-card text-sm">
                    <div className="flex flex-wrap justify-between gap-1">
                      <span className="font-semibold text-app capitalize">{entry.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      <span className="text-app font-medium">{entry.actorName}</span>
                      {' → '}
                      <span className="text-app font-medium">{entry.targetName}</span>
                    </p>
                    {entry.detail && (
                      <p className="text-xs text-subtle mt-1 leading-snug">{entry.detail}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
        </FullScreenPanel>
      )}

      {panel === 'violations' && (
        <FullScreenPanel
          wide
          title="Go Get violations"
          subtitle={canDecideAppeals ? 'Moderators review reports; you also decide appeals' : 'City Moderator review queue'}
          onClose={closePanel}
        >
          {statusBanner}
          {loading ? (
            <p className="text-sm text-muted sbn-help-empty">Loading violations…</p>
          ) : violations.length === 0 ? (
            <div className="sbn-help-empty">
              <p className="text-sm text-muted">No Go Get violation reports yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {violations.map((v) => {
                const busy = violationBusyId === v.id;
                return (
                  <li key={v.id} className="sbn-help-card space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-app">{VIOLATION_CATEGORY_LABEL[v.category]}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-inset text-muted">
                        {v.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted">
                      Reported by <span className="text-app font-medium">{v.reportedByName}</span> ·{' '}
                      {new Date(v.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-app leading-snug">{v.description}</p>

                    {v.status === 'pending_review' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReviewViolation(v, 'confirm')}
                          className="sbn-btn sbn-btn-primary sbn-btn-sm justify-center disabled:opacity-60"
                        >
                          Confirm violation
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleReviewViolation(v, 'dismiss')}
                          className="sbn-btn sbn-btn-secondary sbn-btn-sm justify-center disabled:opacity-60"
                        >
                          Dismiss report
                        </button>
                      </div>
                    )}

                    {v.status === 'appealed' && (
                      <div className="space-y-2 pt-1 border-t border-app">
                        {v.appealText && (
                          <p className="text-xs text-app leading-snug">
                            <span className="font-semibold">Appeal:</span> {v.appealText}
                          </p>
                        )}
                        {canDecideAppeals ? (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDecideAppeal(v, 'uphold')}
                              className="sbn-btn sbn-btn-primary sbn-btn-sm justify-center disabled:opacity-60"
                            >
                              Grant appeal
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDecideAppeal(v, 'deny')}
                              className="sbn-btn sbn-btn-secondary sbn-btn-sm justify-center disabled:opacity-60"
                            >
                              Deny appeal
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-500 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Only a city administrator or higher can decide this appeal.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </FullScreenPanel>
      )}

      {editUser && (
        <FullScreenPanel
          nested
          wide
          title={`Edit ${editUser.displayName}`}
          subtitle="Staff profile editor"
          onClose={() => setEditUser(null)}
        >
          <div className="sbn-help-card space-y-4">
            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Display name</span>
              <input className="sbn-input text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Neighborhood</span>
              <select
                className="sbn-input text-sm"
                value={editNeighborhood}
                onChange={(e) => setEditNeighborhood(e.target.value)}
              >
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Bio</span>
              <textarea
                className="sbn-input text-sm min-h-[4rem]"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
              />
            </label>
            {viewer.role === 'director' && (
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">Role</span>
                <select
                  className="sbn-input text-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserProfile['role'])}
                >
                  {ASSIGNABLE_ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={editSaving || !editName.trim()}
              onClick={() => void handleSaveEdit()}
              className="sbn-btn sbn-btn-primary w-full"
            >
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </FullScreenPanel>
      )}

      {editingDirectorMessage && (
        <LeaderMessageEditModal
          editTitle="Edit director message"
          values={{
            name: directorMessage.directorName,
            title: directorMessage.directorTitle,
            headline: directorMessage.headline,
            goal: directorMessage.goal,
            promises: directorMessage.promises,
            closing: directorMessage.closing,
          }}
          onClose={() => setEditingDirectorMessage(false)}
          onSave={async (next) =>
            saveDirectorMessage({
              ...directorMessage,
              directorName: next.name,
              directorTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}

      {editingStaffMessage && staffMessage && (
        <LeaderMessageEditModal
          editTitle="Edit your team message"
          values={{
            name: staffMessage.staffName,
            title: staffMessage.staffTitle,
            headline: staffMessage.headline,
            goal: staffMessage.goal,
            promises: staffMessage.promises,
            closing: staffMessage.closing,
          }}
          onClose={() => setEditingStaffMessage(false)}
          onSave={async (next) =>
            saveStaffMessage({
              ...staffMessage,
              staffName: next.name,
              staffTitle: next.title,
              headline: next.headline,
              goal: next.goal,
              promises: next.promises,
              closing: next.closing,
              updatedAt: new Date().toISOString(),
            })
          }
        />
      )}

      <p className="text-[10px] text-muted leading-snug">
        Staff tools: {canSuspend && 'suspend'}
        {canBan && ' · ban'}
        {canEdit && ' · edit'}
        {canAudit && ' · audit log'}
        {!canBan && canSuspend && ' (moderators: view + suspend only)'}
      </p>
    </div>
  );
}
