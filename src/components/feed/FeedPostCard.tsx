import { useState } from 'react';
import { Flag, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { isStaffRole } from '../../lib/roles';
import { PresenceUserAvatar } from '../UserAvatar';
import ReportNeighborModal from '../ReportNeighborModal';
import FeedPostClientBadge from './FeedPostClientBadge';
import FeedPollBlock from './FeedPollBlock';
import FeedEngagementBar from './FeedEngagementBar';
import { FeedPostViewCount } from '../MessageReadReceiptLabel';
import { feedPostPreview } from '../../lib/feedPostText';
import { formatDistanceToNow } from '../../lib/timeAgo';

interface FeedPostCardProps {
  post: FeedPost;
  userProfile: UserProfile;
  engagement: FeedEngagementApi;
  onViewPost?: (post: FeedPost) => void;
  onViewProfile?: (userId: string) => void;
  onEditPost?: (post: FeedPost) => void;
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
  onViewPost,
  onViewProfile,
  onEditPost,
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

  const canEdit = isOwn && !isPoll && Boolean(onEditPost);
  const canDelete = isOwn || isStaff;
  const canReport = !isOwn;
  const showOwnerActions = canEdit || canDelete;

  const openPost = () => onViewPost?.(post);

  return (
    <article
      className="item-feed-card sbn-feed-post relative overflow-hidden cursor-pointer"
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
      {showOwnerActions ? (
        <div
          className="absolute top-2 right-2 z-10 flex items-center gap-0.5 pointer-events-auto"
          onClick={(event) => event.stopPropagation()}
        >
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEditPost?.(post)}
              className={`p-2 rounded-full ${
                cover
                  ? 'bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm'
                  : 'text-muted hover:text-app hover:bg-inset'
              }`}
              title="Edit post"
              aria-label="Edit post"
            >
              <Pencil className="w-4 h-4" />
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDeletePost(post)}
              className={`p-2 rounded-full ${
                cover
                  ? 'bg-black/50 text-white hover:bg-red-500/90 backdrop-blur-sm'
                  : 'text-muted hover:text-red-400 hover:bg-red-500/10'
              }`}
              title="Delete post"
              aria-label="Delete post"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      {cover ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-inset pointer-events-none">
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          {extraPhotos > 0 && (
            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-full">
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
              <FeedPostViewCount count={post.viewCount ?? 0} />
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
          <FeedEngagementBar
            postId={post.id}
            authorId={post.userId}
            isOwn={isOwn}
            votes={votes}
            reactions={reactions}
            votesLoading={engagement.votesLoading}
            engagement={engagement}
            layout="compact"
            commentCount={comments.length}
            onComment={openPost}
          />

          {canReport ? (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-red-500/10"
                title="Report post"
                aria-label="Report post"
              >
                <Flag className="w-4 h-4" />
              </button>
            </div>
          ) : null}
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
