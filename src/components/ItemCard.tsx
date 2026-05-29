import { Calendar, Eye, MapPin, MessageSquare, Pencil, Tag, Trash2 } from 'lucide-react';
import { ItemComment, ItemPost } from '../types';
import { stripListingMetadata } from '../lib/itemLocation';
import { extractListingImageUrls } from '../lib/listingContent';
import ListingEngagement from './ListingEngagement';
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
  onUpdateStatus: (status: 'completed' | 'withdrawn' | 'active') => void;
  onEdit: () => void;
  onViewDetail: () => void;
  onDelete: () => void;
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
  onUpdateStatus,
  onEdit,
  onViewDetail,
  onDelete,
  onMessage,
  onViewProfile,
}: ItemCardProps) {
  const isOwner = item.userId === currentUserId;
  const inactive = item.status !== 'active';

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

  return (
    <article
      id={`item_card_${item.id}`}
      className={`item-feed-card flex flex-col ${inactive ? 'opacity-75' : ''}`}
    >
      {coverPhoto && (
        <button
          type="button"
          onClick={onViewDetail}
          className="relative aspect-[16/10] overflow-hidden bg-zinc-100 w-full text-left cursor-pointer"
        >
          <img
            src={coverPhoto}
            alt={item.title}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          {photos.length > 1 && (
            <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/70 text-white px-2 py-0.5 rounded-full">
              +{photos.length - 1} photos
            </span>
          )}
        </button>
      )}

      <div className="p-4 flex flex-col flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {item.type === 'giveaway' ? (
            <span className="sbn-badge sbn-badge-give">Giving</span>
          ) : (
            <span className="sbn-badge sbn-badge-ask">Looking for</span>
          )}
          {item.status === 'completed' && (
            <span className="sbn-badge sbn-badge-done">
              {item.type === 'giveaway' ? 'Claimed' : 'Fulfilled'}
            </span>
          )}
          {item.status === 'withdrawn' && (
            <span className="sbn-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>
              Withdrawn
            </span>
          )}
          {item.status === 'active' && (
            <span className="sbn-badge sbn-badge-give">Active</span>
          )}
        </div>

        <button
          type="button"
          onClick={onViewDetail}
          className="text-left w-full mt-3 cursor-pointer"
        >
          <h3 className="font-display text-lg font-bold text-card leading-snug hover:text-accent transition-colors">
            {item.title}
          </h3>
        </button>

        <p className="text-xs font-medium text-card-muted flex items-center gap-1 mt-1">
          <Tag className="w-3 h-3 text-accent shrink-0" />
          {item.category}
        </p>

        <p className="text-sm text-card-muted mt-2 leading-relaxed line-clamp-3">{previewText}</p>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-card-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            {item.neighborhood}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
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
          onToggleComments={onToggleComments}
          onAddComment={onAddComment}
          onViewProfile={onViewProfile}
          variant="card"
        />

        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onViewProfile(item.userId)}
            className="flex items-center gap-2 min-w-0 text-left hover:opacity-90 cursor-pointer"
          >
            <img
              src={
                item.userPhotoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`
              }
              alt=""
              className="w-9 h-9 rounded-full border border-zinc-200 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card truncate">{item.userDisplayName}</p>
              <p className="text-[10px] text-card-muted">View profile</p>
            </div>
          </button>

          {isOwner ? (
            <div className="flex flex-wrap gap-1 justify-end">
              <button
                type="button"
                onClick={onViewDetail}
                className="sbn-btn sbn-btn-sm sbn-btn-secondary shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={onEdit}
                className="sbn-btn sbn-btn-sm sbn-btn-primary shrink-0"
                title="Edit listing"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
              {item.status === 'active' ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => onUpdateStatus('withdrawn')}
                  className="sbn-btn sbn-btn-sm sbn-btn-ghost"
                >
                  Withdraw
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-sm sbn-btn-primary"
                  >
                    Relist
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={onDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (item.status === 'active' || item.status === 'completed') ? (
            <div className="flex flex-wrap gap-1 justify-end">
              <button type="button" onClick={onViewDetail} className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0">
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </button>
            </div>
          ) : (
            <span className="text-[10px] font-medium text-card-muted">Archived</span>
          )}
        </div>
      </div>
    </article>
  );
}
