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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-app text-accent bg-inset hover:bg-surface-hover active:scale-[0.98] transition-all cursor-pointer ${
        glow ? 'sbn-header-action-btn-glow border-accent/40' : ''
      } ${className}`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline text-[10px] font-bold tracking-wide">{label}</span>
    </button>
  );
}
