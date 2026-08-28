import { Eye } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface ChangelogSeenLabelProps {
  count: number;
  className?: string;
}

/** Unique neighbors who saw this update or news story. Always shown, including zero. */
export default function ChangelogSeenLabel({ count, className = '' }: ChangelogSeenLabelProps) {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  const label = `Seen by ${formatListingViewCount(safeCount)} user${safeCount === 1 ? '' : 's'}`;
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
