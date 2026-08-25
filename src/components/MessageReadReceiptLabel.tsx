import { Eye } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface MessageReadReceiptLabelProps {
  readCount: number;
  isGroupChat: boolean;
}

export default function MessageReadReceiptLabel({ readCount, isGroupChat }: MessageReadReceiptLabelProps) {
  if (readCount <= 0) return null;

  const label = isGroupChat ? `Read by ${readCount}` : 'Read';
  return (
    <span className="text-[9px] text-white/75 shrink-0" aria-label={label} title={label}>
      {label}
    </span>
  );
}

interface FeedPostViewCountProps {
  count: number;
  className?: string;
}

export function FeedPostViewCount({ count, className = '' }: FeedPostViewCountProps) {
  if (count <= 0) return null;

  const label = `${formatListingViewCount(count)} view${count === 1 ? '' : 's'}`;
  return (
    <span
      className={`inline-flex items-center gap-0.5 shrink-0 tabular-nums ${className}`}
      aria-label={label}
      title="Unique neighbors who opened this post"
    >
      <Eye className="h-3 w-3 shrink-0 text-muted" aria-hidden />
      {formatListingViewCount(count)}
    </span>
  );
}
