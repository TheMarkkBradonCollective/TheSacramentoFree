import { Check, Eye, MessageSquare } from 'lucide-react';
import { formatListingViewCount } from './ListingViewBadge';

interface EventCardEngagementProps {
  goingCount: number;
  commentCount: number;
}

interface EventCardStatsProps extends EventCardEngagementProps {
  viewCount: number;
}

function statItemClass(variant: 'overlay' | 'inline'): string {
  return variant === 'overlay'
    ? 'inline-flex items-center gap-0.5 shrink-0 tabular-nums'
    : 'inline-flex items-center gap-0.5 shrink-0 tabular-nums';
}

/** RSVP + comment counts on grid event thumbnails — each stat hidden at zero. */
export function EventCardEngagementOverlay({ goingCount, commentCount }: EventCardEngagementProps) {
  const items = [
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

/** Event stats on list cards — each stat hidden at zero. */
export function EventCardStatsInline({ viewCount, goingCount, commentCount }: EventCardStatsProps) {
  return (
    <>
      {viewCount > 0 ? (
        <span className={statItemClass('inline')} aria-label={`${viewCount} views`} title="Views">
          <Eye className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          {formatListingViewCount(viewCount)}
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
