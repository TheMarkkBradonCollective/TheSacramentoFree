import { ChevronDown, ChevronUp, Eye, MessageSquare } from 'lucide-react';
import type { ContentVoteState } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from '../../lib/feedReactions';
import { formatListingViewCount } from '../ListingViewBadge';

const voteBtnClass = (active: boolean, disabled: boolean) =>
  `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    disabled
      ? 'opacity-80 cursor-default border-app text-muted'
      : active
        ? 'bg-accent-soft border-accent text-accent'
        : 'border-app text-muted hover:border-accent'
  }`;

interface FeedEngagementBarProps {
  postId: string;
  authorId: string;
  isOwn: boolean;
  votes: ContentVoteState;
  reactions: { counts: Record<string, number>; mine: Set<string> };
  votesLoading?: boolean;
  engagement: FeedEngagementApi;
  layout?: 'compact' | 'detail';
  commentCount?: number;
  viewCount?: number;
  onComment?: () => void;
}

export default function FeedEngagementBar({
  postId,
  authorId,
  isOwn,
  votes,
  reactions,
  votesLoading = false,
  engagement,
  layout = 'compact',
  commentCount = 0,
  viewCount = 0,
  onComment,
}: FeedEngagementBarProps) {
  const canVote = !isOwn;
  const netScore = votes.upvotes - votes.downvotes;
  const countLabel = (n: number) => (votesLoading ? '—' : String(n));

  return (
    <div className={layout === 'detail' ? 'space-y-3' : 'space-y-2'}>
      <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 ${layout === 'detail' ? 'pt-2 border-t border-app' : ''}`}>
        <button
          type="button"
          disabled={!canVote}
          onClick={() => engagement.handleVote(postId, 'up', authorId)}
          className={voteBtnClass(votes.userVote === 'up', !canVote)}
          title={isOwn ? 'Neighbor upvotes on your post' : 'Upvote'}
          aria-label="Upvote"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="tabular-nums">{countLabel(votes.upvotes)}</span>
        </button>
        {layout === 'detail' && (
          <span className="text-xs font-bold text-app min-w-[1.5rem] text-center tabular-nums">
            {votesLoading ? '—' : netScore > 0 ? `+${netScore}` : netScore}
          </span>
        )}
        <button
          type="button"
          disabled={!canVote}
          onClick={() => engagement.handleVote(postId, 'down', authorId)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            !canVote
              ? 'opacity-80 cursor-default border-app text-muted'
              : votes.userVote === 'down'
                ? 'bg-inset border-app text-app'
                : 'border-app text-muted hover:border-app'
          }`}
          title={isOwn ? 'Neighbor downvotes on your post' : 'Not for me'}
          aria-label="Downvote"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="tabular-nums">{countLabel(votes.downvotes)}</span>
        </button>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-app text-muted"
          aria-label={`${viewCount} views`}
          title="Unique neighbors who opened this post"
        >
          <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="tabular-nums">{formatListingViewCount(viewCount)}</span>
        </span>
        {layout === 'compact' && onComment ? (
          <button
            type="button"
            onClick={onComment}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-app text-muted hover:border-accent transition-colors shrink-0"
            aria-label={`Comment, ${commentCount} ${commentCount === 1 ? 'comment' : 'comments'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comment</span>
            <span className="tabular-nums">{commentCount}</span>
          </button>
        ) : null}
      </div>

      <div>
        {layout === 'detail' && (
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2">Reactions</p>
        )}
        <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
          {FEED_REACTION_EMOJI.map((emoji) => {
            const active = reactions.mine.has(emoji);
            const count = reactions.counts[emoji] ?? 0;
            const showCount = count > 0 || isOwn;
            return (
              <button
                key={emoji}
                type="button"
                disabled={!canVote}
                onClick={() => void engagement.toggleReaction(postId, emoji as FeedReactionEmoji, authorId)}
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm border transition-colors ${
                  !canVote
                    ? 'border-app bg-inset text-muted cursor-default'
                    : active
                      ? 'border-accent bg-accent text-on-accent'
                      : 'border-app bg-inset text-muted hover:border-accent/40'
                }`}
                aria-label={`React ${emoji}`}
                aria-pressed={active}
              >
                <span>{emoji}</span>
                {showCount && (
                  <span className="text-[10px] font-bold tabular-nums">{votesLoading ? '—' : count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
