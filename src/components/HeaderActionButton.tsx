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
}: HeaderActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      id={id}
      title={title}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl border-2 border-accent/25 text-accent bg-accent-soft/30 hover:bg-accent-soft hover:scale-105 active:scale-95 transition-all cursor-pointer relative ${
        glow ? 'sbn-header-action-btn-glow' : ''
      } ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">{label}</span>
      {glow ? (
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-surface sbn-header-action-btn-dot"
          aria-hidden
        />
      ) : null}
    </button>
  );
}
