import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Flag, MessageSquare, Trash2 } from 'lucide-react';
import { ItemComment, UserProfile } from '../types';
import ReportNeighborModal from './ReportNeighborModal';
import { PostVoteState } from '../hooks/useItemsEngagement';
import RoleBadge from './RoleBadge';
import { isStaffRole } from '../lib/roles';
import { commentPostedAsNeighbor, shouldShowStaffBadgeOnComment } from '../lib/staffInteractionMode';
import { useUserDisplayInfo } from '../hooks/useUserDisplayInfo';
import { PresenceUserAvatar } from './UserAvatar';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmRemoveComment } from '../lib/destructiveConfirm';

interface ListingEngagementProps {
  posterUserId: string;
  currentUserId: string;
  voteState: PostVoteState;
  comments: ItemComment[];
  commentsExpanded: boolean;
  onVote: (direction: 'up' | 'down') => void;
  onToggleComments?: () => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  userProfile?: UserProfile | null;
  onViewProfile?: (userId: string) => void;
  /** card = compact with toggle; detail = full section always open */
  variant?: 'card' | 'detail';
  /** Optional role map for commenters: userId → role. Used to show staff badges. */
  commenterRoles?: Record<string, UserProfile['role']>;
}

export default function ListingEngagement({
  posterUserId,
  currentUserId,
  voteState,
  comments,
  commentsExpanded,
  onVote,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  userProfile,
  onViewProfile,
  variant = 'card',
  commenterRoles,
}: ListingEngagementProps) {
  const DETAIL_PREVIEW_COUNT = 5;
  const isOwner = posterUserId === currentUserId;
  const { userVote, upvotes, downvotes } = voteState;
  const netScore = upvotes - downvotes;
  const [showAllComments, setShowAllComments] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; userName: string } | null>(null);
  const commenterInfo = useUserDisplayInfo(comments.map((comment) => comment.userId), userProfile);
  const { confirm } = useConfirm();

  const requestDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    const ok = await confirmRemoveComment(confirm);
    if (!ok) return;
    onDeleteComment(commentId);
  };

  const visibleComments = useMemo(() => {
    if (variant !== 'detail') return comments;
    if (showAllComments) return comments;
    return comments.slice(-DETAIL_PREVIEW_COUNT);
  }, [comments, showAllComments, variant]);

  const hasHiddenComments =
    variant === 'detail' && comments.length > DETAIL_PREVIEW_COUNT && !showAllComments;

  const voteBtnClass = (active: boolean, disabled: boolean) =>
    `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      disabled
        ? 'opacity-50 cursor-not-allowed border-app text-muted'
        : active
          ? 'bg-accent-soft border-accent text-accent'
          : 'border-app text-muted hover:border-accent'
    }`;

  return (
    <section
      className={variant === 'detail' ? 'sbn-card p-4 space-y-3' : ''}
      id={variant === 'detail' ? 'listing_engagement_detail' : undefined}
    >
      {variant === 'detail' && (
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Community</h3>
      )}

      <div className={`flex items-center gap-1.5 sm:gap-2 ${variant === 'card' ? 'mt-2 sm:mt-4' : ''}`}>
        <button
          type="button"
          disabled={isOwner}
          onClick={() => onVote('up')}
          className={voteBtnClass(userVote === 'up', isOwner)}
          title={isOwner ? "You can't vote on your own listing" : 'Interested'}
        >
          <ChevronUp className="w-4 h-4" />
          {upvotes}
        </button>
        <span className="text-xs font-bold text-app min-w-[1.5rem] text-center">
          {netScore > 0 ? `+${netScore}` : netScore}
        </span>
        <button
          type="button"
          disabled={isOwner}
          onClick={() => onVote('down')}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            isOwner
              ? 'opacity-50 cursor-not-allowed border-app text-muted'
              : userVote === 'down'
                ? 'bg-inset border-app text-app'
                : 'border-app text-muted hover:border-app'
          }`}
          title={isOwner ? "You can't vote on your own listing" : 'Not for me'}
        >
          <ChevronDown className="w-4 h-4" />
          {downvotes}
        </button>
        {variant === 'detail' && (
          <span className="ml-auto text-xs text-muted flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>

      {isOwner && variant === 'detail' && (
        <p className="text-[11px] text-muted">Vote counts are from neighbors — you can&apos;t vote on your own post.</p>
      )}

      {variant === 'detail' && (
        <div
          className="space-y-3 pt-1 border-t border-app"
        >
          {comments.length === 0 ? (
            <p className="text-xs text-muted italic text-center py-2">No comments yet — say hello!</p>
          ) : (
            <>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {visibleComments.map((comment) => {
                  const isOwnComment = comment.userId === currentUserId;
                  const canReport = userProfile && !isOwnComment && comment.userId !== posterUserId;
                  const commenterRole = commenterRoles?.[comment.userId] ?? commenterInfo[comment.userId]?.role;
                  const commenterIsStaff = shouldShowStaffBadgeOnComment(commenterRole, comment);
                  return (
                    <li key={comment.id} className={`rounded-xl p-3 border ${commenterIsStaff ? 'bg-accent/5 border-accent/20' : 'bg-inset border-app'}`}>
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(comment.userId)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 cursor-pointer flex-wrap"
                          disabled={!onViewProfile}
                        >
                          <PresenceUserAvatar
                            uid={comment.userId}
                            src={commenterInfo[comment.userId]?.photoURL ?? comment.userPhoto}
                            name={comment.userName}
                            size="xs"
                            showStatus={false}
                          />
                          <span className="text-xs font-bold text-app">{comment.userName}</span>
                          {commenterIsStaff && commenterRole ? (
                            <span className="scale-[0.8] origin-left">
                              <RoleBadge role={commenterRole} />
                            </span>
                          ) : (
                            <span className="text-[10px] text-accent font-medium">{comment.userNeighborhood}</span>
                          )}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOwnComment && onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => void requestDeleteComment(comment.id)}
                              className="p-1.5 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                              title="Remove your comment"
                              aria-label="Remove your comment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canReport && (
                            <button
                              type="button"
                              onClick={() =>
                                setReportTarget({ userId: comment.userId, userName: comment.userName })
                              }
                              className="p-1.5 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                              title={`Report ${comment.userName}`}
                              aria-label={`Report ${comment.userName}`}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted mt-1.5 leading-relaxed">{comment.text}</p>
                    </li>
                  );
                })}
              </ul>
              {hasHiddenComments && (
                <button
                  type="button"
                  onClick={() => setShowAllComments(true)}
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                >
                  See all comments ({comments.length})
                </button>
              )}
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('commentText') as HTMLInputElement;
              if (input?.value.trim()) {
                onAddComment(input.value.trim());
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              name="commentText"
              placeholder="Add a comment…"
              className="sbn-input flex-1 text-sm py-2"
              required
            />
            <button type="submit" className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
              Post
            </button>
          </form>
        </div>
      )}

      {reportTarget && userProfile && (
        <ReportNeighborModal
          reporter={userProfile}
          reportedUserId={reportTarget.userId}
          reportedUserName={reportTarget.userName}
          onClose={() => setReportTarget(null)}
        />
      )}
    </section>
  );
}
