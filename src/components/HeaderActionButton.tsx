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
      className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl border-2 border-accent/25 text-accent bg-accent-soft/30 hover:bg-accent-soft hover:scale-105 active:scale-95 transition-all cursor-pointer ${
        glow ? 'sbn-header-action-btn-glow' : ''
      } ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );
}
