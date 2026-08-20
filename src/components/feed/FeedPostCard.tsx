import { useState } from 'react';
import { ChevronDown, ChevronUp, Flag, MapPin, MessageSquare, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from '../../lib/feedReactions';
import { isStaffRole } from '../../lib/roles';
import { PresenceUserAvatar } from '../UserAvatar';
import FeedPostComments from './FeedPostComments';
import ReportNeighborModal from '../ReportNeighborModal';
import { formatDistanceToNow } from '../../lib/timeAgo';

interface FeedPostCardProps {
  post: FeedPost;
  userProfile: UserProfile;
  engagement: FeedEngagementApi;
  onViewProfile?: (userId: string) => void;
  onDeletePost: (post: FeedPost) => void;
}

function timeLabel(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso));
  } catch {
    return 'recently';
  }
}

const voteBtnClass = (active: boolean, disabled: boolean) =>
  `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    disabled
      ? 'opacity-50 cursor-not-allowed border-app text-muted'
      : active
        ? 'bg-accent-soft border-accent text-accent'
        : 'border-app text-muted hover:border-accent'
  }`;

function VoteCountPill({
  direction,
  count,
  active = false,
}: {
  direction: 'up' | 'down';
  count: number;
  active?: boolean;
}) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border tabular-nums ${
        active
          ? direction === 'up'
            ? 'bg-accent-soft border-accent text-accent'
            : 'bg-inset border-app text-app'
          : 'border-app text-muted bg-inset/50'
      }`}
      aria-hidden
    >
      <Icon className="w-4 h-4" />
      {count}
    </span>
  );
}

export default function FeedPostCard({
  post,
  userProfile,
  engagement,
  onViewProfile,
  onDeletePost,
}: FeedPostCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const isOwn = post.userId === userProfile.uid;
  const isStaff = isStaffRole(userProfile.role);
  const votes = engagement.getVoteState(post.id);
  const reactions = engagement.getReactionState(post.id);
  const comments = engagement.getComments(post.id);
  const expanded = engagement.expandedComments[post.id] ?? false;
  const cover = post.imageUrls[0];
  const extraPhotos = Math.max(0, post.imageUrls.length - 1);

  const canVote = !isOwn;
  const canDelete = isOwn || isStaff;
  const canReport = !isOwn;

  const reactionRow = (
    <div className="flex flex-wrap gap-1.5">
      {FEED_REACTION_EMOJI.map((emoji) => {
        const active = reactions.mine.has(emoji);
        const count = reactions.counts[emoji] ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => void engagement.toggleReaction(post.id, emoji as FeedReactionEmoji)}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
              active
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-app bg-inset text-muted hover:border-accent/40'
            }`}
            aria-label={`React ${emoji}`}
            aria-pressed={active}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[10px] font-bold tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <article className="item-feed-card sbn-feed-post overflow-hidden" id={`feed_post_${post.id}`}>
      {cover ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-inset">
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1 p-1.5">
            <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap shadow-sm">
              Post
            </span>
          </div>
          {extraPhotos > 0 && (
            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-full">
              +{extraPhotos}
            </span>
          )}
        </div>
      ) : null}

      <div className="p-3 sm:p-4">
        {!cover ? (
          <div className="mb-2">
            <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap">
              Post
            </span>
          </div>
        ) : null}

        <header className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={() => onViewProfile?.(post.userId)}
            className="shrink-0 rounded-full"
            disabled={!onViewProfile}
            aria-label={`View ${post.userDisplayName}'s profile`}
          >
            <PresenceUserAvatar
              uid={post.userId}
              src={post.userPhotoURL}
              name={post.userDisplayName}
              size="md"
            />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onViewProfile?.(post.userId)}
              className="text-left w-full min-w-0"
              disabled={!onViewProfile}
            >
              <p className="font-display text-sm font-bold text-app leading-snug truncate hover:text-accent">
                {post.userDisplayName}
              </p>
            </button>
            <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{post.neighborhood}</span>
              <span className="text-subtle">·</span>
              <span className="shrink-0">{timeLabel(post.createdAt)}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {canReport && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                title="Report post"
                aria-label="Report post"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => void onDeletePost(post)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                title="Delete post"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {post.text.trim() ? (
          <p className="text-sm text-app leading-relaxed whitespace-pre-wrap mt-2.5">{post.text}</p>
        ) : null}

        {post.imageUrls.length > 1 && (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {post.imageUrls.slice(1).map((url) => (
              <img
                key={url}
                src={url}
                alt=""
                className="h-20 w-full rounded-xl border border-app object-cover"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-app">
          {canVote ? (
            <>
              <button
                type="button"
                onClick={() => engagement.handleVote(post.id, 'up', post.userId)}
                className={voteBtnClass(votes.userVote === 'up', false)}
                title="Upvote"
                aria-label="Upvote"
              >
                <ChevronUp className="w-4 h-4" />
                <span className="tabular-nums">{votes.upvotes}</span>
              </button>
              <button
                type="button"
                onClick={() => engagement.handleVote(post.id, 'down', post.userId)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  votes.userVote === 'down'
                    ? 'bg-inset border-app text-app'
                    : 'border-app text-muted hover:border-app'
                }`}
                title="Not for me"
                aria-label="Downvote"
              >
                <ChevronDown className="w-4 h-4" />
                <span className="tabular-nums">{votes.downvotes}</span>
              </button>
            </>
          ) : (
            <>
              <VoteCountPill direction="up" count={votes.upvotes} />
              <VoteCountPill direction="down" count={votes.downvotes} />
            </>
          )}
          <button
            type="button"
            onClick={() => engagement.toggleComments(post.id)}
            className={`ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              expanded
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-app text-muted hover:border-accent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="tabular-nums">{comments.length}</span>
          </button>
        </div>

        <div className="mt-2.5">{reactionRow}</div>

        {expanded && (
          <div className="mt-3">
            <FeedPostComments
              post={post}
              userProfile={userProfile}
              engagement={engagement}
              onViewProfile={onViewProfile}
            />
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportNeighborModal
          reporter={userProfile}
          reportedUserId={post.userId}
          reportedUserName={post.userDisplayName}
          feedPostId={post.id}
          onClose={() => setReportOpen(false)}
        />
      )}
    </article>
  );
}
