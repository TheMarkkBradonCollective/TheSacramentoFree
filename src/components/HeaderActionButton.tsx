import type { LucideIcon } from 'lucide-react';

interface HeaderActionButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  glow?: boolean;
  title: string;
  ariaLabel: string;
  id: string;
  className?: string;
  compact?: boolean;
  /** Icon-only ghost style — no border/background box. */
  unboxed?: boolean;
}

export default function HeaderActionButton({
  onClick,
  icon: Icon,
  label,
  glow = false,
  title,
  ariaLabel,
  id,
  className = '',
  compact = false,
  unboxed = false,
}: HeaderActionButtonProps) {
  const ghostClass =
    'p-2 text-muted hover:text-app hover:bg-inset active:scale-[0.98]';
  const boxedClass =
    'px-2.5 py-1.5 border border-app bg-inset hover:bg-surface-hover active:scale-[0.98]';

  return (
    <button
      type="button"
      onClick={onClick}
      id={id}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-lg text-accent transition-all cursor-pointer ${
        unboxed || compact ? ghostClass : boxedClass
      } ${glow ? 'sbn-header-action-btn-glow border-accent/40' : ''} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );
}
