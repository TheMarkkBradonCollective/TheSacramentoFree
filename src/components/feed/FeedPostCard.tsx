import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Flag, MessageCircle, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from '../../lib/feedReactions';
import { isStaffRole } from '../../lib/roles';
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
  const score = votes.upvotes - votes.downvotes;

  const canVote = !isOwn;
  const canDelete = isOwn || isStaff;
  const canReport = !isOwn;

  const reactionSummary = useMemo(() => {
    return FEED_REACTION_EMOJI.filter((emoji) => (reactions.counts[emoji] ?? 0) > 0);
  }, [reactions.counts]);

  return (
    <article className="sbn-feed-post sbn-card overflow-hidden" id={`feed_post_${post.id}`}>
      <header className="flex items-start gap-3 p-4 pb-2">
        <button
          type="button"
          onClick={() => onViewProfile?.(post.userId)}
          className="shrink-0"
          disabled={!onViewProfile}
        >
          <img
            src={
              post.userPhotoURL ||
              `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(post.userDisplayName)}`
            }
            alt=""
            className="w-11 h-11 rounded-full border border-app object-cover"
            referrerPolicy="no-referrer"
          />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onViewProfile?.(post.userId)}
            className="text-left"
            disabled={!onViewProfile}
          >
            <p className="text-sm font-bold text-app leading-tight">{post.userDisplayName}</p>
            <p className="text-[11px] text-accent font-medium">{post.neighborhood}</p>
          </button>
          <p className="text-[10px] text-muted mt-0.5">{timeLabel(post.createdAt)}</p>
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

      {post.text.trim() && (
        <div className="px-4 pb-2">
          <p className="text-sm text-app leading-relaxed whitespace-pre-wrap">{post.text}</p>
        </div>
      )}

      {post.imageUrls.length > 0 && (
        <div className={`px-4 pb-3 grid gap-2 ${post.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.imageUrls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="w-full rounded-xl border border-app object-cover max-h-80"
              referrerPolicy="no-referrer"
            />
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-app flex items-center gap-3 text-xs text-muted">
        {canVote && (
          <div className="inline-flex items-center rounded-full border border-app overflow-hidden">
            <button
              type="button"
              onClick={() => engagement.handleVote(post.id, 'up', post.userId)}
              className={`px-2.5 py-1 hover:bg-inset ${votes.userVote === 'up' ? 'text-accent bg-accent/10' : ''}`}
              aria-label="Upvote"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="px-1.5 font-bold tabular-nums text-app min-w-[1.5rem] text-center">{score}</span>
            <button
              type="button"
              onClick={() => engagement.handleVote(post.id, 'down', post.userId)}
              className={`px-2.5 py-1 hover:bg-inset ${votes.userVote === 'down' ? 'text-accent bg-accent/10' : ''}`}
              aria-label="Downvote"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
        {!canVote && (
          <span className="font-semibold tabular-nums text-app">{score} neighbor votes</span>
        )}
        <button
          type="button"
          onClick={() => engagement.toggleComments(post.id)}
          className="inline-flex items-center gap-1 hover:text-app"
        >
          <MessageCircle className="w-4 h-4" />
          {comments.length}
        </button>
        {reactionSummary.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-0.5">
            {reactionSummary.map((emoji) => (
              <span key={emoji} className="text-sm" title={`${reactions.counts[emoji]} reactions`}>
                {emoji}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
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
                  ? 'border-accent bg-accent/15 scale-105'
                  : 'border-app bg-inset hover:border-accent/40'
              }`}
              aria-label={`React ${emoji}`}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-[10px] font-bold text-muted">{count}</span>}
            </button>
          );
        })}
      </div>

      {expanded && (
        <FeedPostComments
          post={post}
          userProfile={userProfile}
          engagement={engagement}
          onViewProfile={onViewProfile}
        />
      )}

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
