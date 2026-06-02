import { Calendar, Eye, MapPin, MessageSquare, Pencil, Tag } from 'lucide-react';
import { ItemComment, ItemPost, UserProfile } from '../types';
import { stripListingMetadata } from '../lib/itemLocation';
import { extractListingImageUrls } from '../lib/listingContent';
import ListingEngagement from './ListingEngagement';
import ListingImage from './ListingImage';
import { PostVoteState } from '../hooks/useItemsEngagement';

export type ItemCardVoteState = PostVoteState;

interface ItemCardProps {
  item: ItemPost;
  currentUserId: string;
  voteState: ItemCardVoteState;
  comments: ItemComment[];
  commentsExpanded: boolean;
  updating: boolean;
  onVote: (direction: 'up' | 'down') => void;
  onToggleComments: () => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  userProfile?: UserProfile;
  onUpdateStatus: (status: 'completed' | 'withdrawn' | 'active' | 'pending_pickup' | 'on_hold') => void;
  onEdit: () => void;
  onViewDetail: () => void;
  onMessage: () => void;
  onViewProfile: (userId: string) => void;
}

export default function ItemCard({
  item,
  currentUserId,
  voteState,
  comments,
  commentsExpanded,
  updating,
  onVote,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  userProfile,
  onUpdateStatus,
  onEdit,
  onViewDetail,
  onMessage,
  onViewProfile,
}: ItemCardProps) {
  const isOwner = item.userId === currentUserId;
  const inactive = item.status === 'completed' || item.status === 'withdrawn';

  const dateLabel = item.createdAt
    ? new Date(
        typeof item.createdAt === 'object' && 'seconds' in item.createdAt
          ? (item.createdAt as { seconds: number }).seconds * 1000
          : item.createdAt,
      ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Recent';

  const previewText = stripListingMetadata(item.description);
  const photos = item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item);
  const coverPhoto = photos[0];

  const statusBadges = (
    <>
      {item.type === 'giveaway' ? (
        <span className="sbn-badge sbn-badge-give text-[10px] sm:text-xs py-0.5">Giving</span>
      ) : (
        <span className="sbn-badge sbn-badge-ask text-[10px] sm:text-xs py-0.5">Looking for</span>
      )}
      {item.status === 'completed' && (
        <span className="sbn-badge sbn-badge-done text-[10px] sm:text-xs py-0.5">
          {item.type === 'giveaway' ? 'Claimed' : 'Fulfilled'}
        </span>
      )}
      {item.status === 'withdrawn' && (
        <span className="sbn-badge sbn-badge-withdrawn text-[10px] sm:text-xs py-0.5">Withdrawn</span>
      )}
      {item.status === 'pending_pickup' && (
        <span className="sbn-badge sbn-badge-done text-[10px] sm:text-xs py-0.5">Pending pickup</span>
      )}
      {item.status === 'on_hold' && (
        <span className="sbn-badge text-[10px] sm:text-xs py-0.5">On hold</span>
      )}
      {item.status === 'active' && (
        <span className="sbn-badge sbn-badge-give text-[10px] sm:text-xs py-0.5 sm:inline-flex hidden">
          Active
        </span>
      )}
    </>
  );

  const actionButtons = isOwner ? (
    <div className="flex flex-wrap gap-1 justify-end">
      <button type="button" onClick={onViewDetail} className="sbn-btn sbn-btn-sm sbn-btn-secondary shrink-0">
        <Eye className="w-3.5 h-3.5 sm:mr-0" />
        <span className="hidden sm:inline ml-1">View</span>
      </button>
      <button
        type="button"
        disabled={updating}
        onClick={onEdit}
        className="sbn-btn sbn-btn-sm sbn-btn-primary shrink-0"
        title="Edit listing"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">Edit</span>
      </button>
      {item.status === 'active' ? (
        <>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('withdrawn')}
            className="sbn-btn sbn-btn-sm sbn-btn-ghost hidden sm:inline-flex"
          >
            Withdraw
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('completed')}
            className="sbn-btn sbn-btn-sm sbn-btn-secondary hidden sm:inline-flex"
          >
            Mark claimed
          </button>
        </>
      ) : item.status === 'pending_pickup' ? (
        <>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('active')}
            className="sbn-btn sbn-btn-sm sbn-btn-primary hidden sm:inline-flex"
          >
            Mark available
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('completed')}
            className="sbn-btn sbn-btn-sm sbn-btn-ghost hidden sm:inline-flex"
          >
            Mark picked up
          </button>
        </>
      ) : item.status === 'on_hold' ? (
        <>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('active')}
            className="sbn-btn sbn-btn-sm sbn-btn-primary hidden sm:inline-flex"
          >
            Release hold
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => onUpdateStatus('pending_pickup')}
            className="sbn-btn sbn-btn-sm sbn-btn-ghost hidden sm:inline-flex"
          >
            Pending pickup
          </button>
        </>
      ) : item.status === 'withdrawn' ? (
        <button
          type="button"
          disabled={updating}
          onClick={() => onUpdateStatus('active')}
          className="sbn-btn sbn-btn-sm sbn-btn-primary hidden sm:inline-flex"
        >
          Relist
        </button>
      ) : null}
    </div>
  ) : item.status !== 'withdrawn' ? (
    <div className="flex flex-wrap gap-1 justify-end">
      <button type="button" onClick={onViewDetail} className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0">
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">View</span>
      </button>
      <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">Message</span>
      </button>
    </div>
  ) : (
    <span className="text-[10px] font-medium text-muted">Archived</span>
  );

  return (
    <article
      id={`item_card_${item.id}`}
      className={`item-feed-card item-feed-card--responsive flex flex-row sm:flex-col ${inactive ? 'opacity-75' : ''}`}
    >
      <button
        type="button"
        onClick={onViewDetail}
        className={`relative shrink-0 overflow-hidden bg-inset text-left cursor-pointer
          w-[5.25rem] h-[5.25rem] sm:w-full sm:h-auto sm:aspect-[16/10]
          ${!coverPhoto ? 'flex items-center justify-center border-r sm:border-r-0 border-app' : ''}`}
      >
        {coverPhoto ? (
          <>
            <ListingImage
              src={coverPhoto}
              alt={item.title}
              width={480}
              className="h-full w-full object-cover"
            />
            {photos.length > 1 && (
              <span className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 text-[8px] sm:text-[10px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-full">
                +{photos.length - 1}
              </span>
            )}
          </>
        ) : (
          <Tag className="w-6 h-6 text-subtle" aria-hidden />
        )}
      </button>

      <div className="flex-1 min-w-0 flex flex-col p-2.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">{statusBadges}</div>

        <button type="button" onClick={onViewDetail} className="text-left w-full mt-1 sm:mt-3 cursor-pointer">
          <h3 className="font-display text-sm sm:text-lg font-bold text-app leading-snug hover:text-accent transition-colors line-clamp-2 sm:line-clamp-none">
            {item.title}
          </h3>
        </button>

        <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
          <Tag className="w-3 h-3 text-accent shrink-0" />
          <span className="truncate">{item.category}</span>
        </p>

        <p className="hidden sm:block text-sm text-muted mt-2 leading-relaxed line-clamp-3">{previewText}</p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 sm:mt-3 text-[10px] sm:text-xs text-muted">
          <span className="inline-flex items-center gap-0.5 min-w-0 truncate">
            <MapPin className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{item.neighborhood}</span>
          </span>
          <span className="inline-flex items-center gap-0.5 shrink-0">
            <Calendar className="w-3 h-3 shrink-0" />
            {dateLabel}
          </span>
        </div>

        <ListingEngagement
          posterUserId={item.userId}
          currentUserId={currentUserId}
          voteState={voteState}
          comments={comments}
          commentsExpanded={commentsExpanded}
          onVote={onVote}
          onToggleComments={onViewDetail}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          userProfile={userProfile}
          onViewProfile={onViewProfile}
          variant="card"
        />

        <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-app flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onViewProfile(item.userId)}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-left hover:opacity-90 cursor-pointer"
          >
            <img
              src={
                item.userPhotoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`
              }
              alt=""
              className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border border-app shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-app truncate">{item.userDisplayName}</p>
              <p className="text-[9px] sm:text-[10px] text-muted hidden sm:block">View profile</p>
            </div>
          </button>

          {actionButtons}
        </div>
      </div>
    </article>
  );
}
