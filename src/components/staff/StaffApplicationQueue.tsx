import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { UserProfile } from '../../types';
import { reviewStaffApplication } from '../../supabase';
import {
  canApproveAppliedRole,
  staffApplyRoleLabel,
  type StaffApplication,
  type StaffApplicationDecision,
} from '../../lib/staffApplications';
import UserAvatar from '../UserAvatar';
import { useUserDisplayInfo } from '../../hooks/useUserDisplayInfo';

interface StaffApplicationQueueProps {
  actor: UserProfile;
  current: StaffApplication | null;
  waiting: number;
  onViewProfile: (userId: string) => void;
  onReviewed: () => void;
}

const DECISIONS: {
  value: StaffApplicationDecision;
  label: string;
  className: string;
}[] = [
  {
    value: 'yes',
    label: 'Yes',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
  },
  {
    value: 'maybe',
    label: 'Maybe',
    className: 'bg-accent/15 text-accent border-accent/30 hover:bg-accent/25',
  },
  {
    value: 'no',
    label: 'No',
    className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25',
  },
];

export default function StaffApplicationQueue({
  actor,
  current,
  waiting,
  onViewProfile,
  onReviewed,
}: StaffApplicationQueueProps) {
  const [busy, setBusy] = useState<StaffApplicationDecision | null>(null);
  const applicantInfo = useUserDisplayInfo(current ? [current.applicantUserId] : []);
  const [err, setErr] = useState('');

  const handleDecision = async (decision: StaffApplicationDecision) => {
    if (!current) return;
    if (decision === 'yes' && !canApproveAppliedRole(actor.role, current.role)) {
      setErr('A higher rank needs to approve this seat.');
      return;
    }
    setBusy(decision);
    setErr('');
    const result = await reviewStaffApplication({ applicationId: current.id, decision });
    setBusy(null);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save that decision.');
      return;
    }
    onReviewed();
  };

  return (
    <div className="sbn-card rounded-xl border border-app p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">
            Staff applications
          </p>
          <p className="text-sm font-semibold text-app mt-0.5">One request at a time</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent">
          <Clock className="w-3 h-3" />
          {current ? (waiting > 0 ? `${waiting} more waiting` : 'Up now') : 'None'}
        </span>
      </div>

      {!current ? (
        <p className="text-xs text-muted">No applications waiting.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onViewProfile(current.applicantUserId)} className="shrink-0">
              <UserAvatar
                uid={current.applicantUserId}
                src={applicantInfo[current.applicantUserId]?.photoURL}
                name={current.applicantName}
                size="sm"
              />
            </button>
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => onViewProfile(current.applicantUserId)}
                className="font-semibold text-sm text-app hover:text-accent"
              >
                {current.applicantName}
              </button>
              <p className="text-xs text-muted truncate">
                {current.neighborhood || 'Sacramento'}
                {current.applicantEmail ? ` · ${current.applicantEmail}` : ''}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-inset border border-app px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Applying for</p>
            <p className="text-sm font-semibold text-app">{staffApplyRoleLabel(current.role)}</p>
          </div>

          <Field label="Why this role" value={current.statement} />
          <Field label="Responding" value={current.responseTime} />
          <Field label="Mod of other groups" value={current.otherGroups || '—'} />
          {current.otherInfo ? <Field label="Other info" value={current.otherInfo} /> : null}

          <p className="text-[10px] text-subtle">
            Submitted {new Date(current.createdAt).toLocaleString()}
          </p>

          {err ? <p className="text-xs font-semibold text-red-400">{err}</p> : null}

          <div className="grid grid-cols-3 gap-2">
            {DECISIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!!busy}
                title={
                  option.value === 'yes' && !canApproveAppliedRole(actor.role, current.role)
                    ? 'A higher rank needs to approve this seat'
                    : undefined
                }
                onClick={() => void handleDecision(option.value)}
                className={`sbn-btn sbn-btn-sm justify-center border font-bold ${option.className}`}
              >
                {busy === option.value ? '…' : option.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-subtle leading-relaxed">
            Yes, Maybe, and No all notify them. Yes adds them to the team. Maybe lets them apply
            again. No blocks applying for every staff role.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="text-sm text-app leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}
