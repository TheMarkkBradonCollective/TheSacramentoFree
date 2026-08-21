import { useMemo, useState } from 'react';
import { Check, Flag, HelpCircle, MessageSquare, Trash2, UserCheck, UserX, X } from 'lucide-react';
import { EventComment, EventRsvpStatus, UserProfile } from '../types';
import ReportNeighborModal from './ReportNeighborModal';
import { EventRsvpState } from '../hooks/useEventsEngagement';
import { effectivePastRsvp } from '../lib/eventRsvp';
import RoleBadge from './RoleBadge';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { shouldShowStaffBadgeOnComment } from '../lib/staffInteractionMode';
import { useUserDisplayInfo } from '../hooks/useUserDisplayInfo';
import { PresenceUserAvatar } from './UserAvatar';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmRemoveComment } from '../lib/destructiveConfirm';

interface EventEngagementProps {
  hostUserId: string;
  currentUserId: string;
  rsvpState: EventRsvpState;
  comments: EventComment[];
  onRsvp: (status: EventRsvpStatus) => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  userProfile?: UserProfile | null;
  onViewProfile?: (userId: string) => void;
  variant?: 'card' | 'detail';
  rsvpDisabled?: boolean;
  commentsLocked?: boolean;
  isPast?: boolean;
  commenterRoles?: Record<string, UserProfile['role']>;
}

const UPCOMING_RSVP_OPTIONS: { status: EventRsvpStatus; label: string; icon: typeof Check }[] = [
  { status: 'going', label: 'Going', icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'not_going', label: "Can't go", icon: X },
];

const PAST_RSVP_OPTIONS: { status: EventRsvpStatus; label: string; icon: typeof Check }[] = [
  { status: 'gone', label: 'Gone', icon: UserCheck },
  { status: 'missed', label: 'Missed', icon: UserX },
];

export default function EventEngagement({
  hostUserId,
  currentUserId,
  rsvpState,
  comments,
  onRsvp,
  onAddComment,
  onDeleteComment,
  userProfile,
  onViewProfile,
  variant = 'detail',
  rsvpDisabled = false,
  commentsLocked = false,
  isPast = false,
  commenterRoles,
}: EventEngagementProps) {
  const DETAIL_PREVIEW_COUNT = 5;
  const { userRsvp, going, maybe, notGoing, gone, missed } = rsvpState;
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

  const rsvpOptions = isPast ? PAST_RSVP_OPTIONS : UPCOMING_RSVP_OPTIONS;
  const activeRsvp = isPast ? effectivePastRsvp(userRsvp) : userRsvp;

  const visibleComments = useMemo(() => {
    if (variant !== 'detail') return comments;
    if (showAllComments) return comments;
    return comments.slice(-DETAIL_PREVIEW_COUNT);
  }, [comments, showAllComments, variant]);

  const hasHiddenComments =
    variant === 'detail' && comments.length > DETAIL_PREVIEW_COUNT && !showAllComments;

  const rsvpBtnClass = (active: boolean) =>
    `flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
      active
        ? 'bg-accent-soft border-accent text-accent'
        : 'border-app text-muted hover:border-accent'
    }`;

  const countForStatus = (status: EventRsvpStatus): number => {
    if (status === 'going') return going;
    if (status === 'maybe') return maybe;
    if (status === 'not_going') return notGoing;
    if (status === 'gone') return gone;
    if (status === 'missed') return missed;
    return 0;
  };

  return (
    <section className={variant === 'detail' ? 'sbn-card p-4 space-y-3' : ''}>
      {variant === 'detail' && (
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {commentsLocked ? (isPast ? 'Attendance' : 'RSVP') : isPast ? 'Attendance & discussion' : 'RSVP & discussion'}
        </h3>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${variant === 'card' ? 'mt-2' : ''}`}>
        {!rsvpDisabled &&
          rsvpOptions.map(({ status, label, icon: Icon }) => {
          const count = countForStatus(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => onRsvp(status)}
              className={rsvpBtnClass(activeRsvp === status)}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
              {count > 0 && <span className="opacity-80">({count})</span>}
            </button>
          );
        })}
        {rsvpDisabled && variant === 'detail' && (
          <p className="text-xs text-muted italic">RSVPs are closed for cancelled events.</p>
        )}
        {variant === 'card' && (
          <span className="ml-auto text-xs text-muted flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length}
          </span>
        )}
        {variant === 'detail' && !commentsLocked && (
          <span className="ml-auto text-xs text-muted flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>

      {variant === 'detail' && (
        <div className="space-y-3 pt-1 border-t border-app">
          {commentsLocked ? (
            <p className="text-xs text-muted bg-inset border border-app rounded-lg px-3 py-2">
              {isPast
                ? 'Comments open once we reach 500 neighbors. You can still mark whether you went or missed it.'
                : 'Comments open once we reach 500 neighbors. You can still RSVP Going, Maybe, or Can\u2019t go.'}
            </p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted italic text-center py-2">
              No comments yet — ask a question or say hi!
            </p>
          ) : (
            <>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {visibleComments.map((comment) => {
                  const isOwnComment = comment.userId === currentUserId;
                  const canReport =
                    userProfile && !isOwnComment && comment.userId !== hostUserId && !isStaffActingOfficial(userProfile);
                  const commenterRole = commenterRoles?.[comment.userId] ?? commenterInfo[comment.userId]?.role;
                  const commenterIsStaff = shouldShowStaffBadgeOnComment(commenterRole, comment);
                  return (
                    <li
                      key={comment.id}
                      className={`rounded-xl p-3 border ${
                        commenterIsStaff ? 'bg-accent/5 border-accent/20' : 'bg-inset border-app'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(comment.userId)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 cursor-pointer"
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
          {!commentsLocked && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.elements.namedItem('eventCommentText') as HTMLInputElement;
              if (input?.value.trim()) {
                onAddComment(input.value.trim());
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              name="eventCommentText"
              placeholder="Add a comment…"
              className="sbn-input flex-1 text-sm py-2"
              required
            />
            <button type="submit" className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
              Post
            </button>
          </form>
          )}
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
