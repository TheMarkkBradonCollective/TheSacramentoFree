import type { LucideIcon } from 'lucide-react';

interface ChatSectionEmptyStateProps {
  icon: LucideIcon;
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
    <div className={`text-center px-4 py-6 ${className}`}>
      <Icon className="w-8 h-8 text-muted mx-auto mb-2" aria-hidden />
      <p className="font-semibold text-app text-sm">{title}</p>
      {description ? (
        <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-[16rem] mx-auto">{description}</p>
      ) : null}
    </div>
  );
}
