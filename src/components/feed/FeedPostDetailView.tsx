import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Flag, MapPin, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import { useFeedEngagement } from '../../hooks/useFeedEngagement';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { FEED_REACTION_EMOJI, type FeedReactionEmoji } from '../../lib/feedReactions';
import { isStaffRole } from '../../lib/roles';
import { PresenceUserAvatar } from '../UserAvatar';
import FeedPostComments from './FeedPostComments';
import FeedPostClientBadge from './FeedPostClientBadge';
import FeedPollBlock from './FeedPollBlock';
import ReportNeighborModal from '../ReportNeighborModal';
import { formatDistanceToNow } from '../../lib/timeAgo';

interface FeedPostDetailViewProps {
  post: FeedPost;
  userProfile: UserProfile;
  blockedUserIds?: Set<string>;
  onClose: () => void;
  onViewProfile?: (userId: string) => void;
  onDeletePost?: (post: FeedPost) => void;
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

export default function FeedPostDetailView({
  post,
  userProfile,
  blockedUserIds = new Set(),
  onClose,
  onViewProfile,
  onDeletePost,
}: FeedPostDetailViewProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const isOwn = post.userId === userProfile.uid;
  const isStaff = isStaffRole(userProfile.role);
  const canEngage = !isOwn;
  const canDelete = isOwn || isStaff;
  const canReport = !isOwn;

  const engagement = useFeedEngagement([post.id], userProfile, blockedUserIds);
  const votes = engagement.getVoteState(post.id);
  const reactions = engagement.getReactionState(post.id);
  const comments = engagement.getComments(post.id);
  const pollState = engagement.getPollState(post.id);
  const isPoll = post.postKind === 'poll';

  useDismissOnEscape(onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const panel = (
    <div
      id="feed_post_detail_fullscreen"
      className="sbn-app-sheet flex flex-col min-h-0 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label="Feed post"
    >
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sbn-safe-bottom">
        <header className="sbn-glass-nav sbn-safe-top border-b border-app">
          <div className="px-4 min-h-14 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-inset text-app"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm text-app truncate">Feed post</p>
            </div>
            {canReport ? (
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                aria-label="Report post"
              >
                <Flag className="w-4 h-4" />
              </button>
            ) : null}
            {canDelete && onDeletePost ? (
              <button
                type="button"
                onClick={() => void onDeletePost(post)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                aria-label="Delete post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </header>

        <div className="sbn-page-content pb-6 max-w-2xl mx-auto w-full">
          {post.imageUrls.length > 0 && (
            <div className="space-y-2 p-4 pb-0">
              {post.imageUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="w-full rounded-xl border border-app object-cover max-h-[28rem]"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => onViewProfile?.(post.userId)}
                className="shrink-0 rounded-full"
                disabled={!onViewProfile}
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
                  className="text-left"
                  disabled={!onViewProfile}
                >
                  <p className="font-display text-base font-bold text-app hover:text-accent">
                    {post.userDisplayName}
                  </p>
                </button>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5 flex-wrap">
                  <MapPin className="w-3 h-3 text-accent shrink-0" />
                  {post.neighborhood}
                  <span className="text-subtle">·</span>
                  {timeLabel(post.createdAt)}
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
            </div>

            {post.text.trim() ? (
              <p className="text-sm sm:text-base text-app leading-relaxed whitespace-pre-wrap">{post.text}</p>
            ) : null}

            {isPoll ? (
              <FeedPollBlock
                post={post}
                pollState={pollState}
                canVote={canEngage}
                isOwnPost={isOwn}
                onVote={(optionId) => void engagement.handlePollVote(post.id, optionId, post.userId)}
              />
            ) : null}

            {canEngage ? (
              <>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-app">
                  <button
                    type="button"
                    onClick={() => engagement.handleVote(post.id, 'up', post.userId)}
                    className={voteBtnClass(votes.userVote === 'up')}
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
                    aria-label="Downvote"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span className="tabular-nums">{votes.downvotes}</span>
                  </button>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted mb-2">React</p>
                  <div className="flex flex-wrap gap-1.5">
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
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
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
                </div>
              </>
            ) : null}

            <FeedPostComments
              post={post}
              userProfile={userProfile}
              engagement={engagement}
              onViewProfile={onViewProfile}
            />
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
    </div>
  );

  return createPortal(panel, document.body);
}
