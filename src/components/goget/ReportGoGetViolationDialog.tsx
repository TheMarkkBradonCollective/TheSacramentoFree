import { useState } from 'react';
import { X } from 'lucide-react';
import type { ViolationCategory } from '../../types';

interface ReportGoGetViolationDialogProps {
  open: boolean;
  targetName: string;
  onClose: () => void;
  onSubmit: (params: { category: ViolationCategory; description: string }) => Promise<void> | void;
}

const CATEGORY_OPTIONS: { value: ViolationCategory; label: string }[] = [
  { value: 'no_show', label: 'No-show — never showed up / never came out' },
  { value: 'false_claim', label: "False claim — said it was picked up but wasn't (or wasn't dropped off)" },
  { value: 'unsafe_behavior', label: 'Unsafe or disrespectful behavior' },
  { value: 'other', label: 'Something else' },
];

export default function ReportGoGetViolationDialog({
  open,
  targetName,
  onClose,
  onSubmit,
}: ReportGoGetViolationDialogProps) {
  const [category, setCategory] = useState<ViolationCategory>('no_show');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!description.trim()) {
      setErr('Describe what happened.');
      return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await onSubmit({ category, description: description.trim() });
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
            <h4 className="font-display font-bold text-app">Report a problem</h4>
            <p className="text-xs text-muted mt-1">
              Report an issue with {targetName} from this Go Get. City moderators review every report before
              anything counts against their account.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-inset shrink-0" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {err && <p className="text-xs font-semibold text-red-400">{err}</p>}

        <div className="space-y-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                category === opt.value ? 'border-accent bg-accent-soft' : 'border-app hover:bg-inset'
              }`}
            >
              <input
                type="radio"
                name="violation_category"
                checked={category === opt.value}
                onChange={() => setCategory(opt.value)}
                className="mt-0.5"
              />
              <span className="text-xs font-semibold text-app leading-snug">{opt.label}</span>
            </label>
          ))}
        </div>

        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted">What happened?</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sbn-input text-sm min-h-[6rem]"
            placeholder="Give moderators enough detail to review this fairly."
            maxLength={1000}
          />
        </label>

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="sbn-btn sbn-btn-primary flex-1 disabled:opacity-60"
          >
            {submitting ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  );
}
