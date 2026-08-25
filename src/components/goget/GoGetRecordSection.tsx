import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, XCircle } from 'lucide-react';
import type { UserProfile, UserViolation } from '../../types';
import { appealGoGetViolation, getViolationsForUser, VIOLATION_LOCK_THRESHOLD } from '../../lib/violations';

interface GoGetRecordSectionProps {
  userProfile: UserProfile;
  className?: string;
}

const CATEGORY_LABEL: Record<UserViolation['category'], string> = {
  no_show: 'No-show',
  false_claim: 'False claim',
  unsafe_behavior: 'Unsafe behavior',
  other: 'Other',
};

function statusPill(status: UserViolation['status']): { label: string; className: string } {
  switch (status) {
    case 'pending_review':
      return { label: 'Under review', className: 'bg-accent/15 text-accent' };
    case 'confirmed':
      return { label: 'Confirmed — counts as a strike', className: 'bg-red-500/15 text-red-400' };
    case 'dismissed':
      return { label: 'Dismissed', className: 'bg-emerald-500/10 text-emerald-500' };
    case 'appealed':
      return { label: 'Appeal pending', className: 'bg-sky-500/15 text-sky-400' };
    case 'appeal_upheld':
      return { label: 'Appeal granted — overturned', className: 'bg-emerald-500/10 text-emerald-500' };
    case 'appeal_denied':
      return { label: 'Appeal denied — counts as a strike', className: 'bg-red-500/15 text-red-400' };
    default:
      return { label: status, className: 'bg-inset text-muted' };
  }
}

function AppealForm({ violation, onSubmitted }: { violation: UserViolation; onSubmitted: (updated: UserViolation) => void }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) {
      setErr('Explain why you are appealing this.');
      return;
    }
    setSubmitting(true);
    setErr('');
    const result = await appealGoGetViolation({ violation, actorUserId: violation.userId, appealText: text });
    setSubmitting(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not submit appeal.');
      return;
    }
    onSubmitted({ ...violation, status: 'appealed', countsTowardStrikes: false, appealText: text, appealedAt: new Date().toISOString() });
  };

  return (
    <div className="mt-2 space-y-2">
      {err && <p className="text-[11px] font-semibold text-red-400">{err}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explain why this shouldn't count against your account…"
        className="sbn-input text-xs min-h-[4.5rem]"
        maxLength={800}
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="sbn-btn sbn-btn-secondary sbn-btn-sm disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Appeal to a city administrator'}
      </button>
    </div>
  );
}

export default function GoGetRecordSection({ userProfile, className = '' }: GoGetRecordSectionProps) {
  const [violations, setViolations] = useState<UserViolation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getViolationsForUser(userProfile.uid).then((rows) => {
      if (!cancelled) {
        setViolations(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userProfile.uid]);

  const strikeCount = violations.filter((v) => v.countsTowardStrikes).length;

  if (loading) return null;
  if (violations.length === 0) return null;

  return (
    <div className={className} id="go_get_record_section">
      <h3 className="text-sm font-bold text-app uppercase tracking-wider mb-2 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-accent" />
        Go Get record
      </h3>
      <p className="text-xs text-muted leading-relaxed mb-3">
        Strikes: <strong className="text-app">{strikeCount}/{VIOLATION_LOCK_THRESHOLD}</strong>
        {' · '}
        6 confirmed strikes automatically locks your account until a city administrator reviews it.
      </p>

      <ul className="space-y-2">
        {violations.map((v) => {
          const pill = statusPill(v.status);
          const canAppeal = v.status === 'confirmed';
          return (
            <li key={v.id} className="sbn-help-card space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-app">{CATEGORY_LABEL[v.category]}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${pill.className}`}>
                  {pill.label}
                </span>
              </div>
              <p className="text-[11px] text-muted">{new Date(v.createdAt).toLocaleDateString()}</p>
              {v.reviewNote && <p className="text-xs text-app leading-snug">Moderator note: {v.reviewNote}</p>}
              {v.appealDecisionNote && (
                <p className="text-xs text-app leading-snug">Administrator note: {v.appealDecisionNote}</p>
              )}
              {canAppeal && <AppealForm violation={v} onSubmitted={(updated) => setViolations((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))} />}
              {v.status === 'appealed' && (
                <p className="text-[11px] text-sky-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Waiting on a city administrator's decision.
                </p>
              )}
              {v.status === 'appeal_upheld' && (
                <p className="text-[11px] text-emerald-500 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Overturned — does not count as a strike.
                </p>
              )}
              {v.status === 'appeal_denied' && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Appeal denied — this counts as a strike.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
