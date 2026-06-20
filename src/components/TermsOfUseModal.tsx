import { X } from 'lucide-react';
import TermsOfUseContent from './TermsOfUseContent';
import { TERMS } from '../siteContent';

interface TermsOfUseModalProps {
  onClose: () => void;
}

export default function TermsOfUseModal({ onClose }: TermsOfUseModalProps) {
  return (
    <div
      className="fixed inset-0 z-[130] bg-black/70 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
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
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors"
            aria-label="Close terms of use"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <TermsOfUseContent compact />
        </div>

        <div className="p-5 border-t border-app shrink-0 bg-surface">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-on-accent text-xs font-black uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
