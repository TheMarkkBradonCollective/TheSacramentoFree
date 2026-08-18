import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import type { UserProfile } from '../types';
import {
  getMyStaffApplyState,
  submitStaffApplication,
} from '../supabase';
import {
  RESPONSE_TIME_OPTIONS,
  STAFF_APPLY_ROLES,
  STAFF_ROLE_APPLY_COPY,
  applicantApplyView,
  firstOpenStaffApplyRole,
  isStaffApplySeatFilled,
  staffApplyRoleLabel,
  staffApplySeatLabel,
  staffApplicationDecisionNotice,
  type StaffApplication,
  type StaffApplyRole,
  type StaffApplySeatCounts,
} from '../lib/staffApplications';

interface StaffApplyViewProps {
  user: UserProfile;
}

export default function StaffApplyView({ user }: StaffApplyViewProps) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState<StaffApplication | null>(null);
  const [lastDecision, setLastDecision] = useState<StaffApplication | null>(null);
  const [seatCounts, setSeatCounts] = useState<StaffApplySeatCounts>({});
  const [role, setRole] = useState<StaffApplyRole>('city_moderator');
  const [statement, setStatement] = useState('');
  const [responseTime, setResponseTime] = useState<(typeof RESPONSE_TIME_OPTIONS)[number]>(
    RESPONSE_TIME_OPTIONS[1],
  );
  const [modElsewhere, setModElsewhere] = useState(false);
  const [otherGroups, setOtherGroups] = useState('');
  const [otherInfo, setOtherInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    const state = await getMyStaffApplyState();
    setBlocked(state.blocked);
    setPending(state.pending);
    setLastDecision(state.lastDecision);
    setSeatCounts(state.seatCounts);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [user.uid]);

  useEffect(() => {
    if (loading) return;
    if (isStaffApplySeatFilled(role, seatCounts)) {
      const openRole = firstOpenStaffApplyRole(seatCounts);
      if (openRole) setRole(openRole);
    }
  }, [loading, role, seatCounts]);

  const view = useMemo(
    () =>
      applicantApplyView({
        role: user.role,
        blocked,
        pending,
      }),
    [blocked, pending, user.role],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (isStaffApplySeatFilled(role, seatCounts)) {
      setErr('That staff seat is filled. Pick another role.');
      return;
    }
    if (!statement.trim()) {
      setErr('Tell us why you want this role.');
      return;
    }
    setBusy(true);
    const result = await submitStaffApplication({
      role,
      statement: statement.trim(),
      responseTime,
      otherGroups: modElsewhere
        ? otherGroups.trim() || 'Yes — mod or admin of other groups'
        : otherGroups.trim() || 'No',
      otherInfo: otherInfo.trim(),
      seatCounts,
    });
    setBusy(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not send application.');
      return;
    }
    setPending(result.application ?? null);
    setStatement('');
    setOtherGroups('');
    setOtherInfo('');
    setModElsewhere(false);
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (view.kind === 'staff') {
    const yesNotice =
      lastDecision?.status === 'yes' ? staffApplicationDecisionNotice(lastDecision) : null;
    return (
      <div className="sbn-help-card space-y-2">
        <h3 className="font-display font-bold text-app">
          {yesNotice?.title || "You're on the staff team"}
        </h3>
        <p className="text-sm text-muted leading-relaxed">
          {yesNotice?.body || 'Role changes happen from Team management.'}
        </p>
      </div>
    );
  }

  if (view.kind === 'blocked') {
    const noNotice = lastDecision?.status === 'no' ? staffApplicationDecisionNotice(lastDecision) : null;
    return (
      <div className="sbn-help-card space-y-2">
        <h3 className="font-display font-bold text-app">{noNotice?.title || "Applications aren't open"}</h3>
        <p className="text-sm text-muted leading-relaxed">
          {noNotice?.body || "This account can't apply for staff roles right now."}
        </p>
      </div>
    );
  }

  if (view.kind === 'pending' && view.application) {
    return (
      <div className="sbn-help-card space-y-3">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display font-bold text-app">Application is in</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              You applied for {staffApplyRoleLabel(view.application.role)}. Staff will take it from
              here — you'll get a notification either way, and you can only have one request waiting
              at a time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maybeNotice =
    lastDecision?.status === 'maybe' ? staffApplicationDecisionNotice(lastDecision) : null;
  const openRole = firstOpenStaffApplyRole(seatCounts);
  const allSeatsFilled = !openRole;
  const selectedSeatFilled = isStaffApplySeatFilled(role, seatCounts);

  return (
    <div className="space-y-6">
      {maybeNotice ? (
        <div className="sbn-help-card space-y-1 border-amber-500/30">
          <h3 className="font-display font-bold text-app">{maybeNotice.title}</h3>
          <p className="text-sm text-muted leading-relaxed">{maybeNotice.body}</p>
        </div>
      ) : null}
      {allSeatsFilled ? (
        <div className="sbn-help-card space-y-2">
          <h3 className="font-display font-bold text-app">All staff seats are filled</h3>
          <p className="text-sm text-muted leading-relaxed">
            Every role is full right now. Check back later if a seat opens up.
          </p>
        </div>
      ) : (
        <>
      <p className="text-sm text-muted leading-relaxed">
        Sacramento Buy Nothing is neighbor-run. Pick one role, tell us how you'd show up, and send it.
        Only one application can wait at a time.
      </p>

      <div className="space-y-3">
        {STAFF_APPLY_ROLES.map((applyRole) => {
          const copy = STAFF_ROLE_APPLY_COPY[applyRole];
          const selected = role === applyRole;
          const seatFilled = isStaffApplySeatFilled(applyRole, seatCounts);
          return (
            <button
              key={applyRole}
              type="button"
              onClick={() => {
                if (!seatFilled) setRole(applyRole);
              }}
              disabled={seatFilled}
              className={`w-full text-left rounded-xl border p-4 space-y-2 transition-colors ${
                seatFilled
                  ? 'border-app bg-inset opacity-70 cursor-not-allowed'
                  : selected
                    ? 'border-accent bg-accent/10'
                    : 'border-app bg-surface hover:border-accent/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={`font-display font-bold ${seatFilled ? 'text-muted' : 'text-app'}`}>
                  {staffApplyRoleLabel(applyRole)}
                </p>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    seatFilled ? 'text-amber-400' : 'text-muted'
                  }`}
                >
                  {staffApplySeatLabel(applyRole, seatCounts)}
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed">{copy.summary}</p>
              {!seatFilled ? (
              <ul className="space-y-1">
                {copy.duties.map((duty) => (
                  <li key={duty} className="text-xs text-app leading-relaxed flex gap-2">
                    <span className="text-accent shrink-0">•</span>
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
              ) : null}
            </button>
          );
        })}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted">Why this role?</span>
          <textarea
            className="sbn-input text-sm min-h-[6rem]"
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            maxLength={2000}
            placeholder="How you'd help neighbors, and why this seat."
            disabled={busy}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted">How fast can you respond?</span>
          <select
            className="sbn-input text-sm"
            value={responseTime}
            onChange={(e) => setResponseTime(e.target.value as (typeof RESPONSE_TIME_OPTIONS)[number])}
            disabled={busy}
          >
            {RESPONSE_TIME_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 text-sm text-app">
          <input
            type="checkbox"
            className="mt-1"
            checked={modElsewhere}
            onChange={(e) => setModElsewhere(e.target.checked)}
            disabled={busy}
          />
          <span>I've been a mod or admin of other groups</span>
        </label>

        {modElsewhere ? (
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Which groups?</span>
            <textarea
              className="sbn-input text-sm min-h-[4rem]"
              value={otherGroups}
              onChange={(e) => setOtherGroups(e.target.value)}
              maxLength={1000}
              placeholder="Buy Nothing groups, Facebook, Discord, neighborhood pages…"
              disabled={busy}
            />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted">Anything else?</span>
          <textarea
            className="sbn-input text-sm min-h-[4rem]"
            value={otherInfo}
            onChange={(e) => setOtherInfo(e.target.value)}
            maxLength={2000}
            placeholder="Hours you keep, languages, neighborhood ties, anything we should know."
            disabled={busy}
          />
        </label>

        {err ? <p className="text-xs font-semibold text-red-400">{err}</p> : null}

        <button
          type="submit"
          disabled={busy || selectedSeatFilled || allSeatsFilled}
          className="sbn-btn sbn-btn-primary w-full justify-center"
        >
          <CheckCircle className="w-4 h-4" />
          {busy ? 'Sending…' : `Apply for ${staffApplyRoleLabel(role)}`}
        </button>
      </form>
        </>
      )}
    </div>
  );
}
