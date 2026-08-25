import { X } from 'lucide-react';

export type ConfirmDialogVariant = 'default' | 'danger';

export interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** Alert mode — single OK button, no cancel. */
  alertOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  alertOnly = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClass =
    variant === 'danger'
      ? 'sbn-btn sbn-btn-danger flex-1'
      : 'sbn-btn sbn-btn-primary flex-1';

  return (
    <div
      className="fixed inset-0 z-[280] bg-black/60 flex items-end sm:items-center justify-center px-4 pt-4 sbn-mobile-prompt-offset sm:pb-4"
      onClick={onCancel}
    >
      <div
        className="sbn-card w-full max-w-md p-5 space-y-4 rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirm_dialog_title' : undefined}
        aria-describedby="confirm_dialog_message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h4 id="confirm_dialog_title" className="font-display font-bold text-app">
                {title}
              </h4>
            ) : null}
            <p
              id="confirm_dialog_message"
              className={`text-sm text-muted leading-relaxed whitespace-pre-wrap ${title ? 'mt-2' : ''}`}
            >
              {message}
            </p>
          </div>
          {!alertOnly ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-full hover:bg-inset shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          {!alertOnly ? (
            <button type="button" onClick={onCancel} className="sbn-btn sbn-btn-secondary flex-1">
              {cancelLabel}
            </button>
          ) : null}
          <button type="button" onClick={onConfirm} className={alertOnly ? `${confirmClass} w-full` : confirmClass}>
            {alertOnly ? confirmLabel || 'OK' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
