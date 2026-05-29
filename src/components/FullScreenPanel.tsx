import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface FullScreenPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Chat-style body — child fills remaining height (no outer scroll). */
  fillBody?: boolean;
  /** Stack above another panel (e.g. edit profile over directory). */
  nested?: boolean;
  /** Wider content column for staff lists and directory. */
  wide?: boolean;
}

export default function FullScreenPanel({
  title,
  subtitle,
  onClose,
  children,
  fillBody = false,
  nested = false,
  wide = false,
}: FullScreenPanelProps) {
  const contentMax = wide ? 'max-w-4xl' : 'max-w-2xl';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const panel = (
    <div
      className={`fixed inset-0 ${nested ? 'z-[95]' : 'z-[90]'} bg-app flex flex-col font-sans`}
      role="dialog"
      aria-modal="true"
    >
      <header className="shrink-0 sbn-glass-nav border-b border-app sbn-safe-top">
        <div className="max-w-6xl mx-auto px-4 min-h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="sbn-back-btn !mb-0 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-base sm:text-lg text-app truncate">{title}</h2>
            {subtitle && <p className="text-xs text-muted truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </header>

      {fillBody ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className={`flex-1 min-h-0 flex flex-col overflow-hidden w-full mx-auto ${contentMax}`}>
            {children}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto sbn-safe-bottom">
          <div className={`mx-auto w-full px-4 py-5 pb-10 ${contentMax}`}>{children}</div>
        </div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
