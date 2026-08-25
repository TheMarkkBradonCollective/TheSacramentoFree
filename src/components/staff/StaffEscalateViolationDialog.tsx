import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { GoGetSession, ViolationCategory } from '../../types';
import {
  suggestAccusedUserForSession,
  suggestViolationCategoryForSession,
  type StaffSessionCloseAction,
} from '../../lib/violations';

const CATEGORY_OPTIONS: { value: ViolationCategory; label: string }[] = [
  { value: 'no_show', label: 'No-show' },
  { value: 'false_claim', label: 'False claim' },
  { value: 'unsafe_behavior', label: 'Unsafe behavior' },
  { value: 'other', label: 'Other' },
];

const CLOSE_ACTION_OPTIONS: { value: StaffSessionCloseAction; label: string; hint: string }[] = [
  { value: 'cancel', label: 'Cancel session', hint: 'End the pickup and notify both neighbors' },
  { value: 'expire', label: 'Expire session', hint: 'Mark stale / abandoned without a normal cancel' },
  { value: 'dispute', label: 'Mark disputed', hint: 'Flag a handoff disagreement for review' },
  { value: 'complete', label: 'Mark complete', hint: 'Only when the picker has arrived' },
  { value: 'none', label: 'Leave session as-is', hint: 'File the violation without changing session status' },
];

interface StaffEscalateViolationDialogProps {
  open: boolean;
  session: GoGetSession;
  onClose: () => void;
  onSubmit: (params: {
    accusedUserId: string;
    accusedName: string;
    category: ViolationCategory;
    description: string;
    closeAction: StaffSessionCloseAction;
    closeReason?: string;
  }) => Promise<void> | void;
}

export default function StaffEscalateViolationDialog({
  open,
  session,
  onClose,
  onSubmit,
}: StaffEscalateViolationDialogProps) {
  const suggestedAccused = suggestAccusedUserForSession(session);
  const [accusedUserId, setAccusedUserId] = useState(suggestedAccused.userId);
  const [category, setCategory] = useState<ViolationCategory>(suggestViolationCategoryForSession(session));
  const [description, setDescription] = useState('');
  const [closeAction, setCloseAction] = useState<StaffSessionCloseAction>('cancel');
  const [closeReason, setCloseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    const accused = suggestAccusedUserForSession(session);
    setAccusedUserId(accused.userId);
    setCategory(suggestViolationCategoryForSession(session));
    setDescription('');
    setCloseAction(session.status === 'arrived' ? 'dispute' : 'cancel');
    setCloseReason('');
    setErr('');
  }, [open, session]);

  if (!open) return null;

  const accusedName =
    accusedUserId === session.requesterUserId ? session.requesterName : session.fulfillerName;

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErr('Describe what happened and why you are escalating.');
      return;
    }
    if (closeAction !== 'none' && closeAction !== 'complete' && !closeReason.trim()) {
      setErr('Add a short reason for closing the session.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await onSubmit({
        accusedUserId,
        accusedName,
        category,
        description: description.trim(),
        closeAction,
        closeReason: closeReason.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center justify-center px-4 pt-4 sbn-mobile-prompt-offset sm:pb-4"
      onClick={onClose}
    >
      <div
        className="sbn-card w-full max-w-lg p-5 space-y-4 rounded-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display font-bold text-app flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              Escalate to violation
            </h4>
            <p className="text-xs text-muted mt-1">
              Close this session if needed, then send a violation report to the Go Get review queue.
              Another moderator will confirm before it counts as a strike.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-inset shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">Accused neighbor</p>
          <div className="grid grid-cols-2 gap-2">
            <label className={`flex flex-col gap-1 p-2.5 rounded-xl border cursor-pointer ${accusedUserId === session.requesterUserId ? 'border-accent bg-accent-soft' : 'border-app hover:bg-inset'}`}>
              <input type="radio" className="sr-only" checked={accusedUserId === session.requesterUserId} onChange={() => setAccusedUserId(session.requesterUserId)} />
              <span className="text-xs font-semibold text-app">{session.requesterName}</span>
              <span className="text-[10px] text-muted">Picker</span>
            </label>
            <label className={`flex flex-col gap-1 p-2.5 rounded-xl border cursor-pointer ${accusedUserId === session.fulfillerUserId ? 'border-accent bg-accent-soft' : 'border-app hover:bg-inset'}`}>
              <input type="radio" className="sr-only" checked={accusedUserId === session.fulfillerUserId} onChange={() => setAccusedUserId(session.fulfillerUserId)} />
              <span className="text-xs font-semibold text-app">{session.fulfillerName}</span>
              <span className="text-[10px] text-muted">Poster</span>
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">Close session</p>
          <select value={closeAction} onChange={(e) => setCloseAction(e.target.value as StaffSessionCloseAction)} className="sbn-input text-xs w-full">
            {CLOSE_ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === 'complete' && session.status !== 'arrived'}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-subtle">
            {CLOSE_ACTION_OPTIONS.find((opt) => opt.value === closeAction)?.hint}
          </p>
          {closeAction !== 'none' && (
            <input
              type="text"
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Reason shown in the session chat"
              className="sbn-input text-xs w-full"
            />
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">Violation category</p>
          <select value={category} onChange={(e) => setCategory(e.target.value as ViolationCategory)} className="sbn-input text-xs w-full">
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted font-mono">Staff notes</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder={`What went wrong with ${accusedName}? Include timeline, GPS trail notes, and outreach attempts.`}
            className="sbn-input text-xs w-full resize-y min-h-[96px]"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1 justify-center">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="sbn-btn sbn-btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Close & escalate'}
          </button>
        </div>
      </div>
    </div>
  );
}
