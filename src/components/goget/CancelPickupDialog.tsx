import { useState } from 'react';
import { X } from 'lucide-react';

const REASONS = [
  { id: 'plans', label: 'Plans changed' },
  { id: 'cant', label: "Can't make it" },
  { id: 'unavailable', label: 'Item no longer available' },
  { id: 'unsafe', label: 'Unsafe or wrong location' },
  { id: 'other', label: 'Other' },
] as const;

interface CancelPickupDialogProps {
  open: boolean;
  otherName: string;
  requireReason: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export default function CancelPickupDialog({
  open,
  otherName,
  requireReason,
  busy = false,
  onClose,
  onConfirm,
}: CancelPickupDialogProps) {
  const [reasonId, setReasonId] = useState<(typeof REASONS)[number]['id']>('plans');
  const [details, setDetails] = useState('');
  const [err, setErr] = useState('');

  if (!open) return null;

  const handleConfirm = () => {
    if (!requireReason) {
      onConfirm(details.trim());
      return;
    }
    const selected = REASONS.find((row) => row.id === reasonId)?.label ?? 'Cancelled';
    const extra = details.trim();
    const reason = reasonId === 'other' ? extra : extra ? `${selected}: ${extra}` : selected;
    if (!reason) {
      setErr('Choose a reason so your neighbor knows what happened.');
      return;
    }
    if (reasonId === 'other' && !extra) {
      setErr('Add a short note.');
      return;
    }
    setErr('');
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-[280] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="sbn-card w-full max-w-md p-5 space-y-4 rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel_pickup_title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 id="cancel_pickup_title" className="font-display font-bold text-app">
              Cancel Meet
            </h4>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              {requireReason
                ? `Are you sure? ${otherName} will be notified and this Meet will end.`
                : `Cancel this Meet with ${otherName}? They'll be notified.`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-inset shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {requireReason ? (
          <div className="space-y-2">
            {REASONS.map((row) => (
              <label
                key={row.id}
                className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                  reasonId === row.id ? 'border-accent bg-accent-soft' : 'border-app hover:bg-inset'
                }`}
              >
                <input
                  type="radio"
                  name="cancel_pickup_reason"
                  checked={reasonId === row.id}
                  onChange={() => setReasonId(row.id)}
                  className="mt-0.5"
                />
                <span className="text-sm text-app">{row.label}</span>
              </label>
            ))}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="sbn-input w-full text-sm"
              placeholder={reasonId === 'other' ? 'What happened?' : 'Optional note'}
            />
          </div>
        ) : null}

        {err ? (
          <p className="text-xs font-semibold text-red-400" role="alert">
            {err}
          </p>
        ) : null}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
            Keep Meet
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="sbn-btn sbn-btn-danger flex-1 disabled:opacity-60"
          >
            Cancel Meet
          </button>
        </div>
      </div>
    </div>
  );
}
