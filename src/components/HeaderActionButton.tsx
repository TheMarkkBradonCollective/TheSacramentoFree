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
}: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      id={id}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 rounded-lg text-accent transition-all cursor-pointer active:scale-[0.98] ${
        compact
          ? 'p-2 text-muted hover:text-app hover:bg-inset'
          : 'px-2.5 py-1.5 border border-app bg-inset hover:bg-surface-hover'
      } ${glow ? 'sbn-header-action-btn-glow border-accent/40' : ''} ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );
}
