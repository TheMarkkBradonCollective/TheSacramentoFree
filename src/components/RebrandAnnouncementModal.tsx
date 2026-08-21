import { X } from 'lucide-react';
import {
  REBRAND_ANNOUNCEMENT_LETTER,
  REBRAND_ANNOUNCEMENT_TITLE,
} from '../../shared/rebrandAnnouncement2026';

interface RebrandAnnouncementModalProps {
  onDismiss: () => void;
  onOpenNews?: () => void;
}

export default function RebrandAnnouncementModal({ onDismiss, onOpenNews }: RebrandAnnouncementModalProps) {
  return (
    <div
      className="fixed inset-0 z-[130] bg-black/65 flex items-end sm:items-center justify-center p-3 sm:p-4"
      onClick={onDismiss}
    >
      <div
        className="sbn-card w-full max-w-lg max-h-[min(90dvh,42rem)] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rebrand_letter_title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-app shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">From Mark · News</p>
            <h2 id="rebrand_letter_title" className="mt-1 font-display font-bold text-app text-lg leading-snug">
              {REBRAND_ANNOUNCEMENT_TITLE}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-muted hover:text-app hover:bg-inset transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto min-h-0">
          <div className="text-sm text-app leading-relaxed whitespace-pre-wrap font-serif">{REBRAND_ANNOUNCEMENT_LETTER}</div>
        </div>

        <div className="p-4 sm:p-5 border-t border-app flex flex-col-reverse sm:flex-row sm:justify-end gap-2 shrink-0">
          {onOpenNews ? (
            <button type="button" onClick={onOpenNews} className="sbn-btn sbn-btn-secondary sbn-btn-sm">
              Open News tab
            </button>
          ) : null}
          <button type="button" onClick={onDismiss} className="sbn-btn sbn-btn-primary sbn-btn-sm">
            Got it — thanks Mark
          </button>
        </div>
      </div>
    </div>
  );
}
