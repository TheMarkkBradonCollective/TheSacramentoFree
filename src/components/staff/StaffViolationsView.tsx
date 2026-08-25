import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { UserProfile, UserViolation } from '../../types';
import { roleRank } from '../../lib/roles';
import {
  decideGoGetViolationAppeal,
  getAllViolationsForStaff,
  getOpenViolationsForStaff,
  reviewGoGetViolation,
} from '../../lib/violations';
import { getStaffUserDirectory } from '../../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../../lib/supabaseRealtime';

const VIOLATION_CATEGORY_LABEL: Record<UserViolation['category'], string> = {
  no_show: 'No-show',
  false_claim: 'False claim',
  unsafe_behavior: 'Unsafe behavior',
  other: 'Other',
};

type QueueFilter = 'open' | 'all';

interface StaffViolationsViewProps {
  actor: UserProfile;
  focusSessionId?: string | null;
  onClearFocusSession?: () => void;
}

export default function StaffViolationsView({
  actor,
  focusSessionId,
  onClearFocusSession,
}: StaffViolationsViewProps) {
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('open');
  const [violationBusyId, setViolationBusyId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const canDecideAppeals = roleRank(actor.role) >= roleRank('city_administrator');
  const openCount = violations.filter((v) => v.status === 'pending_review' || v.status === 'appealed').length;

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const [rows, directory] = await Promise.all([
      queueFilter === 'open' ? getOpenViolationsForStaff() : getAllViolationsForStaff(),
      getStaffUserDirectory(),
    ]);
    const names: Record<string, string> = {};
    for (const user of directory) names[user.uid] = user.displayName;
    setUserNames(names);
    setViolations(rows);
    setLoading(false);
  }, [queueFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (focusSessionId) setQueueFilter('all');
  }, [focusSessionId]);

  useEffect(() => {
    const refresh = debounceRealtime(() => void load(), 100);
    const unsub = subscribePostgresChanges(
      { channelName: 'staff-live-violations', table: 'user_violations', event: '*' },
      refresh,
    );
    return () => unsub();
  }, [load]);

  const displayedViolations = useMemo(() => {
    if (!focusSessionId) return violations;
    return violations.filter((v) => v.sessionId === focusSessionId);
  }, [violations, focusSessionId]);

  const handleReviewViolation = async (violation: UserViolation, decision: 'confirm' | 'dismiss') => {
    setViolationBusyId(violation.id);
    setErr('');
    setMsg('');
    const result = await reviewGoGetViolation({
      violation,
      actor,
      decision,
      note: reviewNotes[violation.id]?.trim() || undefined,
    });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'confirm' ? 'Violation confirmed.' : 'Report dismissed.');
      setReviewNotes((prev) => ({ ...prev, [violation.id]: '' }));
      await load();
    } else {
      setErr(result.errorMessage || 'Could not review this report.');
    }
  };

  const handleDecideAppeal = async (violation: UserViolation, decision: 'uphold' | 'deny') => {
    setViolationBusyId(violation.id);
    setErr('');
    setMsg('');
    const result = await decideGoGetViolationAppeal({
      violation,
      actor,
      decision,
      note: reviewNotes[violation.id]?.trim() || undefined,
    });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'uphold' ? 'Appeal granted — overturned.' : 'Appeal denied.');
      setReviewNotes((prev) => ({ ...prev, [violation.id]: '' }));
      await load();
    } else {
      setErr(result.errorMessage || 'Could not decide this appeal.');
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-app shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-role-accent font-mono">Staff Panel</p>
            <h2 className="font-display font-bold text-app text-lg">Go Get Violations</h2>
            <p className="text-xs text-muted mt-0.5">
              {openCount > 0 ? `${openCount} open report${openCount === 1 ? '' : 's'}` : 'No open reports'}
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
            Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setQueueFilter('open')}
            className={`sbn-btn sbn-btn-sm ${queueFilter === 'open' ? 'sbn-btn-primary' : 'sbn-btn-secondary'}`}
          >
            Open queue
          </button>
          <button
            type="button"
            onClick={() => setQueueFilter('all')}
            className={`sbn-btn sbn-btn-sm ${queueFilter === 'all' ? 'sbn-btn-primary' : 'sbn-btn-secondary'}`}
          >
            All reports
          </button>
        </div>

        {focusSessionId && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2">
            <p className="text-xs text-app">
              Showing violations for session <span className="font-mono">{focusSessionId}</span>
            </p>
            {onClearFocusSession && (
              <button type="button" onClick={onClearFocusSession} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
                Clear
              </button>
            )}
          </div>
        )}

        {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : displayedViolations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">
            {focusSessionId ? 'No violation reports linked to this session yet.' : 'No Go Get violation reports yet.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          <ul className="space-y-2">
            {displayedViolations.map((v) => {
              const busy = violationBusyId === v.id;
              const accusedName = userNames[v.userId] || 'Unknown neighbor';
              return (
                <li key={v.id} className="sbn-help-card space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-app">{VIOLATION_CATEGORY_LABEL[v.category]}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-inset text-muted">
                      {v.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    Accused: <span className="text-app font-medium">{accusedName}</span>
                    {' · '}
                    Reported by <span className="text-app font-medium">{v.reportedByName}</span>
                    {' · '}
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                  {v.sessionId && (
                    <p className="text-[10px] font-mono text-subtle break-all">Session: {v.sessionId}</p>
                  )}
                  <p className="text-sm text-app leading-snug">{v.description}</p>

                  {(v.status === 'pending_review' || v.status === 'appealed') && (
                    <textarea
                      value={reviewNotes[v.id] ?? ''}
                      onChange={(e) => setReviewNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      rows={2}
                      placeholder="Optional review note for the audit trail…"
                      className="sbn-input text-xs w-full resize-y"
                    />
                  )}

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
                        <p className="text-xs text-accent flex items-center gap-1.5">
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
        </div>
      )}
    </div>
  );
}
