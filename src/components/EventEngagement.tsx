import { useMemo, useState } from 'react';
import { Check, Flag, HelpCircle, MessageSquare, Trash2, X } from 'lucide-react';
import { EventComment, EventRsvpStatus, UserProfile } from '../types';
import ReportNeighborModal from './ReportNeighborModal';
import { EventRsvpState } from '../hooks/useEventsEngagement';

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
}

const RSVP_OPTIONS: { status: EventRsvpStatus; label: string; icon: typeof Check }[] = [
  { status: 'going', label: 'Going', icon: Check },
  { status: 'maybe', label: 'Maybe', icon: HelpCircle },
  { status: 'not_going', label: "Can't go", icon: X },
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
}: EventEngagementProps) {
  const DETAIL_PREVIEW_COUNT = 5;
  const { userRsvp, going, maybe, notGoing } = rsvpState;
  const [showAllComments, setShowAllComments] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; userName: string } | null>(null);

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

  return (
    <section className={variant === 'detail' ? 'sbn-card p-4 space-y-3' : ''}>
      {variant === 'detail' && (
        <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
          {commentsLocked ? 'RSVP' : 'RSVP & discussion'}
        </h3>
      )}

      <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${variant === 'card' ? 'mt-2' : ''}`}>
        {!rsvpDisabled &&
          RSVP_OPTIONS.map(({ status, label, icon: Icon }) => {
          const count = status === 'going' ? going : status === 'maybe' ? maybe : notGoing;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onRsvp(status)}
              className={rsvpBtnClass(userRsvp === status)}
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
              Comments open once we reach 1,000 neighbors. You can still RSVP Going, Maybe, or Can&apos;t go.
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
                  const canReport = userProfile && !isOwnComment && comment.userId !== hostUserId;
                  return (
                    <li key={comment.id} className="bg-inset rounded-xl p-3 border border-app">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(comment.userId)}
                          className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-90 cursor-pointer"
                          disabled={!onViewProfile}
                        >
                          <img
                            src={
                              comment.userPhoto ||
                              `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.userName)}`
                            }
                            alt=""
                            className="w-6 h-6 rounded-full border border-app shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-xs font-bold text-app">{comment.userName}</span>
                          <span className="text-[10px] text-accent font-medium">{comment.userNeighborhood}</span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOwnComment && onDeleteComment && (
                            <button
                              type="button"
                              onClick={() => onDeleteComment(comment.id)}
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
