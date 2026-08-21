import { Fragment, useEffect, useState } from 'react';
import { Flag, MessageSquare, Reply, Trash2 } from 'lucide-react';
import type { FeedPost, FeedPostCommentNode, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { buildFeedCommentTree, submitFeedContentReport } from '../../lib/feedApi';
import { isStaffRole } from '../../lib/roles';
import { shouldShowStaffBadgeOnComment } from '../../lib/staffInteractionMode';
import { getUserDisplayInfoByIds } from '../../supabase';
import { useConfirm } from '../../contexts/ConfirmContext';
import ReportNeighborModal from '../ReportNeighborModal';
import RoleBadge from '../RoleBadge';
import { PresenceUserAvatar } from '../UserAvatar';
import { useUserDisplayInfo } from '../../hooks/useUserDisplayInfo';

interface FeedPostCommentsProps {
  post: FeedPost;
  userProfile: UserProfile;
  engagement: FeedEngagementApi;
  onViewProfile?: (userId: string) => void;
}

function CommentRow({
  node,
  post,
  userProfile,
  engagement,
  onViewProfile,
  onReplyTo,
  replyTargetId,
  replyText,
  setReplyText,
  onSubmitReply,
  commenterInfo,
  commenterRoles,
}: {
  node: FeedPostCommentNode;
  post: FeedPost;
  userProfile: UserProfile;
  engagement: FeedEngagementApi;
  onViewProfile?: (userId: string) => void;
  onReplyTo: (commentId: string | null) => void;
  replyTargetId: string | null;
  replyText: string;
  setReplyText: (v: string) => void;
  onSubmitReply: () => void;
  commenterInfo: Record<string, { photoURL?: string }>;
  commenterRoles: Record<string, UserProfile['role']>;
}) {
  const { confirm, alert } = useConfirm();
  const [reportOpen, setReportOpen] = useState(false);
  const isOwn = node.userId === userProfile.uid;
  const isStaff = isStaffRole(userProfile.role);
  const commenterRole = commenterRoles[node.userId];
  const commenterIsStaff = shouldShowStaffBadgeOnComment(commenterRole, node);
  const isReplying = replyTargetId === node.id;

  const requestStaffRemoval = async () => {
    const ok = await confirm({
      title: 'Request staff removal?',
      message: `Ask staff to remove ${node.userName}'s comment? They'll review your request.`,
      confirmLabel: 'Request removal',
      variant: 'danger',
    });
    if (!ok) return;
    const result = await submitFeedContentReport({
      reporter: userProfile,
      reportedUserId: node.userId,
      reportedUserName: node.userName,
      subject: `Feed comment removal: ${node.userName}`,
      body: `Neighbor requested staff remove this comment on a feed post.\n\nComment: "${node.text.slice(0, 500)}"`,
      feedPostId: post.id,
      feedCommentId: node.id,
    });
    if (result.ok) {
      await alert({ title: 'Sent to staff', message: 'Thanks — staff will review this comment.' });
    } else {
      await alert({ title: 'Could not send', message: result.errorMessage || 'Try again.' });
    }
  };

  return (
    <li className="space-y-2">
      <div
        className={`item-feed-card p-3 ${
          commenterIsStaff ? 'border border-accent/20 bg-accent/5' : ''
        }`}
        style={{ marginLeft: `${Math.min(node.depth, 4) * 0.75}rem` }}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onViewProfile?.(node.userId)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left"
            disabled={!onViewProfile}
          >
            <PresenceUserAvatar
              uid={node.userId}
              src={commenterInfo[node.userId]?.photoURL ?? node.userPhoto}
              name={node.userName}
              size="xs"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold text-app">{node.userName}</span>
              {commenterIsStaff && commenterRole ? (
                <span className="scale-[0.8] origin-left ml-1.5">
                  <RoleBadge role={commenterRole} />
                </span>
              ) : (
                <span className="text-[10px] text-accent font-medium ml-1.5">{node.userNeighborhood}</span>
              )}
            </div>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            {!isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => void requestStaffRemoval()}
                  className="p-1.5 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                  title="Request staff to remove"
                  aria-label="Request staff to remove comment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="p-1.5 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                  title={`Report ${node.userName}`}
                  aria-label={`Report ${node.userName}`}
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {(isOwn || isStaff) && (
              <button
                type="button"
                onClick={() => void engagement.removeComment(post.id, node.id)}
                className="p-1.5 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                title="Delete comment"
                aria-label="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-app mt-2 leading-relaxed whitespace-pre-wrap">{node.text}</p>
        <button
          type="button"
          onClick={() => onReplyTo(isReplying ? null : node.id)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-muted hover:text-accent"
        >
          <Reply className="w-3.5 h-3.5" />
          Reply
        </button>
        {isReplying && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${node.userName}…`}
              className="sbn-input flex-1 text-sm py-2"
            />
            <button
              type="button"
              onClick={onSubmitReply}
              className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
            >
              Send
            </button>
          </div>
        )}
      </div>
      {node.replies.length > 0 && (
        <ul className="space-y-2">
          {node.replies.map((child) => (
            <Fragment key={child.id}>
              <CommentRow
                node={child}
                post={post}
                userProfile={userProfile}
                engagement={engagement}
                onViewProfile={onViewProfile}
                onReplyTo={onReplyTo}
                replyTargetId={replyTargetId}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={onSubmitReply}
                commenterInfo={commenterInfo}
                commenterRoles={commenterRoles}
              />
            </Fragment>
          ))}
        </ul>
      )}
      {reportOpen && (
        <ReportNeighborModal
          reporter={userProfile}
          reportedUserId={node.userId}
          reportedUserName={node.userName}
          feedPostId={post.id}
          feedCommentId={node.id}
          onClose={() => setReportOpen(false)}
        />
      )}
    </li>
  );
}

export default function FeedPostComments({
  post,
  userProfile,
  engagement,
  onViewProfile,
}: FeedPostCommentsProps) {
  const [draft, setDraft] = useState('');
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [commenterRoles, setCommenterRoles] = useState<Record<string, UserProfile['role']>>({});

  const flat = engagement.getComments(post.id);
  const tree = buildFeedCommentTree(flat);
  const commenterInfo = useUserDisplayInfo(
    flat.map((comment) => comment.userId),
    userProfile,
  );

  useEffect(() => {
    const ids = [...new Set(flat.map((comment) => comment.userId).filter(Boolean))] as string[];
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
  }, [flat]);

  const submitTopLevel = async () => {
    const ok = await engagement.addComment(post.id, draft, null);
    if (ok) setDraft('');
  };

  const submitReply = async () => {
    if (!replyTargetId) return;
    const ok = await engagement.addComment(post.id, replyText, replyTargetId);
    if (ok) {
      setReplyText('');
      setReplyTargetId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted" />
        <h4 className="text-xs font-semibold text-muted uppercase tracking-wide">
          Comments ({flat.length})
        </h4>
      </div>

      {tree.length === 0 ? (
        <p className="text-xs text-muted italic text-center py-1">Be the first to comment.</p>
      ) : (
        <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
          {tree.map((node) => (
            <Fragment key={node.id}>
              <CommentRow
                node={node}
                post={post}
                userProfile={userProfile}
                engagement={engagement}
                onViewProfile={onViewProfile}
                onReplyTo={(id) => {
                  setReplyTargetId(id);
                  if (!id) setReplyText('');
                }}
                replyTargetId={replyTargetId}
                replyText={replyText}
                setReplyText={setReplyText}
                onSubmitReply={() => void submitReply()}
                commenterInfo={commenterInfo}
                commenterRoles={commenterRoles}
              />
            </Fragment>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a comment…"
          className="sbn-input flex-1 text-sm py-2.5"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submitTopLevel();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void submitTopLevel()}
          className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
        >
          Comment
        </button>
      </div>
    </section>
  );
}
