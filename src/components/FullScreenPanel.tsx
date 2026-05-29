import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface FullScreenPanelProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** When true, body is a flex column (for chat-style threads) instead of scroll-all. */
  fillBody?: boolean;
}

export default function FullScreenPanel({ title, subtitle, onClose, children, fillBody }: FullScreenPanelProps) {
  return (
    <div className="fixed inset-0 z-[70] bg-app flex flex-col font-sans" role="dialog" aria-modal="true">
      <header className="shrink-0 sbn-glass-nav px-4 py-3 flex items-center gap-3 border-b border-app">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full text-muted hover:text-app hover:bg-inset"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-base text-app truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted truncate">{subtitle}</p>}
        </div>
      </header>
      <div
        className={
          fillBody ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : 'flex-1 min-h-0 overflow-y-auto'
        }
      >
        {children}
      </div>
    </div>
  );
}
