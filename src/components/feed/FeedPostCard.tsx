import { useState } from 'react';
import { Flag, MapPin, MessageSquare, Trash2 } from 'lucide-react';
import type { FeedPost, UserProfile } from '../../types';
import type { FeedEngagementApi } from '../../hooks/useFeedEngagement';
import { isStaffRole } from '../../lib/roles';
import { PresenceUserAvatar } from '../UserAvatar';
import ReportNeighborModal from '../ReportNeighborModal';
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
  const comments = engagement.getComments(post.id);
  const cover = post.imageUrls[0];
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
          <div className="mb-2 pointer-events-none">
            <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap">
              Post
            </span>
          </div>
        ) : null}

        <header className="flex items-start gap-2.5 pointer-events-none">
          <PresenceUserAvatar
            uid={post.userId}
            src={post.userPhotoURL}
            name={post.userDisplayName}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-app leading-snug truncate">{post.userDisplayName}</p>
            <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 truncate">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{post.neighborhood}</span>
              <span className="text-subtle">·</span>
              <span className="shrink-0">{timeLabel(post.createdAt)}</span>
            </p>
          </div>
        </header>

        {post.text.trim() ? (
          <p className="text-sm text-app leading-relaxed whitespace-pre-wrap mt-2.5 line-clamp-4 pointer-events-none">
            {post.text}
          </p>
        ) : null}

        <div
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 pt-3 border-t border-app"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={openPost}
            className="mr-auto flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold border border-app text-muted hover:border-accent transition-colors"
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
