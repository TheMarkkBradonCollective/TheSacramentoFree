import { ShieldX } from 'lucide-react';

interface NoPermissionModalProps {
  open: boolean;
  reason?: string;
  onClose: () => void;
}

export default function NoPermissionModal({ open, reason, onClose }: NoPermissionModalProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="No permission"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative sbn-card max-w-sm w-full p-6 flex flex-col items-center gap-4 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldX className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-app text-lg">No permission</h3>
          <p className="text-sm text-muted leading-snug">
            {reason || "Your role doesn't have access to this action."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="sbn-btn sbn-btn-secondary w-full justify-center"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
