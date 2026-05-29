import { ArrowLeft, Calendar, ExternalLink, MapPin, MessageSquare, Pencil, Tag } from 'lucide-react';
import { ItemPost, extractGPSCoordinates } from '../types';
import {
  canViewerSeeExactLocation,
  categoryRequiresGps,
  convertPercentToLatLng,
  hasStoredGps,
  isLocationPrivate,
  parsePickupAddress,
} from '../lib/itemLocation';
import {
  extractListingImageUrls,
  getListingDetailsText,
  parsePickupNotes,
} from '../lib/listingContent';
import ListingPhotoGallery from './ListingPhotoGallery';
import ListingEngagement from './ListingEngagement';
import { PostVoteState } from '../hooks/useItemsEngagement';
import { ItemComment } from '../types';

interface ItemDetailViewProps {
  item: ItemPost;
  currentUserId: string;
  onClose: () => void;
  onMessage?: () => void;
  onEdit: () => void;
  onUpdateStatus: (status: 'completed' | 'withdrawn' | 'active') => void;
  onDelete?: () => void;
  onViewProfile: (userId: string) => void;
  voteState: PostVoteState;
  comments: ItemComment[];
  onVote: (direction: 'up' | 'down') => void;
  onAddComment: (text: string) => void;
  updating?: boolean;
}

export default function ItemDetailView({
  item,
  currentUserId,
  onClose,
  onMessage,
  onEdit,
  onUpdateStatus,
  onDelete,
  onViewProfile,
  voteState,
  comments,
  onVote,
  onAddComment,
  updating = false,
}: ItemDetailViewProps) {
  const isOwner = item.userId === currentUserId;
  const photos = item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item);
  const detailsText = getListingDetailsText(item.description);
  const pickupNotesText = parsePickupNotes(item.description);
  const showExact = canViewerSeeExactLocation(item, currentUserId);
  const gps = showExact ? extractGPSCoordinates(item.description) : null;
  const storedAddress = parsePickupAddress(item.description);
  const address = isOwner ? storedAddress : null;
  const mapsUrl = gps
    ? (() => {
        const { lat, lng } = convertPercentToLatLng(gps.x, gps.y);
        return `https://www.google.com/maps?q=${lat},${lng}`;
      })()
    : null;

  const dateLabel = item.createdAt
    ? new Date(
        typeof item.createdAt === 'object' && 'seconds' in item.createdAt
          ? (item.createdAt as { seconds: number }).seconds * 1000
          : item.createdAt,
      ).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Recently posted';

  return (
    <div
      id="item_detail_fullscreen"
      className="fixed inset-0 z-[60] bg-app overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <header className="sticky top-0 z-10 sbn-glass-nav px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-inset text-app"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-base text-app truncate flex-1">Listing details</h1>
        {isOwner && item.status === 'active' ? (
          <span className="text-xs font-medium text-muted shrink-0">Your listing</span>
        ) : !isOwner ? (
          item.status === 'active' && onMessage && (
            <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          )
        ) : null}
      </header>

      <div className="max-w-2xl mx-auto pb-36">
        <ListingPhotoGallery urls={photos} title={item.title} />

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`sbn-badge ${item.type === 'giveaway' ? 'sbn-badge-give' : 'sbn-badge-ask'}`}>
              {item.type === 'giveaway' ? 'Giving' : 'Looking for'}
            </span>
            <span className="sbn-badge">{item.category}</span>
            {item.status === 'completed' && (
              <span className="sbn-badge sbn-badge-done">
                {item.type === 'giveaway' ? 'Claimed' : 'Fulfilled'}
              </span>
            )}
            {item.status === 'withdrawn' && <span className="sbn-badge">Withdrawn</span>}
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-app leading-tight">{item.title}</h2>

          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent" />
              {item.neighborhood}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {item.userDisplayName}
            </span>
          </div>

          <section className="sbn-card p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Details</h3>
            <p className="text-app text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{detailsText}</p>
          </section>

          {pickupNotesText && (
            <section className="sbn-card p-4 space-y-2">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Pickup notes</h3>
              <p className="text-app text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{pickupNotesText}</p>
            </section>
          )}

          <section className="sbn-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Pickup location</h3>
            {showExact && mapsUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-app">
                  Exact pickup spot is shared for this listing.
                  {address ? ` Address: ${address}` : ''}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="sbn-btn sbn-btn-secondary sbn-btn-sm inline-flex"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Maps
                </a>
              </div>
            ) : isOwner && storedAddress && !showExact ? (
              <div className="space-y-2">
                <p className="text-sm text-app">
                  Address on file (not public): <strong>{storedAddress}</strong>
                </p>
                <p className="text-sm text-muted">
                  Map pin is hidden from others. Use chat → Send pickup location / address when you are ready to
                  share.
                </p>
              </div>
            ) : isOwner && storedAddress && showExact ? (
              <p className="text-sm text-app">
                Address on file: <strong>{storedAddress}</strong>
              </p>
            ) : hasStoredGps(item.description) && isLocationPrivate(item.description) && !isOwner ? (
              <p className="text-sm text-muted">
                Exact address is private. Message {item.userDisplayName} to coordinate pickup — they can send
                the location in chat.
              </p>
            ) : categoryRequiresGps(item.category) && !hasStoredGps(item.description) ? (
              <p className="text-sm text-muted">
                Neighborhood only ({item.neighborhood}). Message the poster for curb/porch details.
              </p>
            ) : (
              <p className="text-sm text-muted">
                Showing general area: <strong className="text-app">{item.neighborhood}</strong>. Message the
                poster if you need the exact address.
              </p>
            )}
          </section>

          <ListingEngagement
            posterUserId={item.userId}
            currentUserId={currentUserId}
            voteState={voteState}
            comments={comments}
            commentsExpanded
            onVote={onVote}
            onAddComment={onAddComment}
            onViewProfile={onViewProfile}
            variant="detail"
          />

          <button
            type="button"
            onClick={() => onViewProfile(item.userId)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-inset border border-app w-full text-left hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <img
              src={
                item.userPhotoURL ||
                `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`
              }
              alt=""
              className="w-12 h-12 rounded-full border border-app"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-app">{item.userDisplayName}</p>
              <p className="text-xs text-accent">View neighbor profile</p>
            </div>
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 sbn-glass-nav border-t border-app safe-area-pb">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {isOwner ? (
            <>
              {item.status === 'active' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={onEdit}
                    className="sbn-btn sbn-btn-primary"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('withdrawn')}
                    className="sbn-btn sbn-btn-ghost"
                  >
                    Withdraw
                  </button>
                  <p className="col-span-2 text-[11px] text-muted text-center leading-snug">
                    Mark as claimed or fulfilled from the Messages tab in this chat.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-primary"
                  >
                    Relist
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={onDelete}
                      className="sbn-btn sbn-btn-ghost text-red-600 dark:text-red-400"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
              <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary w-full">
                Back
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
                Back
              </button>
              {item.status === 'active' && onMessage && (
                <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary flex-1">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
