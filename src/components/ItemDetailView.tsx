import { ArrowLeft, Bookmark, Calendar, ExternalLink, MapPin, MessageSquare, Pencil, Tag, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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
  getListingContactButtonLabel,
} from '../lib/postType';
import {
  extractListingImageUrls,
  getListingDetailsText,
  parsePickupNotes,
} from '../lib/listingContent';
import ListingPhotoGallery from './ListingPhotoGallery';
import ListingEngagement from './ListingEngagement';
import DetailActionFooter, { type DetailFooterButton } from './DetailActionFooter';
import { PresenceUserAvatar } from './UserAvatar';
import ItemDetailNavigation from './ItemDetailNavigation';
import { PostVoteState } from '../hooks/useItemsEngagement';
import { SubItemAvailabilityList } from './SubItemPicker';
import ClaimAtPickupButton from './ClaimAtPickupButton';
import StaffListingActions from './StaffListingActions';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { isListingOpenForCoordination } from '../lib/roles';
import { supportsInAppNavigation } from '../lib/goGetCoordinationGating';
import { isStaffRole } from '../lib/roles';
import { getListingSubitems, itemHasRecordedAppClaim, recordListingView } from '../supabase';
import { getPickupAttributionLabel, listingNeedsPickupAttribution } from '../lib/pickupAttribution';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useSavedItems } from '../hooks/useSavedItems';
import { useDismissOnEscape } from '../hooks/useDismissOnEscape';

interface ItemDetailViewProps {
  item: ItemPost;
  currentUserId: string;
  userProfile?: UserProfile;
  userLat?: number | null;
  userLng?: number | null;
  onClose: () => void;
  onMessage?: () => void;
  onStaffChat?: () => void;
  onListingStaffAction?: () => void;
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
  onEditPickupAttribution?: () => void;
  /** Open listing detail and auto-start in-app navigation (feed Navigate button). */
  startNavigationOnOpen?: boolean;
  onStartNavigationConsumed?: () => void;
  onPickupCompleted?: () => void;
  onViewCountUpdated?: (itemId: string, viewCount: number) => void;
}

export default function ItemDetailView({
  item,
  currentUserId,
  userProfile,
  userLat = null,
  userLng = null,
  onClose,
  onMessage,
  onStaffChat,
  onListingStaffAction,
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
  onEditPickupAttribution,
  startNavigationOnOpen = false,
  onStartNavigationConsumed,
  onPickupCompleted,
  onViewCountUpdated,
}: ItemDetailViewProps) {
  const [subitems, setSubitems] = useState<ListingSubItem[]>([]);
  const [hasAppClaim, setHasAppClaim] = useState(false);
  const [navFooterActions, setNavFooterActions] = useState<DetailFooterButton[]>([]);
  const isOwner = item.userId === currentUserId;
  const isStaffOfficialMode = isStaffActingOfficial(userProfile);
  const isOpenForCoordination = isListingOpenForCoordination(item.status);

  const { isSaved, toggleSaved } = useSavedItems(currentUserId);
  const tradeSeeking = item.type === 'trade' ? parseTradeSeeking(item.description) : null;

  useEffect(() => {
    void getListingSubitems(item.id).then(setSubitems);
    void itemHasRecordedAppClaim(item.id).then(setHasAppClaim);
  }, [item.id]);

  useEffect(() => {
    if (!currentUserId || item.userId === currentUserId) return;
    void recordListingView(item.id).then((result) => {
      if (result.ok && result.viewCount != null) {
        onViewCountUpdated?.(item.id, result.viewCount);
      }
    });
  }, [currentUserId, item.id, item.userId, onViewCountUpdated]);

  useDismissOnEscape(onClose);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    subitems.some((s) => s.status === 'claimed' || s.status === 'pending_pickup') &&
    subitems.some((s) => s.status === 'available' || s.status === 'pending_pickup');
  const pickupAttributionLabel = getPickupAttributionLabel(item);
  const needsPickupAttribution =
    isOwner && listingNeedsPickupAttribution(item, hasAppClaim) && !!onEditPickupAttribution;
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

  const ownerFooterActions = useMemo((): DetailFooterButton[] => {
    if (!isOwner) return [];

    if (item.status === 'active') {
      return [
        { id: 'edit', label: 'Edit', onClick: onEdit, disabled: updating, icon: <Pencil className="w-4 h-4" /> },
        {
          id: 'withdraw',
          label: 'Withdraw',
          onClick: () => onUpdateStatus('withdrawn'),
          disabled: updating,
          variant: 'ghost',
        },
        {
          id: 'complete',
          label: getOwnerCompletedActionLabel(item.type),
          onClick: () => onUpdateStatus('completed'),
          disabled: updating,
          variant: 'secondary',
          className: 'col-span-2',
        },
      ];
    }
    if (item.status === 'pending_pickup') {
      return [
        {
          id: 'picked_up',
          label: 'Mark picked up',
          onClick: () => onUpdateStatus('completed'),
          disabled: updating,
        },
        {
          id: 'back_active',
          label: 'Back to active',
          onClick: () => onUpdateStatus('active'),
          disabled: updating,
          variant: 'secondary',
        },
        {
          id: 'on_hold',
          label: 'Put on hold',
          onClick: () => onUpdateStatus('on_hold'),
          disabled: updating,
          variant: 'ghost',
        },
      ];
    }
    if (item.status === 'on_hold') {
      return [
        {
          id: 'release',
          label: 'Release hold',
          onClick: () => onUpdateStatus('active'),
          disabled: updating,
        },
        {
          id: 'pending',
          label: 'Pending pickup',
          onClick: () => onUpdateStatus('pending_pickup'),
          disabled: updating,
          variant: 'secondary',
        },
      ];
    }
    if (item.status === 'completed' && onEditPickupAttribution && !hasAppClaim) {
      return [
        {
          id: 'attribution',
          label: needsPickupAttribution ? 'Who picked this up?' : 'Update who picked up',
          onClick: onEditPickupAttribution,
          variant: 'secondary',
        },
      ];
    }
    if (item.status === 'withdrawn') {
      const actions: DetailFooterButton[] = [
        {
          id: 'edit_repost',
          label: 'Edit & repost',
          onClick: onEdit,
          disabled: updating,
          variant: 'secondary',
          icon: <Pencil className="w-4 h-4" />,
        },
        {
          id: 'repost',
          label: 'Repost',
          onClick: () => onUpdateStatus('active'),
          disabled: updating,
        },
      ];
      if (onDelete) {
        actions.push({
          id: 'delete',
          label: 'Delete',
          onClick: onDelete,
          disabled: updating,
          variant: 'ghost',
          icon: <Trash2 className="w-4 h-4" />,
          className: 'text-red-400',
        });
      }
      return actions;
    }
    return [];
  }, [
    isOwner,
    item.status,
    item.type,
    onEdit,
    onUpdateStatus,
    updating,
    onEditPickupAttribution,
    hasAppClaim,
    needsPickupAttribution,
    onDelete,
  ]);

  const visitorFooterActions = useMemo((): DetailFooterButton[] => {
    if (isOwner) return [];

    const actions: DetailFooterButton[] = [...navFooterActions];

    if (isOpenForCoordination && onMessage) {
      const hasPrimaryNav = navFooterActions.some((a) => a.variant !== 'secondary' && a.variant !== 'ghost');
      actions.push({
        id: 'message',
        label: isStaffOfficialMode ? 'Message about pickup' : getListingContactButtonLabel(item.type),
        onClick: onMessage,
        icon: <MessageSquare className="w-4 h-4" />,
        variant: hasPrimaryNav ? 'secondary' : undefined,
      });
    }

    return actions;
  }, [
    isOwner,
    navFooterActions,
    isStaffOfficialMode,
    isOpenForCoordination,
    onMessage,
    item.type,
  ]);

  const footerActions = isOwner ? ownerFooterActions : visitorFooterActions;
  const showClaimInFooter =
    !isOwner &&
    !isStaffOfficialMode &&
    item.status === 'active' &&
    userProfile &&
    onClaimSubmitted &&
    !navFooterActions.some((a) => a.id === 'listing_navigate' || a.id === 'go_get_start');

  const panel = (
    <div
      id="item_detail_fullscreen"
      className="sbn-app-sheet flex flex-col min-h-0 font-sans"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <header className="shrink-0 sbn-glass-nav sbn-safe-top border-b border-app">
          <div className="px-4 min-h-14 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-inset text-app"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0" />
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
            ) : null}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden sbn-safe-bottom">
        <div className="sbn-page-content pb-6">
          <ListingPhotoGallery urls={photos} title={item.title} compact />
          <div className="p-4 sm:p-5 space-y-4">
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

            <h2 className="font-display text-xl sm:text-2xl font-bold text-app leading-tight">{item.title}</h2>

            {userProfile && supportsInAppNavigation() && (
              <ItemDetailNavigation
                item={item}
                currentUserId={currentUserId}
                userProfile={userProfile}
                onOpenChat={onOpenChat}
                autoStartNavigation={startNavigationOnOpen}
                onAutoStartNavigationConsumed={onStartNavigationConsumed}
                onPickupCompleted={onPickupCompleted}
                onFooterActions={setNavFooterActions}
                primaryActionPlacement="inline"
              />
            )}

            {(footerActions.length > 0 || showClaimInFooter) && (
              <div className="space-y-2" id="listing_detail_actions_top">
                {footerActions.length > 0 && (
                  <DetailActionFooter actions={footerActions} id="listing_detail_footer" layout="inline" />
                )}
                {showClaimInFooter && (
                  <ClaimAtPickupButton
                    item={item}
                    user={userProfile!}
                    userLat={userLat}
                    userLng={userLng}
                    onClaimSubmitted={onClaimSubmitted!}
                    className="w-full"
                  />
                )}
                {isOwner && item.status === 'active' && footerActions.length > 0 && (
                  <p className="text-[11px] text-muted text-center leading-snug">
                    {item.type === 'trade'
                      ? 'Confirm the swap in Messages once you and your neighbor have traded.'
                      : item.type === 'looking'
                        ? 'Mark fulfilled once a neighbor has helped with your request.'
                        : 'Confirm neighbor pickups from Messages, or when they self-claim at the pin.'}
                  </p>
                )}
              </div>
            )}

        <div className="space-y-5 pt-1">

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
          </section>

          {isStaffOfficialMode && !isOwner && userProfile && (
              <section className="sbn-card p-4 space-y-3 border border-role-accent/20">
                <StaffListingActions
                  item={item}
                  actor={userProfile}
                  onChanged={() => onListingStaffAction?.()}
                  onDeleted={onClose}
                  onStaffChat={onStaffChat}
                />
              </section>
            )}

          {isOwner && item.status === 'completed' && !hasAppClaim && onEditPickupAttribution && (
            <section className="rounded-2xl border border-app bg-inset p-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-subtle">Pickup record</p>
              {pickupAttributionLabel ? (
                <p className="text-sm text-app">
                  Recorded as <strong>{pickupAttributionLabel}</strong>
                </p>
              ) : (
                <p className="text-sm text-muted">
                  No pickup source recorded yet. Add who picked this up for your records.
                </p>
              )}
              <button
                type="button"
                onClick={onEditPickupAttribution}
                className="sbn-btn sbn-btn-secondary sbn-btn-sm"
              >
                {needsPickupAttribution ? 'Who picked this up?' : 'Update who picked up'}
              </button>
            </section>
          )}

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
            <PresenceUserAvatar
              uid={item.userId}
              src={item.userPhotoURL}
              name={item.userDisplayName}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-app">{item.userDisplayName}</p>
              <p className="text-xs text-accent">View neighbor profile</p>
            </div>
          </button>
        </div>
          </div>
        </div>
        </div>
    </div>
  );

  return createPortal(panel, document.body);
}
