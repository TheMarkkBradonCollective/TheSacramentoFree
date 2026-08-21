import { useEffect, useMemo, useState } from 'react';
import { Flag, MessageSquare, Trash2 } from 'lucide-react';
import type { DiscussionComment, UserProfile } from '../types';
import ReportNeighborModal from './ReportNeighborModal';
import { useUserDisplayInfo } from '../hooks/useUserDisplayInfo';
import { PresenceUserAvatar } from './UserAvatar';
import RoleBadge from './RoleBadge';
import { getUserDisplayInfoByIds } from '../supabase';
import { shouldShowStaffBadgeOnComment } from '../lib/staffInteractionMode';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmRemoveComment } from '../lib/destructiveConfirm';

interface DiscussionCommentsProps {
  entityId: string;
  scope: 'announcement' | 'update';
  postedByUserId: string;
  comments: DiscussionComment[];
  currentUserId?: string;
  userProfile?: UserProfile | null;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onRequireSignIn?: () => void;
  onViewProfile?: (userId: string) => void;
}

const PREVIEW_COUNT = 5;

export default function DiscussionComments({
  entityId,
  scope,
  postedByUserId,
  comments,
  currentUserId,
  userProfile,
  onAddComment,
  onDeleteComment,
  onRequireSignIn,
  onViewProfile,
}: DiscussionCommentsProps) {
  const [showAllComments, setShowAllComments] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId: string; userName: string } | null>(null);
  const commenterInfo = useUserDisplayInfo(comments.map((comment) => comment.userId), userProfile);
  const [commenterRoles, setCommenterRoles] = useState<Record<string, UserProfile['role']>>({});
  const { confirm } = useConfirm();
  const inputName = `${scope}Comment-${entityId}`;
  const headingId = `${scope}-comments-${entityId}`;

  const requestDeleteComment = async (commentId: string) => {
    if (!onDeleteComment) return;
    const ok = await confirmRemoveComment(confirm);
    if (!ok) return;
    onDeleteComment(commentId);
  };

  const visibleComments = useMemo(() => {
    if (showAllComments) return comments;
    return comments.slice(-PREVIEW_COUNT);
  }, [comments, showAllComments]);

  const hasHiddenComments = comments.length > PREVIEW_COUNT && !showAllComments;
  const signedIn = Boolean(currentUserId);

  useEffect(() => {
    const ids = [...new Set(comments.map((comment) => comment.userId).filter(Boolean))];
    if (ids.length === 0) {
      setCommenterRoles({});
      return;
    }
    void getUserDisplayInfoByIds(ids).then((info) => {
      const roles: Record<string, UserProfile['role']> = {};
      for (const [userId, row] of Object.entries(info)) {
        if (row.role) roles[userId] = row.role;
      }
      setCommenterRoles(roles);
    });
  }, [comments]);

  return (
    <section className="mt-4 pt-4 border-t border-app space-y-3" aria-labelledby={headingId}>
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted" />
        <h4 id={headingId} className="text-xs font-semibold text-muted uppercase tracking-wide">
          Discussion ({comments.length})
        </h4>
      </div>

      {comments.length === 0 ? (
        <p className="text-xs text-muted italic text-center py-2">No comments yet — share your thoughts.</p>
      ) : (
        <>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {visibleComments.map((comment) => {
              const isOwnComment = comment.userId === currentUserId;
              const canReport = userProfile && !isOwnComment && comment.userId !== postedByUserId;
              const commenterRole = commenterRoles[comment.userId];
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

      {signedIn ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem(inputName) as HTMLInputElement;
            if (input?.value.trim()) {
              onAddComment(input.value.trim());
              input.value = '';
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            name={inputName}
            placeholder="Add a comment…"
            className="sbn-input flex-1 text-sm py-2"
            required
          />
          <button type="submit" className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
            Post
          </button>
        </form>
      ) : (
        <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-secondary sbn-btn-sm w-full">
          Sign in to comment
        </button>
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
