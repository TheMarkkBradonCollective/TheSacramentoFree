import { useState } from 'react';
import { X } from 'lucide-react';
import TermsOfUseContent from './TermsOfUseContent';
import { TERMS } from '../siteContent';
import { acceptTerms } from '../lib/termsPolicyPrompt';

interface TermsOfUseModalProps {
  userId: string;
  /** When true, user must accept before continuing. No dismiss without accepting. */
  required?: boolean;
  onAccepted?: () => void;
  onClose?: () => void;
}

export default function TermsOfUseModal({
  userId,
  required = false,
  onAccepted,
  onClose,
}: TermsOfUseModalProps) {
  const [checked, setChecked] = useState(false);

  const handleAccept = () => {
    if (!checked) return;
    acceptTerms(userId);
    onAccepted?.();
    if (!required) onClose?.();
  };

  const handleBackdrop = () => {
    if (!required) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[131] bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        className="sbn-card w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms_of_use_title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-app shrink-0">
          <h4 id="terms_of_use_title" className="font-display font-bold text-app">
            {TERMS.shortTitle}
          </h4>
          {!required && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors"
              aria-label="Close terms of use"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <TermsOfUseContent compact />
        </div>

        <div className="p-5 border-t border-app space-y-4 shrink-0 bg-surface">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-app accent-accent"
            />
            <span className="text-xs text-muted font-semibold leading-relaxed">{TERMS.acceptLabel}</span>
          </label>
          <button
            type="button"
            disabled={!checked}
            onClick={handleAccept}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {TERMS.acceptButton}
          </button>
          {required ? (
            <p className="text-[10px] text-subtle text-center font-semibold">{TERMS.viewAgainNote}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
