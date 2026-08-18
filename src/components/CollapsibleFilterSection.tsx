import { useState, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

interface CollapsibleFilterSectionProps {
  id: string;
  title: string;
  activeCount?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleFilterSection({
  id,
  title,
  activeCount = 0,
  defaultOpen = false,
  children,
}: CollapsibleFilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-app pt-3">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-app bg-inset px-4 py-3 text-left hover:border-accent/40 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <SlidersHorizontal className="w-4 h-4 text-accent shrink-0" aria-hidden />
          <span className="text-sm font-semibold text-app">{title}</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full shrink-0">
              {activeCount} active
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}
