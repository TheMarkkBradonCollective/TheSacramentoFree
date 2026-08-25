import { useState } from 'react';
import { ChevronDown, ChevronUp, Flag, MapPin, MessageSquare, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from '../../lib/feedReactions';
import { isStaffRole } from '../../lib/roles';
import { PresenceUserAvatar } from '../UserAvatar';
import ReportNeighborModal from '../ReportNeighborModal';
import FeedPostClientBadge from './FeedPostClientBadge';
import FeedPollBlock from './FeedPollBlock';
import { feedPostPreview } from '../../lib/feedPostText';
import { formatDistanceToNow } from '../../lib/timeAgo';

interface FeedPostCardProps {
  post: FeedPost;
  userProfile: UserProfile;
  engagement: FeedEngagementApi;
  onViewPost?: (post: FeedPost) => void;
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

const voteBtnClass = (active: boolean) =>
  `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    active
      ? 'bg-accent-soft border-accent text-accent'
      : 'border-app text-muted hover:border-accent'
  }`;

export default function FeedPostCard({
  post,
  userProfile,
  engagement,
  onViewPost,
  onViewProfile,
  onDeletePost,
}: FeedPostCardProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const isOwn = post.userId === userProfile.uid;
  const isStaff = isStaffRole(userProfile.role);
  const canEngage = !isOwn;
  const votes = engagement.getVoteState(post.id);
  const reactions = engagement.getReactionState(post.id);
  const comments = engagement.getComments(post.id);
  const pollState = engagement.getPollState(post.id);
  const isPoll = post.postKind === 'poll';
  const pollPreview = isPoll ? feedPostPreview(post.text) : null;
  const cover = !isPoll ? post.imageUrls[0] : undefined;
  const extraPhotos = Math.max(0, post.imageUrls.length - 1);

  const canDelete = isOwn || isStaff;
  const canReport = !isOwn;

  const openPost = () => onViewPost?.(post);

  return (
    <article
      className="item-feed-card sbn-feed-post overflow-hidden cursor-pointer"
      id={`feed_post_${post.id}`}
      onClick={openPost}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPost();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open post by ${post.userDisplayName}`}
    >
      {cover ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-inset pointer-events-none">
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          {extraPhotos > 0 && (
            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-full">
              +{extraPhotos}
            </span>
          )}
        </div>
      ) : null}

      <div className="p-3 sm:p-4">
        <header className="flex items-start gap-2.5 pointer-events-none">
          <PresenceUserAvatar
            uid={post.userId}
            src={post.userPhotoURL}
            name={post.userDisplayName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-app leading-snug truncate">{post.userDisplayName}</p>
            {isPoll ? (
              <p className="text-[10px] font-bold uppercase tracking-wider text-accent mt-0.5">Poll</p>
            ) : null}
            <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{post.neighborhood}</span>
              <span className="text-subtle">·</span>
              <span className="shrink-0">{timeLabel(post.createdAt)}</span>
              {post.clientInstallKind ? (
                <>
                  <span className="text-subtle">·</span>
                  <FeedPostClientBadge
                    installKind={post.clientInstallKind}
                    version={post.clientVersion}
                  />
                </>
              ) : null}
            </p>
          </div>
        </header>

        {isPoll && pollPreview?.headline ? (
          <div className="mt-2.5 pointer-events-none space-y-1">
            <p className="text-sm font-bold text-app leading-snug">{pollPreview.headline}</p>
            {pollPreview.body ? (
              <p className="text-[11px] text-muted leading-snug">Tap to read the full post</p>
            ) : null}
          </div>
        ) : post.text.trim() ? (
          <p className="text-sm text-app leading-relaxed whitespace-pre-wrap mt-2.5 line-clamp-4 pointer-events-none">
            {post.text}
          </p>
        ) : null}

        {isPoll ? (
          <FeedPollBlock
            post={post}
            pollState={pollState}
            canVote={canEngage}
            isOwnPost={isOwn}
            compact
            onVote={(optionId) => void engagement.handlePollVote(post.id, optionId, post.userId)}
          />
        ) : null}

        <div
          className="space-y-2 mt-3 pt-3 border-t border-app"
          onClick={(event) => event.stopPropagation()}
        >
          {canEngage ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => engagement.handleVote(post.id, 'up', post.userId)}
                  className={voteBtnClass(votes.userVote === 'up')}
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
              </div>

              <div className="flex flex-wrap gap-1">
                {FEED_REACTION_EMOJI.map((emoji) => {
                  const active = reactions.mine.has(emoji);
                  const count = reactions.counts[emoji] ?? 0;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        void engagement.toggleReaction(post.id, emoji as FeedReactionEmoji, post.userId)
                      }
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm border transition-colors ${
                        active
                          ? 'border-accent bg-accent text-on-accent'
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
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openPost}
              className={`${canEngage ? '' : 'mr-auto'} flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-app text-muted hover:border-accent transition-colors`}
              aria-label={`Comment, ${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comment</span>
              <span className="tabular-nums">{comments.length}</span>
            </button>

            {canReport && (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10 ml-auto"
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
                className={`p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10 ${canReport ? '' : 'ml-auto'}`}
                title="Delete post"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
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
