import { Bookmark, Calendar, Eye, LifeBuoy, MapPin, MessageSquare, Navigation, Pencil, Tag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ItemComment, ItemPost, UserProfile } from '../types';
import { stripListingMetadata, parseTradeSeeking } from '../lib/itemLocation';
import {
  getPostTypeBadgeClass,
  getPostTypeCompletedLabel,
  getPostTypeCardColumnLabel,
  getPostTypeGridBadgeLabel,
  getListingContactButtonLabel,
} from '../lib/postType';
import { extractListingImageUrls } from '../lib/listingContent';
import { getListingNavigateLabel } from '../lib/listingMapActions';
import { formatRouteDistance } from '../lib/mapRoute';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { isListingOpenForCoordination } from '../lib/roles';
import ListingEngagement from './ListingEngagement';
import ListingImage from './ListingImage';
import ListingViewBadge from './ListingViewBadge';
import { ListingCardEngagementOverlay, ListingCardStatsInline } from './ListingCardStats';
import UserAvatar from './UserAvatar';
import { usePresence } from '../contexts/PresenceContext';
import { PostVoteState } from '../hooks/useItemsEngagement';

export type ItemCardVoteState = PostVoteState;

interface ItemCardProps {
  item: ItemPost;
  currentUserId: string;
  voteState: ItemCardVoteState;
  comments: ItemComment[];
  commentsExpanded: boolean;
  updating: boolean;
  isSaved?: boolean;
  onSave?: (itemId: string) => void;
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
  /** Straight-line distance from user to item pin, in meters. Shown as a badge when provided. */
  distanceMeters?: number | null;
  /** Open navigation directly from the card (map-view parity). */
  onNavigate?: () => void;
  /** Staff opens reverse support thread about this listing. */
  onStaffChat?: () => void;
  /** When false, hide Go Get / navigate coordination actions. */
  showPickupCoordination?: boolean;
  /** List rows (default) or compact proximity grid tiles. */
  layout?: 'list' | 'grid';
}

export default function ItemCard({
  item,
  currentUserId,
  voteState,
  comments,
  commentsExpanded,
  updating,
  isSaved = false,
  onSave,
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
  distanceMeters,
  onNavigate,
  onStaffChat,
  showPickupCoordination = true,
  layout = 'list',
}: ItemCardProps) {
  const authorLastActive = usePresence(item.userId);
  const isOwner = item.userId === currentUserId;
  const isStaffOfficialMode = isStaffActingOfficial(userProfile);
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
  const [coverFailed, setCoverFailed] = useState(false);
  const showCoverPhoto = Boolean(coverPhoto) && !coverFailed;

  useEffect(() => {
    setCoverFailed(false);
  }, [coverPhoto, item.id]);

  const tradeSeeking = item.type === 'trade' ? parseTradeSeeking(item.description) : null;

  const typeBadgeLabel =
    item.status === 'completed'
      ? getPostTypeCompletedLabel(item.type)
      : getPostTypeCardColumnLabel(item.type);

  const statusDetailBadge =
    item.status === 'withdrawn' ? (
      <span className="sbn-badge sbn-badge-withdrawn text-[10px] sm:text-xs py-0.5">
        Withdrawn
      </span>
    ) : item.status === 'pending_pickup' ? (
      <span className="sbn-badge sbn-badge-done text-[10px] sm:text-xs py-0.5">
        Pending pickup
      </span>
    ) : item.status === 'on_hold' ? (
      <span className="sbn-badge text-[10px] sm:text-xs py-0.5">On hold</span>
    ) : null;

  const actionButtons = isOwner ? (
    <div className="contents">
      <button type="button" onClick={onViewDetail} aria-label="View listing" className="sbn-btn sbn-btn-sm sbn-btn-secondary shrink-0">
        <Eye className="w-3.5 h-3.5 sm:mr-0" />
        <span className="hidden sm:inline ml-1">View</span>
      </button>
      <button
        type="button"
        disabled={updating}
        onClick={onEdit}
        className="sbn-btn sbn-btn-sm sbn-btn-primary shrink-0"
        title="Edit listing"
        aria-label="Edit listing"
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
            Mark {item.type === 'trade' ? 'traded' : item.type === 'looking' ? 'fulfilled' : 'claimed'}
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
          className="sbn-btn sbn-btn-sm sbn-btn-primary shrink-0"
        >
          Repost
        </button>
      ) : null}
    </div>
  ) : item.status !== 'withdrawn' ? (
    <div className="contents">
      <button type="button" onClick={onViewDetail} aria-label="View listing" className="sbn-btn sbn-btn-secondary sbn-btn-sm shrink-0">
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline ml-1">View</span>
      </button>
      {isStaffOfficialMode && onStaffChat ? (
        <button
          type="button"
          onClick={onStaffChat}
          className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
          aria-label="Staff chat"
        >
          <LifeBuoy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">Staff chat</span>
        </button>
      ) : null}
      {showPickupCoordination && onNavigate && item.status === 'active' ? (
        <button
          type="button"
          onClick={onNavigate}
          className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
          aria-label={isStaffOfficialMode ? 'Navigate' : getListingNavigateLabel(item)}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">
            {isStaffOfficialMode ? 'Navigate' : getListingNavigateLabel(item)}
          </span>
        </button>
      ) : null}
      {isListingOpenForCoordination(item.status) ? (
        <button
          type="button"
          onClick={onMessage}
          aria-label={`${getListingContactButtonLabel(item.type)} about this listing`}
          className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline ml-1">{getListingContactButtonLabel(item.type)}</span>
        </button>
      ) : null}
    </div>
  ) : (
    <span className="text-[10px] font-medium text-muted">Archived</span>
  );

  if (layout === 'grid') {
    return (
      <article
        id={`item_card_${item.id}`}
        className={`item-feed-tile ${inactive ? 'opacity-75' : ''}`}
      >
        <button
          type="button"
          onClick={onViewDetail}
          className="item-feed-tile__hit w-full text-left cursor-pointer"
          aria-label={`${item.title}${distanceMeters != null ? `, ${formatRouteDistance(distanceMeters)} away` : ''}`}
        >
          <div className="item-feed-tile__media relative aspect-square overflow-hidden bg-inset">
            {showCoverPhoto ? (
              <ListingImage
                src={coverPhoto}
                alt=""
                width={320}
                className="h-full w-full object-cover"
                onLoadError={() => setCoverFailed(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Tag className="w-7 h-7 text-subtle" aria-hidden />
              </div>
            )}
            <ListingViewBadge count={item.viewCount ?? 0} showZero />
            <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1 p-1.5">
              <span
                className={`sbn-badge ${getPostTypeBadgeClass(item.type)} text-[8px] px-1 py-0 leading-none whitespace-nowrap shadow-sm`}
              >
                {getPostTypeGridBadgeLabel(item.type)}
              </span>
              {item.status === 'completed' && (
                <span className="sbn-badge sbn-badge-done text-[9px] py-0.5 shadow-sm">
                  {getPostTypeCompletedLabel(item.type)}
                </span>
              )}
            </div>
            <ListingCardEngagementOverlay
              upvotes={voteState.upvotes}
              downvotes={voteState.downvotes}
              commentCount={comments.length}
            />
          </div>
          <div className="item-feed-tile__body p-2">
            <h3 className="font-display text-xs font-bold text-app leading-snug line-clamp-2">{item.title}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted min-w-0">
              <span className="inline-flex items-center gap-0.5 min-w-0 truncate">
                <MapPin className="w-2.5 h-2.5 shrink-0 text-accent" aria-hidden />
                <span className="truncate">{item.neighborhood}</span>
              </span>
              {distanceMeters != null && (
                <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-accent">
                  <Navigation className="w-2.5 h-2.5 shrink-0" aria-hidden />
                  {formatRouteDistance(distanceMeters)}
                </span>
              )}
            </div>
          </div>
        </button>
      </article>
    );
  }

  return (
    <article
      id={`item_card_${item.id}`}
      className={`item-feed-card item-feed-card--responsive item-feed-card--list ${inactive ? 'opacity-75' : ''}`}
    >
      <div className="item-feed-card__main">
        <button
          type="button"
          onClick={onViewDetail}
          aria-label={`View ${item.title || 'listing'}`}
          className={`item-feed-card__media${showCoverPhoto ? '' : ' item-feed-card__media--empty'}`}
        >
          {showCoverPhoto ? (
            <ListingImage
              src={coverPhoto}
              alt={item.title}
              width={480}
              className="h-full w-full object-cover"
              onLoadError={() => setCoverFailed(true)}
            />
          ) : (
            <Tag className="w-6 h-6 text-subtle" aria-hidden />
          )}
        </button>

        <div className="item-feed-card__copy">
          <button type="button" onClick={onViewDetail} className="text-left w-full cursor-pointer">
            <h3 className="font-display text-sm sm:text-lg font-bold text-app leading-snug hover:text-accent transition-colors line-clamp-2 sm:line-clamp-none">
              {item.title}
            </h3>
          </button>

          <p className="text-[10px] sm:text-xs font-medium text-muted flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
            <Tag className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{item.category}</span>
          </p>

          {tradeSeeking && (
            <p className="text-[10px] sm:text-xs text-purple-400 mt-0.5 sm:mt-1 line-clamp-1">
              Seeking: {tradeSeeking}
            </p>
          )}

          <p className="hidden text-sm text-muted mt-2 leading-relaxed line-clamp-3">{previewText}</p>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 sm:mt-3 text-[10px] sm:text-xs text-muted">
            <span className="inline-flex items-center gap-0.5 min-w-0 truncate">
              <MapPin className="w-3 h-3 text-accent shrink-0" />
              <span className="truncate">{item.neighborhood}</span>
            </span>
            {distanceMeters != null && (
              <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-accent">
                <Navigation className="w-3 h-3 shrink-0" />
                {formatRouteDistance(distanceMeters)}
              </span>
            )}
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <Calendar className="w-3 h-3 shrink-0" />
              {dateLabel}
            </span>
            <ListingCardStatsInline
              viewCount={item.viewCount ?? 0}
              upvotes={voteState.upvotes}
              downvotes={voteState.downvotes}
              commentCount={comments.length}
            />
          </div>

          <ListingEngagement
            posterUserId={item.userId}
            currentUserId={currentUserId}
            voteState={voteState}
            comments={comments}
            commentsExpanded={commentsExpanded}
            onVote={onVote}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            userProfile={userProfile}
            onViewProfile={onViewProfile}
            variant="card"
          />

          <div className="flex flex-wrap items-center gap-1.5 mt-2" id={`item_type_row_${item.id}`}>
            <span className={`sbn-badge text-[10px] py-1 ${getPostTypeBadgeClass(item.type)}`}>
              {typeBadgeLabel}
            </span>
            {statusDetailBadge}
          </div>
        </div>
      </div>

      <div className="item-feed-card__footer">
        <button
          type="button"
          onClick={() => onViewProfile(item.userId)}
          className="item-feed-card__poster"
        >
          <UserAvatar
            uid={item.userId}
            src={item.userPhotoURL}
            name={item.userDisplayName}
            size="sm"
            lastActiveAt={authorLastActive ?? undefined}
            imgClassName="sm:w-10 sm:h-10"
          />
          <div className="item-feed-card__poster-copy">
            <p className="item-feed-card__poster-name">{item.userDisplayName}</p>
            <p className="text-[9px] sm:text-[10px] text-muted hidden sm:block">View profile</p>
          </div>
        </button>

        <div className="item-feed-card__actions">
          {onSave && (
            <button
              type="button"
              onClick={() => onSave(item.id)}
              title={isSaved ? 'Remove from saved' : 'Save this listing'}
              className={`sbn-btn sbn-btn-sm shrink-0 ${isSaved ? 'sbn-btn-primary' : 'sbn-btn-secondary'}`}
              aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline ml-1">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          )}
          {actionButtons}
        </div>
      </div>
    </article>
  );
}
