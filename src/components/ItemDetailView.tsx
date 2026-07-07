import { ArrowLeft, Bookmark, Calendar, ExternalLink, MapPin, MessageSquare, Pencil, Tag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ItemPost, extractGPSCoordinates, ItemComment, ListingSubItem, UserProfile } from '../types';
import {
  canViewerSeeExactLocation,
  categoryRequiresGps,
  convertPercentToLatLng,
  hasStoredGps,
  isLocationPrivate,
  parsePickupAddress,
  parseTradeSeeking,
} from '../lib/itemLocation';
import {
  getOwnerCompletedActionLabel,
  getPostTypeBadgeClass,
  getPostTypeCompletedLabel,
  getPostTypeLabel,
} from '../lib/postType';
import {
  extractListingImageUrls,
  getListingDetailsText,
  parsePickupNotes,
} from '../lib/listingContent';
import ListingPhotoGallery from './ListingPhotoGallery';
import ListingEngagement from './ListingEngagement';
import ItemDetailNavigation from './ItemDetailNavigation';
import { PostVoteState } from '../hooks/useItemsEngagement';
import { SubItemAvailabilityList } from './SubItemPicker';
import ClaimAtPickupButton from './ClaimAtPickupButton';
import { getListingSubitems } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useSavedItems } from '../hooks/useSavedItems';

interface ItemDetailViewProps {
  item: ItemPost;
  currentUserId: string;
  userProfile?: UserProfile;
  userLat?: number | null;
  userLng?: number | null;
  onClose: () => void;
  onMessage?: () => void;
  onClaimSubmitted?: (chatId: string) => void;
  onOpenChat?: (chatId: string) => void;
  onEdit: () => void;
  onUpdateStatus: (status: 'completed' | 'withdrawn' | 'active' | 'pending_pickup' | 'on_hold') => void;
  onViewProfile: (userId: string) => void;
  voteState: PostVoteState;
  comments: ItemComment[];
  onVote: (direction: 'up' | 'down') => void;
  onAddComment: (text: string) => void;
  onDeleteComment?: (commentId: string) => void;
  onDelete?: () => void;
  updating?: boolean;
}

export default function ItemDetailView({
  item,
  currentUserId,
  userProfile,
  userLat = null,
  userLng = null,
  onClose,
  onMessage,
  onClaimSubmitted,
  onOpenChat,
  onEdit,
  onUpdateStatus,
  onViewProfile,
  voteState,
  comments,
  onVote,
  onAddComment,
  onDeleteComment,
  onDelete,
  updating = false,
}: ItemDetailViewProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const isOwner = item.userId === currentUserId;
  const isOpenForCoordination =
    item.status === 'active' || item.status === 'on_hold' || item.status === 'pending_pickup';

  const { isSaved, toggleSaved } = useSavedItems(currentUserId);
  const tradeSeeking = item.type === 'trade' ? parseTradeSeeking(item.description) : null;

  useEffect(() => {
    void getListingSubitems(item.id).then(setSubitems);
  }, [item.id]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void getListingSubitems(item.id).then(setSubitems);
    }, 100);

    return subscribePostgresChanges(
      {
        channelName: `live-detail-subitems-${item.id}`,
        table: 'listing_subitems',
        event: '*',
        filter: `itemId=eq.${item.id}`,
      },
      refresh,
    );
  }, [item.id]);

  const partialClaimed =
    subitems.length > 0 &&
    subitems.some((s) => s.status === 'claimed') &&
    subitems.some((s) => s.status === 'available');
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
      className="fixed inset-0 z-[80] bg-app overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <header className="sticky top-0 z-10 sbn-glass-nav sbn-safe-top px-4 min-h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-inset text-app"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-base text-app truncate flex-1">Listing details</h1>
        <button
          type="button"
          onClick={() => toggleSaved(item.id)}
          title={isSaved(item.id) ? 'Remove from saved' : 'Save this listing'}
          className={`p-2 rounded-full transition-colors shrink-0 ${
            isSaved(item.id)
              ? 'text-accent bg-accent-soft'
              : 'text-muted hover:text-accent hover:bg-inset'
          }`}
          aria-label={isSaved(item.id) ? 'Remove from saved' : 'Save listing'}
        >
          <Bookmark className={`w-5 h-5 ${isSaved(item.id) ? 'fill-current' : ''}`} />
        </button>
        {isOwner && isOpenForCoordination ? (
          <span className="text-xs font-medium text-muted shrink-0">Your listing</span>
        ) : !isOwner ? (
          isOpenForCoordination && onMessage && (
            <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0">
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          )
        ) : null}
      </header>

      <div className="sbn-page-content pb-36">
        <ListingPhotoGallery urls={photos} title={item.title} />

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`sbn-badge ${getPostTypeBadgeClass(item.type)}`}>
              {getPostTypeLabel(item.type)}
            </span>
            <span className="sbn-badge">{item.category}</span>
            {item.status === 'completed' && (
              <span className="sbn-badge sbn-badge-done">
                {getPostTypeCompletedLabel(item.type)}
              </span>
            )}
            {partialClaimed && (
              <span className="sbn-badge sbn-badge-done">
                {subitems.filter((s) => s.status === 'claimed').length}/{subitems.length} claimed
              </span>
            )}
            {item.status === 'withdrawn' && <span className="sbn-badge">Withdrawn</span>}
            {item.status === 'pending_pickup' && <span className="sbn-badge sbn-badge-done">Pending pickup</span>}
            {item.status === 'on_hold' && <span className="sbn-badge">On hold</span>}
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-app leading-tight">{item.title}</h2>

          {tradeSeeking && (
            <section className="sbn-card p-4 space-y-2 border border-purple-500/25 bg-purple-500/5">
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wide">Seeking in trade</h3>
              <p className="text-app text-sm sm:text-base leading-relaxed">{tradeSeeking}</p>
            </section>
          )}

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
              <div className="space-y-3">
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

            {/* Renders itself only when there's a pickup pin OR an already-active Go Get
                session — the latter matters for Looking/Trade, where the destination is
                wherever the fulfiller is, not the listing's own (often absent) pin. */}
            {userProfile && (
              <ItemDetailNavigation
                item={item}
                currentUserId={currentUserId}
                userProfile={userProfile}
                onOpenChat={onOpenChat}
              />
            )}
          </section>

          <SubItemAvailabilityList subitems={subitems} />

          <ListingEngagement
            posterUserId={item.userId}
            currentUserId={currentUserId}
            voteState={voteState}
            comments={comments}
            commentsExpanded
            onVote={onVote}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            userProfile={userProfile}
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
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('completed')}
                    className="sbn-btn sbn-btn-secondary col-span-2"
                  >
                    {getOwnerCompletedActionLabel(item.type)}
                  </button>
                  <p className="col-span-2 text-[11px] text-muted text-center leading-snug">
                    {item.type === 'trade'
                      ? 'Confirm the swap in Messages once you and your neighbor have traded.'
                      : item.type === 'looking'
                        ? 'Mark fulfilled once a neighbor has helped with your request.'
                        : 'Confirm neighbor pickups from Messages, or when they self-claim at the pin.'}
                  </p>
                </div>
              ) : item.status === 'pending_pickup' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('completed')}
                    className="sbn-btn sbn-btn-primary"
                  >
                    Mark picked up
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-secondary"
                  >
                    Back to active
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('on_hold')}
                    className="sbn-btn sbn-btn-ghost col-span-2"
                  >
                    Put on hold
                  </button>
                </div>
              ) : item.status === 'on_hold' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-primary"
                  >
                    Release hold
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('pending_pickup')}
                    className="sbn-btn sbn-btn-secondary"
                  >
                    Pending pickup
                  </button>
                </div>
              ) : item.status === 'withdrawn' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={onEdit}
                    className="sbn-btn sbn-btn-secondary"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit & repost
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => onUpdateStatus('active')}
                    className="sbn-btn sbn-btn-primary"
                  >
                    Repost
                  </button>
                  {onDelete && (
                    <button
                      type="button"
                      disabled={updating}
                      onClick={onDelete}
                      className="sbn-btn sbn-btn-ghost text-red-400 border-red-900/50 hover:bg-red-950/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              ) : null}
              <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary w-full">
                Back
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
                  Back
                </button>
                {isOpenForCoordination && onMessage && (
                  <button type="button" onClick={onMessage} className="sbn-btn sbn-btn-primary flex-1">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                )}
              </div>
              {item.status === 'active' && userProfile && onClaimSubmitted && item.type === 'giveaway' && (
                <ClaimAtPickupButton
                  item={item}
                  user={userProfile}
                  userLat={userLat}
                  userLng={userLng}
                  onClaimSubmitted={onClaimSubmitted}
                  className="w-full"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
