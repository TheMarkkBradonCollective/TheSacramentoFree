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
    <div className="text-center px-4 py-6 chat-empty-card">
      <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-soft text-accent mb-3">
        <Icon className="w-6 h-6" aria-hidden />
      </span>
      <p className="font-display font-semibold text-app text-sm">{title}</p>
      {description ? (
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
