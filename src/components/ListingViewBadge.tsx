import { Eye } from 'lucide-react';

export function formatListingViewCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (count >= 10_000) {
    return `${Math.round(count / 1000)}k`;
  }
  if (count >= 1_000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(count);
}

function viewCountLabel(count: number): string {
  return `${formatListingViewCount(count)} view${count === 1 ? '' : 's'}`;
}

interface ListingViewCountProps {
  count: number;
  className?: string;
  compact?: boolean;
}

/** Inline view count for listing detail and list cards (grid uses overlay badge). */
export function ListingViewCount({ count, className = '', compact = false }: ListingViewCountProps) {
  if (count <= 0) return null;

  const label = viewCountLabel(count);
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      aria-label={label}
      title="Unique neighbors who opened this listing"
    >
      <Eye className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} shrink-0`} aria-hidden />
      {compact ? formatListingViewCount(count) : label}
    </span>
  );
}

interface ListingViewBadgeProps {
  count: number;
  className?: string;
  compact?: boolean;
}

export default function ListingViewBadge({ count, className = '', compact = false }: ListingViewBadgeProps) {
  if (count <= 0) return null;

  const label = viewCountLabel(count);

  return (
    <span
      className={`absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/70 font-bold text-white ${
        compact ? 'px-1 py-0 text-[7px]' : 'px-1.5 py-0.5 text-[9px]'
      } ${className}`}
      aria-label={label}
      title="Unique neighbors who opened this listing"
    >
      <Eye className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} aria-hidden />
      {formatListingViewCount(count)}
    </span>
  );
}
