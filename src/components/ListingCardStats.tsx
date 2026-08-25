import { ChevronDown, ChevronUp, Eye, MessageSquare } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface ListingCardEngagementProps {
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

interface ListingCardStatsProps extends ListingCardEngagementProps {
  viewCount: number;
}

function statItemClass(variant: 'overlay' | 'inline'): string {
  return variant === 'overlay'
    ? 'inline-flex items-center gap-0.5 shrink-0 tabular-nums'
    : 'inline-flex items-center gap-0.5 shrink-0 tabular-nums';
}

/** Vote + comment counts on grid card thumbnails — always visible. */
export function ListingCardEngagementOverlay({
  upvotes,
  downvotes,
  commentCount,
}: ListingCardEngagementProps) {
  return (
    <span className="absolute bottom-1.5 right-1.5 inline-flex max-w-[calc(100%-0.75rem)] flex-wrap items-center justify-end gap-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
      <span className={statItemClass('overlay')} aria-label={`${upvotes} upvotes`} title="Upvotes">
        <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
        {upvotes}
      </span>
      <span className={statItemClass('overlay')} aria-label={`${downvotes} downvotes`} title="Downvotes">
        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        {downvotes}
      </span>
      <span className={statItemClass('overlay')} aria-label={`${commentCount} comments`} title="Comments">
        <MessageSquare className="h-3 w-3 shrink-0" aria-hidden />
        {commentCount}
      </span>
    </span>
  );
}

/** All listing stats on list cards — views, upvotes, downvotes, comments. */
export function ListingCardStatsInline({
  viewCount,
  upvotes,
  downvotes,
  commentCount,
}: ListingCardStatsProps) {
  return (
    <>
      <span className={statItemClass('inline')} aria-label={`${viewCount} views`} title="Views">
        <Eye className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        {formatListingViewCount(viewCount)}
      </span>
      <span className={statItemClass('inline')} aria-label={`${upvotes} upvotes`} title="Upvotes">
        <ChevronUp className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        {upvotes}
      </span>
      <span className={statItemClass('inline')} aria-label={`${downvotes} downvotes`} title="Downvotes">
        <ChevronDown className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        {downvotes}
      </span>
      <span className={statItemClass('inline')} aria-label={`${commentCount} comments`} title="Comments">
        <MessageSquare className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        {commentCount}
      </span>
    </>
  );
}
