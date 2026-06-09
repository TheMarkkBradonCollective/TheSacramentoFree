import type { ReactNode } from 'react';

interface HorizontalSnapRowProps {
  children: ReactNode;
  /** Screen-reader label for the swipe row */
  label: string;
  className?: string;
}

export default function HorizontalSnapRow({ children, label, className = '' }: HorizontalSnapRowProps) {
  return (
    <div className={className}>
      <p className="text-[11px] text-muted font-semibold mb-2">Swipe left or right</p>
      <div
        role="region"
        aria-label={label}
        className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1 px-1 pb-1"
      >
        {children}
      </div>
    </div>
  );
}

export function SnapSlide({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`snap-center shrink-0 w-[min(100%,22rem)] sm:w-[min(85%,24rem)] ${className}`}>
      {children}
    </div>
  );
}
