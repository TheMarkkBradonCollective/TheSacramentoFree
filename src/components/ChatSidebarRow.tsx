import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function chatSidebarRowClass(isSelected: boolean): string {
  return [
    'w-full text-left p-3 mx-1.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer',
    isSelected
      ? 'bg-accent-soft ring-1 ring-accent/25 shadow-sm'
      : 'hover:bg-surface-hover',
  ].join(' ');
}

interface ChatSidebarRowProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  subtitle: string;
  preview: string;
  selected?: boolean;
  onClick: () => void;
  id?: string;
  trailing?: ReactNode;
}

export default function ChatSidebarRow({
  icon: Icon,
  iconClassName,
  title,
  subtitle,
  preview,
  selected = false,
  onClick,
  id,
  trailing,
}: ChatSidebarRowProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={chatSidebarRowClass(selected)}
      aria-current={selected ? 'true' : undefined}
    >
      <span
        className={`shrink-0 w-10 h-10 rounded-full border border-app flex items-center justify-center ${iconClassName}`}
      >
        <Icon className="w-5 h-5" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-app truncate">{title}</p>
          {trailing}
        </div>
        <p className="text-[10px] text-muted mt-0.5">{subtitle}</p>
        <p className="text-xs text-muted mt-1 line-clamp-2">{preview}</p>
      </div>
    </button>
  );
}
