import { Check, ChevronDown, ChevronUp, Eye, MessageSquare } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface ListingCardEngagementProps {
  upvotes: number;
  downvotes: number;
  commentCount: number;
  /** Event RSVP going count — omitted on Stuff cards. */
  goingCount?: number;
}

interface ListingCardStatsProps extends ListingCardEngagementProps {
  viewCount: number;
}

function statItemClass(variant: 'overlay' | 'inline'): string {
  return variant === 'overlay'
    ? 'inline-flex items-center gap-0.5 shrink-0 tabular-nums'
    : 'inline-flex items-center gap-0.5 shrink-0 tabular-nums';
}

/** Vote + comment counts on card thumbnails — each engagement stat hidden at zero. */
export function ListingCardEngagementOverlay({
  upvotes,
  downvotes,
  commentCount,
  goingCount = 0,
}: ListingCardEngagementProps) {
  const items = [
    upvotes > 0 ? (
      <span key="up" className={statItemClass('overlay')} aria-label={`${upvotes} upvotes`} title="Upvotes">
        <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
        {upvotes}
      </span>
    ) : null,
    downvotes > 0 ? (
      <span key="down" className={statItemClass('overlay')} aria-label={`${downvotes} downvotes`} title="Downvotes">
        <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
        {downvotes}
      </span>
    ) : null,
    goingCount > 0 ? (
      <span key="going" className={statItemClass('overlay')} aria-label={`${goingCount} going`} title="Going">
        <Check className="h-3 w-3 shrink-0" aria-hidden />
        {goingCount}
      </span>
    ) : null,
    commentCount > 0 ? (
      <span key="comments" className={statItemClass('overlay')} aria-label={`${commentCount} comments`} title="Comments">
        <MessageSquare className="h-3 w-3 shrink-0" aria-hidden />
        {commentCount}
      </span>
    ) : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <span className="absolute bottom-1.5 right-1.5 inline-flex max-w-[calc(100%-0.75rem)] flex-wrap items-center justify-end gap-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">
      {items}
    </span>
  );
}

/** Stats on list cards — view count always shown; other stats hidden at zero. */
export function ListingCardStatsInline({
  viewCount,
  upvotes,
  downvotes,
  commentCount,
  goingCount = 0,
}: ListingCardStatsProps) {
  return (
    <>
      <span className={statItemClass('inline')} aria-label={`${viewCount} views`} title="Views">
        <Eye className="h-3 w-3 shrink-0 text-muted" aria-hidden />
        {formatListingViewCount(viewCount)}
      </span>
      {upvotes > 0 ? (
        <span className={statItemClass('inline')} aria-label={`${upvotes} upvotes`} title="Upvotes">
          <ChevronUp className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          {upvotes}
        </span>
      ) : null}
      {downvotes > 0 ? (
        <span className={statItemClass('inline')} aria-label={`${downvotes} downvotes`} title="Downvotes">
          <ChevronDown className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          {downvotes}
        </span>
      ) : null}
      {goingCount > 0 ? (
        <span className={statItemClass('inline')} aria-label={`${goingCount} going`} title="Going">
          <Check className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          {goingCount}
        </span>
      ) : null}
      {commentCount > 0 ? (
        <span className={statItemClass('inline')} aria-label={`${commentCount} comments`} title="Comments">
          <MessageSquare className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          {commentCount}
        </span>
      ) : null}
    </>
  );
}
