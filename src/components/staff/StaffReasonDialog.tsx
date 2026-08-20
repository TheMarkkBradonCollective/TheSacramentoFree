import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface StaffReasonDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  placeholder?: string;
  requireReason?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
}

export default function StaffReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  placeholder = 'Reason for this action…',
  requireReason = true,
  onClose,
  onSubmit,
}: StaffReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setErr('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (requireReason && !reason.trim()) {
      setErr('A reason is required.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
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
        className="sbn-card w-full max-w-md p-5 space-y-4 rounded-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="font-display font-bold text-app">{title}</h4>
            <p className="text-xs text-muted mt-1">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-inset shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="sbn-input text-xs w-full resize-y min-h-[80px]"
        />

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1 justify-center">
            Back
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="sbn-btn sbn-btn-primary flex-1 justify-center disabled:opacity-60"
          >
            {submitting ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
