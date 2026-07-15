import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { UserProfile, UserViolation } from '../../types';
import { roleRank } from '../../lib/roles';
import {
  decideGoGetViolationAppeal,
  getAllViolationsForStaff,
  reviewGoGetViolation,
} from '../../lib/violations';
import { debounceRealtime, subscribePostgresChanges } from '../../lib/supabaseRealtime';

const VIOLATION_CATEGORY_LABEL: Record<UserViolation['category'], string> = {
  no_show: 'No-show',
  false_claim: 'False claim',
  unsafe_behavior: 'Unsafe behavior',
  other: 'Other',
};

interface StaffViolationsViewProps {
  actor: UserProfile;
}

export default function StaffViolationsView({ actor }: StaffViolationsViewProps) {
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [violationBusyId, setViolationBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const canDecideAppeals = roleRank(actor.role) >= roleRank('city_administrator');
  const openCount = violations.filter((v) => v.status === 'pending_review' || v.status === 'appealed').length;

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const rows = await getAllViolationsForStaff();
    setViolations(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const refresh = debounceRealtime(() => void load(), 100);
    const unsub = subscribePostgresChanges(
      { channelName: 'staff-live-violations', table: 'user_violations', event: '*' },
      refresh,
    );
    return () => unsub();
  }, [load]);

  const handleReviewViolation = async (violation: UserViolation, decision: 'confirm' | 'dismiss') => {
    setViolationBusyId(violation.id);
    setErr('');
    setMsg('');
    const result = await reviewGoGetViolation({ violation, actor, decision });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'confirm' ? 'Violation confirmed.' : 'Report dismissed.');
      await load();
    } else {
      setErr(result.errorMessage || 'Could not review this report.');
    }
  };

  const handleDecideAppeal = async (violation: UserViolation, decision: 'uphold' | 'deny') => {
    setViolationBusyId(violation.id);
    setErr('');
    setMsg('');
    const result = await decideGoGetViolationAppeal({ violation, actor, decision });
    setViolationBusyId(null);
    if (result.ok) {
      setMsg(decision === 'uphold' ? 'Appeal granted — overturned.' : 'Appeal denied.');
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
        {msg && <p className="text-xs font-semibold text-emerald-500">{msg}</p>}
        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : violations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted">No Go Get violation reports yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
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
        </div>
      )}
    </div>
  );
}
