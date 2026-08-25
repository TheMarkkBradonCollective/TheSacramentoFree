import { Eye } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface ChangelogSeenLabelProps {
  count: number;
  className?: string;
}

/** Unique neighbors who opened the full update or news story. */
export default function ChangelogSeenLabel({ count, className = '' }: ChangelogSeenLabelProps) {
  if (count <= 0) return null;

  const label = `Seen by ${formatListingViewCount(count)} user${count === 1 ? '' : 's'}`;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-muted tabular-nums ${className}`}
      aria-label={label}
      title={label}
    >
      <Eye className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
