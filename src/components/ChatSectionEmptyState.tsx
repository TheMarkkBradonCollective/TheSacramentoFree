import type { LucideIcon } from 'lucide-react';

interface ChatSectionEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

/** Shared empty state for Support and Direct message sections (sidebar + full inbox). */
export default function ChatSectionEmptyState({
  icon: Icon,
  title,
  description,
  className = '',
}: ChatSectionEmptyStateProps) {
  return (
    <div className={`text-center ${className}`.trim()}>
      {Icon ? <Icon className="w-10 h-10 text-muted mx-auto mb-3" aria-hidden /> : null}
      <h3 className="font-display text-lg font-bold text-app">{title}</h3>
      {description ? (
        <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
