import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, UserProfile, ITEM_CATEGORIES, ISO_CATEGORIES, extractGPSCoordinates, NEIGHBORHOOD_COORDS, convertPercentToLatLng, CommunityEvent, InitiateChatOptions } from '../types';
import {
  canViewerSeeExactLocation,
  getItemMapDestination,
  hasExactMapPin,
  hasNavigablePin,
  hasStoredGps,
  isLocationPrivate,
  stripListingMetadata,
} from '../lib/itemLocation';
import {
  hasCoordinationDestination,
  resolveCoordinationDestination,
} from '../lib/coordinationDestination';
import { getChatMeetLocationsForUser } from '../lib/chatMeetLocation';
import type { ChatMeetLocation } from '../types';
import {
  canOfferContactlessClaim,
  getListingNavigateLabel,
  navigatesDirectlyToPin,
} from '../lib/listingMapActions';
import { createGoGetSession } from '../lib/goGetSessions';
import { confirmDropOffAsFulfiller, confirmGoGetAsRequester, confirmMeetUp } from './goget/goGetSafetyConfirm';
import { useConfirm } from '../contexts/ConfirmContext';
import { supportsGoGetCoordination } from '../lib/goGetEligibility';
import { extractListingImageUrls } from '../lib/listingContent';
import {
  haversineMeters,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { canShowAppPickupCoordination, supportsInAppNavigation } from '../lib/goGetCoordinationGating';
import { getUserPickupCoordinationByIds } from '../supabase';
import { remainingRouteMeters } from '../lib/navigationRoute';
import { usePreviewDrivingRoute } from '../hooks/usePreviewDrivingRoute';
import { subscribeLiveGeolocation, getLastLiveLatLng, retainLiveGeolocation } from '../lib/liveGeolocation';
import {
  clearActiveNavSession,
  readActiveNavSession,
  saveActiveNavSession,
} from '../lib/navigationSession';
import MapNavigationView from './MapNavigationView';
import { unlockNavigationSpeech } from '../lib/navigationVoice';
import { SBN_MAP_TILE_OPTIONS, SBN_MAP_TILE_URL } from '../lib/mapTiles';
import MapSelectionRouteRow from './MapSelectionRouteRow';
import { MapPin, MessageSquare, LifeBuoy, X, Tag, Eye, Compass, ChevronLeft, ChevronRight, Plus, Minus, Pencil, Navigation, CalendarDays, Map as MapIcon } from 'lucide-react';
import ClaimAtPickupButton from './ClaimAtPickupButton';
import ListingImage from './ListingImage';
import ListingViewBadge from './ListingViewBadge';
import EventEngagement from './EventEngagement';
import EventStatusBadge from './EventStatusBadge';
import UserAvatar from './UserAvatar';
import { usePresence } from '../contexts/PresenceContext';
import { isEventPast, isEventUpcoming, resolveEventStatus } from '../lib/eventRsvp';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { getPostTypeMapDetailLabel, getPostTypeMapLabel, getListingContactButtonLabel, isEventsMapFilter, type MapContentFilter } from '../lib/postType';
import { pickSoonestPerEventSeries } from '../lib/eventSeries';
import { fitRoutePreviewToViewport, frameSelectionPreview, measureMapFitPadding } from '../lib/mapRouteFitPadding';
import { ROUTE_LINE_CASING, ROUTE_LINE_MAIN } from '../lib/mapRouteLineStyle';

function MapCreateFab({
  onOpenNewPost,
  className = '',
}: {
  onOpenNewPost?: () => void;
  className?: string;
}) {
  if (!onOpenNewPost) return null;

  return (
    <button
      type="button"
      onClick={onOpenNewPost}
      className={`sbn-fab pointer-events-auto ${className}`}
      aria-label="New listing"
      title="New listing"
      id="map_new_listing_btn"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}

interface SacramentoMapViewProps {
  items: ItemPost[];
  events?: CommunityEvent[];
  userProfile: UserProfile;
  selectedType?: MapContentFilter;
  selectedCategory?: string;
  selectedNeighborhood?: string;
  searchTerm?: string;
  onInitiateChat: (
    posterUid: string,
    posterName: string,
    posterPhoto?: string,
    item?: ItemPost,
    options?: InitiateChatOptions,
  ) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem?: (item: ItemPost) => void;
  onViewEvent?: (event: CommunityEvent) => void;
  onEditItem?: (item: ItemPost) => void;
  /** @deprecated Use onViewItem */
  onItemDetail?: (item: ItemPost) => void;
  isFullScreenMobile?: boolean;
  /** When false (e.g. another mobile tab is active), map stays mounted but hidden */
  mapVisible?: boolean;
  /** Controlled color guide overlay (mobile toolbar). */
  colorGuideOpen?: boolean;
  onColorGuideOpenChange?: (open: boolean) => void;
  onOpenNewPost?: () => void;
  /** Hide mobile header/nav while navigating or showing nav prompts. */
  onImmersiveModeChange?: (active: boolean) => void;
  /** When false, defer nav session restore until listings have finished loading. */
  itemsHydrated?: boolean;
  /** When false, defer event nav session restore until events have finished loading. */
  eventsHydrated?: boolean;
  eventsEngagement?: EventsEngagementApi;
  commentsLocked?: boolean;
}

const EVENT_MAP_COLOR = '#9333EA';

function listingLocationHint(post: ItemPost, viewerUserId: string): string {
  if (canViewerSeeExactLocation(post, viewerUserId)) {
    return 'Exact pickup pin on map';
  }
  if (hasStoredGps(post.description) && isLocationPrivate(post.description)) {
    return `Private location · ${post.neighborhood}`;
  }
  return `No map pin · ${post.neighborhood}`;
}

function formatEventMapDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Map each post category to a specific distinct color for blips
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Curb Alert': '#EF4444', 
    'Porch Pickup': '#00845A',
    'Free Pile / Box': '#00845A', 
    'Furniture': '#3B82F6', 
    'Kitchen & Dining': '#10B981', 
    'Appliances': '#14B8A6', 
    'Clothing & Accessories': '#6366F1', 
    'Baby & Kids': '#EC4899', 
    'Books & Education': '#8B5CF6', 
    'Electronics & Media': '#06B6D4', 
    'Garden & Outdoors': '#22C55E', 
    'Tools & Hardware': '#71717A', 
    'Sports & Fitness': '#0EA5E9', 
    'Toys & Games': '#D946EF', 
    'Food & Pantry': '#F43F5E', 
    'Health & Beauty': '#F472B6', 
    'Pet Supplies': '#78350F', 
    'Borrow Request': '#00A36C', 
    'Household Needed': '#3B82F6', 
    'Furniture Wanted': '#6366F1', 
    'Appliances Needed': '#14B8A6', 
    'Groceries & Food Needed': '#F43F5E', 
    'Baby & Kids ISO': '#EC4899', 
    'Garden & Tools ISO': '#22C55E', 
    'Clothing Needed': '#A855F7', 
    'Electronics / Media Wanted': '#06B6D4', 
    'Pet Supplies Needed': '#78350F', 
    'Help / Labor Request': '#111827', 
    'Other Seeking Support': '#6B7280', 
    'Other / Custom': '#6B7280'
  };
  return colors[category] || '#00845A'; 
};

/** Pin ring color by listing type: giving = black, looking = white, trade = grey. */
export function getMapPinBorderClass(type: ItemPost['type'] | string): string {
  if (type === 'giveaway') return 'border-zinc-950';
  if (type === 'trade') return 'border-zinc-400';
  return 'border-white';
}

function createEventBlipIcon(isSelected: boolean): L.DivIcon {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center cursor-pointer">
        <span style="border-color: ${EVENT_MAP_COLOR}" class="absolute inline-flex h-7 w-7 rounded-md border opacity-40 block"></span>
        <div style="background-color: ${EVENT_MAP_COLOR}" class="h-4 w-4 rounded-md border-2 border-white shadow-md flex items-center justify-center ${isSelected ? 'ring-2 ring-zinc-950 ring-offset-1 scale-125 z-50' : ''}">
          <div class="w-1.5 h-1.5 rounded-sm bg-white opacity-90"></div>
        </div>
      </div>
    `,
    className: 'custom-event-blip-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createItemBlipIcon(item: ItemPost, color: string, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center cursor-pointer">
        <span style="border-color: ${color}" class="absolute inline-flex h-6 w-6 rounded-full border opacity-40 block"></span>
        <div style="background-color: ${color}" class="h-3.5 w-3.5 rounded-full border-2 shadow-md ${getMapPinBorderClass(item.type)} ${isSelected ? 'ring-2 ring-zinc-950 ring-offset-1 scale-125 z-50' : ''}">
          <div class="w-1 h-1 rounded-full bg-white opacity-80 mx-auto mt-[2.5px]"></div>
        </div>
      </div>
    `,
    className: 'custom-item-blip-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const GPS_FOLLOW_PAN_METERS = 25;
const GPS_STATE_UPDATE_METERS = 40;
const MAP_INIT_OPTIONS: L.MapOptions = {
  zoomControl: false,
  attributionControl: true,
  fadeAnimation: false,
  zoomAnimation: false,
  markerZoomAnimation: false,
};

function MapSelectedEventCard({
  event,
  currentIndex,
  total,
  slideDirection,
  compact = false,
  onClose,
  onPrev,
  onNext,
  onViewEvent,
  userProfile,
  eventsEngagement,
  commentsLocked = false,
  routeEndpoints,
  routeLoading,
  distanceMeters,
  durationSeconds,
  routeOnMap,
  hasLiveGps,
  canNavigate,
  onStartNavigation,
  onOpenExternalMaps,
}: {
  event: CommunityEvent;
  currentIndex: number;
  total: number;
  slideDirection: 'left' | 'right';
  compact?: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewEvent?: (event: CommunityEvent) => void;
  userProfile: UserProfile;
  eventsEngagement?: EventsEngagementApi;
  commentsLocked?: boolean;
  routeEndpoints?: { start: LatLng; end: LatLng } | null;
  routeLoading?: boolean;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  routeOnMap?: boolean;
  hasLiveGps?: boolean;
  canNavigate?: boolean;
  onStartNavigation?: () => void;
  onOpenExternalMaps?: () => void;
}) {
  const eventStatus = resolveEventStatus(event);
  const isCancelled = eventStatus === 'cancelled';
  const isPast = isEventPast(event);
  const rsvpState = eventsEngagement?.getRsvpsForEvent(event.id) ?? {
    userRsvp: null,
    going: 0,
    maybe: 0,
    notGoing: 0,
    gone: 0,
    missed: 0,
  };
  const voteState = eventsEngagement?.getVotesForEvent(event.id) ?? {
    userVote: null,
    upvotes: 0,
    downvotes: 0,
  };
  const comments = eventsEngagement?.getCommentsForEvent(event.id) ?? [];

  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: slideDirection === 'right' ? (compact ? 70 : 80) : -(compact ? 70 : 80) }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideDirection === 'right' ? -(compact ? 70 : 80) : compact ? 70 : 80 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`${compact ? 'pointer-events-auto sbn-card sbn-map-selection-card' : 'border border-app bg-surface relative font-sans text-app rounded-2xl shadow-xl overflow-hidden'}${isCancelled ? ' opacity-60' : ''}`}
      id={compact ? 'mobile_map_event_detail_card' : 'map_event_detail_card'}
    >
      <div className={`flex items-center justify-end gap-1 px-2.5 pt-2 ${compact ? 'mb-1.5' : 'mb-2'}`}>
        <div className={`flex items-center space-x-1 pointer-events-auto bg-inset border border-app px-2 rounded-lg ${compact ? 'py-1' : 'py-0.5'}`}>
          <button
            type="button"
            onClick={onPrev}
            disabled={total <= 1}
            aria-label="Previous event"
            className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
          >
            <ChevronLeft className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
          <span className={`font-bold font-mono text-muted text-center ${compact ? 'text-[9px] min-w-[24px]' : 'text-[10px] min-w-[28px]'}`}>
            {currentIndex + 1}/{total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={total <= 1}
            aria-label="Next event"
            className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
          >
            <ChevronRight className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className="text-muted hover:text-app transition-colors cursor-pointer bg-inset border border-app p-1 rounded-lg"
        >
          <X className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      </div>

      <div className="item-feed-card__main">
        <div
          className={`item-feed-card__media relative${event.imageUrl ? '' : ' item-feed-card__media--empty'}`}
          style={event.imageUrl ? undefined : { backgroundColor: `${EVENT_MAP_COLOR}22` }}
        >
          {event.imageUrl ? (
            <ListingImage
              src={event.imageUrl}
              alt={event.title}
              width={compact ? 160 : 240}
              className="h-full w-full object-cover"
            />
          ) : (
            <CalendarDays className={compact ? 'w-7 h-7' : 'w-9 h-9'} style={{ color: EVENT_MAP_COLOR }} />
          )}
          <ListingViewBadge count={event.viewCount ?? 0} compact={compact} />
        </div>

        <div className="item-feed-card__copy">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[7.5px] font-bold tracking-wider text-white"
              style={{ backgroundColor: EVENT_MAP_COLOR }}
            >
              📅 EVENT
            </span>
            <EventStatusBadge status={eventStatus} />
          </div>
          <h4 className={`font-semibold text-app mt-1 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{event.title}</h4>
          {!compact && (
            <p className="text-muted mt-0.5 text-xs line-clamp-2">{event.description}</p>
          )}
          <p className={`text-accent font-semibold mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {formatEventMapDate(event.eventStartAt)}
          </p>
          <p className={`text-muted mt-0.5 truncate ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
            {event.location} · {event.neighborhood}
          </p>

          {!isCancelled && eventsEngagement && (
            <EventEngagement
              hostUserId={event.userId}
              currentUserId={userProfile.uid}
              voteState={voteState}
              rsvpState={rsvpState}
              comments={comments}
              onVote={(direction) => eventsEngagement.handleVote(event.id, event.userId, direction)}
              onRsvp={(status) => eventsEngagement.handleRsvp(event.id, event.userId, status, isPast)}
              onAddComment={() => {}}
              variant="card"
              commentsLocked={commentsLocked}
              isPast={isPast}
            />
          )}

          <MapSelectionRouteRow
            locationHint={event.location?.trim() || `Event pin · ${event.neighborhood}`}
            routeEndpoints={routeEndpoints ?? null}
            routeLoading={routeLoading ?? false}
            distanceMeters={distanceMeters ?? null}
            durationSeconds={durationSeconds ?? null}
            routeOnMap={routeOnMap ?? false}
            hasLiveGps={hasLiveGps ?? false}
            canNavigate={canNavigate}
            onStartNavigation={onStartNavigation}
            onOpenExternalMaps={onOpenExternalMaps}
          />
        </div>
      </div>

      <div className="item-feed-card__footer">
        <div className="item-feed-card__poster">
          <UserAvatar
            uid={event.userId}
            src={event.userPhotoURL}
            name={event.userDisplayName}
            size="sm"
          />
          <div className="item-feed-card__poster-copy">
            <p className="item-feed-card__poster-name">{event.userDisplayName}</p>
          </div>
        </div>
        {onViewEvent && (
          <div className="item-feed-card__actions">
            <button
              type="button"
              onClick={() => onViewEvent(event)}
              className="sbn-btn sbn-btn-primary sbn-btn-sm"
              aria-label="View event"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function MapListingCardActions({
  post,
  userProfile,
  isStaffViewer,
  userLat,
  userLng,
  openItemDetail,
  onEditItem,
  onClaimSubmitted,
  onStaffListingChat,
  onInitiateChat,
  usesNavigate,
}: {
  post: ItemPost;
  userProfile: UserProfile;
  isStaffViewer: boolean;
  userLat: number | null;
  userLng: number | null;
  openItemDetail?: (item: ItemPost) => void;
  onEditItem?: (item: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onInitiateChat: SacramentoMapViewProps['onInitiateChat'];
  usesNavigate: boolean;
}) {
  const isOwner = post.userId === userProfile.uid;
  const showMessage = !isOwner && !(usesNavigate && !isStaffViewer);
  const showClaim =
    !isOwner &&
    !!onClaimSubmitted &&
    !usesNavigate &&
    canOfferContactlessClaim(post, userProfile.uid, userLat, userLng);

  return (
    <div className="item-feed-card__actions">
      {openItemDetail && (
        <button
          id="map_view_card_btn"
          type="button"
          onClick={() => openItemDetail(post)}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm"
          aria-label="View listing"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      )}
      {isOwner
        ? onEditItem && (
            <button
              id="map_edit_card_btn"
              type="button"
              onClick={() => onEditItem(post)}
              className="sbn-btn sbn-btn-primary sbn-btn-sm"
              aria-label="Edit listing"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )
        : (
          <>
            {showClaim && onClaimSubmitted && (
              <ClaimAtPickupButton
                item={post}
                user={userProfile}
                userLat={userLat}
                userLng={userLng}
                onClaimSubmitted={onClaimSubmitted}
                compact
              />
            )}
            {isStaffViewer && onStaffListingChat && (
              <button
                type="button"
                onClick={() => onStaffListingChat(post)}
                className="sbn-btn sbn-btn-primary sbn-btn-sm"
                aria-label="Staff chat"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Staff chat</span>
              </button>
            )}
            {showMessage && (
              <button
                id="map_message_btn"
                type="button"
                onClick={() =>
                  onInitiateChat(
                    post.userId,
                    post.userDisplayName,
                    post.userPhotoURL,
                    post,
                    isStaffViewer ? { asNeighbor: true } : undefined,
                  )
                }
                className="sbn-btn sbn-btn-primary sbn-btn-sm"
                aria-label={`${getListingContactButtonLabel(post.type)} about this listing`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{getListingContactButtonLabel(post.type)}</span>
              </button>
            )}
          </>
        )}
    </div>
  );
}

function MapSelectedListingCard({
  post,
  currentIndex,
  total,
  slideDirection,
  compact = false,
  onClose,
  onPrev,
  onNext,
  userProfile,
  isStaffViewer,
  userLat,
  userLng,
  openItemDetail,
  onEditItem,
  onClaimSubmitted,
  onStaffListingChat,
  onInitiateChat,
  usesNavigate,
  routeEndpoints,
  routeLoading,
  distanceMeters,
  durationSeconds,
  routeOnMap,
  hasLiveGps,
  canNavigate,
  navigateLabel,
  onStartNavigation,
  onOpenExternalMaps,
}: {
  post: ItemPost;
  currentIndex: number;
  total: number;
  slideDirection: 'left' | 'right';
  compact?: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  userProfile: UserProfile;
  isStaffViewer: boolean;
  userLat: number | null;
  userLng: number | null;
  openItemDetail?: (item: ItemPost) => void;
  onEditItem?: (item: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onInitiateChat: SacramentoMapViewProps['onInitiateChat'];
  usesNavigate: boolean;
  routeEndpoints: { start: LatLng; end: LatLng } | null;
  routeLoading: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  routeOnMap: boolean;
  hasLiveGps: boolean;
  canNavigate: boolean;
  navigateLabel: string;
  onStartNavigation: () => void;
  onOpenExternalMaps: () => void;
}) {
  const authorLastActive = usePresence(post.userId);
  const photos = post.imageUrls?.length ? post.imageUrls : extractListingImageUrls(post);
  const thumb = photos[0];

  return (
    <motion.div
      key={post.id}
      initial={{ opacity: 0, x: slideDirection === 'right' ? (compact ? 70 : 80) : -(compact ? 70 : 80) }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideDirection === 'right' ? -(compact ? 70 : 80) : compact ? 70 : 80 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      id={compact ? 'mobile_map_detail_floating_card' : 'map_item_detail_card'}
      className={
        compact
          ? 'pointer-events-auto sbn-card sbn-map-selection-card'
          : 'border border-app bg-surface relative font-sans text-app rounded-2xl shadow-xl overflow-hidden'
      }
    >
      <div className={`flex items-center justify-end gap-1 px-2.5 pt-2 ${compact ? 'mb-1.5' : 'mb-2'}`}>
        <div className={`flex items-center space-x-1 bg-inset border border-app px-2 rounded-lg ${compact ? 'py-1' : 'py-0.5'}`}>
          <button
            type="button"
            onClick={onPrev}
            disabled={total <= 1}
            aria-label="Previous listing"
            className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
          >
            <ChevronLeft className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
          <span className={`font-bold font-mono text-muted text-center ${compact ? 'text-[9px] min-w-[24px]' : 'text-[10px] min-w-[28px]'}`}>
            {currentIndex + 1}/{total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={total <= 1}
            aria-label="Next listing"
            className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
          >
            <ChevronRight className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </div>
        <button
          id={compact ? undefined : 'close_map_card_btn'}
          type="button"
          onClick={onClose}
          aria-label="Close listing details"
          className="text-muted hover:text-app transition-colors cursor-pointer bg-inset border border-app p-1 rounded-lg"
        >
          <X className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      </div>

      <div className="item-feed-card__main">
        {thumb ? (
          <div className="item-feed-card__media relative">
            <ListingImage src={thumb} alt={post.title} width={compact ? 160 : 240} className="h-full w-full object-cover" />
            <ListingViewBadge count={post.viewCount ?? 0} compact={compact} />
          </div>
        ) : (
          <div className="item-feed-card__media item-feed-card__media--empty">
            <Tag className="w-4 h-4 text-muted" />
          </div>
        )}

        <div className="item-feed-card__copy">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[7.5px] font-bold tracking-wider shrink-0 ${
              post.type === 'giveaway'
                ? 'bg-accent text-on-accent'
                : post.type === 'trade'
                  ? 'bg-zinc-500 text-white'
                  : 'bg-inset border border-app text-muted'
            }`}>
              {compact ? getPostTypeMapLabel(post.type) : getPostTypeMapDetailLabel(post.type)}
            </span>
            <span className="text-[8px] font-bold font-mono uppercase tracking-wider min-w-0 truncate" style={{ color: getCategoryColor(post.category) }}>
              {post.category}
            </span>
          </div>
          <h4 className={`font-semibold text-app mt-1 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{post.title}</h4>
          <p className={`text-muted mt-0.5 break-words ${compact ? 'text-[9.5px] line-clamp-1' : 'text-[10.5px] line-clamp-2'}`}>
            {stripListingMetadata(post.description)}
          </p>
          <MapSelectionRouteRow
            locationHint={listingLocationHint(post, userProfile.uid)}
            routeEndpoints={routeEndpoints}
            routeLoading={routeLoading}
            distanceMeters={distanceMeters}
            durationSeconds={durationSeconds}
            routeOnMap={routeOnMap}
            hasLiveGps={hasLiveGps}
            canNavigate={canNavigate}
            navigateLabel={navigateLabel}
            onStartNavigation={onStartNavigation}
            onOpenExternalMaps={onOpenExternalMaps}
          />
        </div>
      </div>

      <div className="item-feed-card__footer">
        <div className="item-feed-card__poster">
          <UserAvatar
            uid={post.userId}
            src={post.userPhotoURL}
            name={post.userDisplayName}
            size="sm"
            lastActiveAt={authorLastActive ?? undefined}
          />
          <div className="item-feed-card__poster-copy">
            <p className="item-feed-card__poster-name">{post.userDisplayName}</p>
          </div>
        </div>
        <MapListingCardActions
          post={post}
          userProfile={userProfile}
          isStaffViewer={isStaffViewer}
          userLat={userLat}
          userLng={userLng}
          openItemDetail={openItemDetail}
          onEditItem={onEditItem}
          onClaimSubmitted={onClaimSubmitted}
          onStaffListingChat={onStaffListingChat}
          onInitiateChat={onInitiateChat}
          usesNavigate={usesNavigate}
        />
      </div>
    </motion.div>
  );
}

export default function SacramentoMapView({
  items,
  events = [],
  userProfile,
  selectedType,
  selectedCategory,
  selectedNeighborhood,
  searchTerm,
  onInitiateChat,
  onStaffListingChat,
  onClaimSubmitted,
  onViewItem,
  onViewEvent,
  onEditItem,
  onItemDetail,
  isFullScreenMobile = false,
  mapVisible = true,
  colorGuideOpen: colorGuideOpenProp,
  onColorGuideOpenChange,
  onOpenNewPost,
  onImmersiveModeChange,
  itemsHydrated = true,
  eventsHydrated = true,
  eventsEngagement,
  commentsLocked = false,
}: SacramentoMapViewProps) {
  const isStaffViewer = isStaffActingOfficial(userProfile);
  const [posterCoordByUid, setPosterCoordByUid] = useState<
    Record<string, Pick<UserProfile, 'goGetEnabled' | 'pickupAvailability'>>
  >({});
  const [chatMeetLocations, setChatMeetLocations] = useState<ChatMeetLocation[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) {
      setChatMeetLocations([]);
      return;
    }
    void getChatMeetLocationsForUser().then(setChatMeetLocations);
  }, [userProfile?.uid]);

  const neighborListingUsesNavigate = (post: ItemPost): boolean => {
    if (post.userId === userProfile.uid || post.status !== 'active') return false;
    const chatMeet = chatMeetLocations.find((loc) => loc.itemId === post.id);
    if (!hasCoordinationDestination(post, userProfile.uid, chatMeet)) return false;
    const posterCoord = posterCoordByUid[post.userId];
    return canShowAppPickupCoordination({
      item: post,
      posterProfile: posterCoord ?? { uid: post.userId, goGetEnabled: false },
      pickerProfile: userProfile,
    }).ok;
  };
  const openItemDetail = onViewItem || onItemDetail;
  const { confirm, alert } = useConfirm();
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [lockedNavOrigin, setLockedNavOrigin] = useState<LatLng | null>(null);
  const [colorGuideInternal, setColorGuideInternal] = useState(false);
  const showColorGuide =
    colorGuideOpenProp !== undefined ? colorGuideOpenProp : colorGuideInternal;
  const setShowColorGuide = (open: boolean) => {
    onColorGuideOpenChange?.(open);
    if (colorGuideOpenProp === undefined) setColorGuideInternal(open);
  };
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Local overrides in case filters are not controlled by a parent grid
  const [localSearch, setLocalSearch] = useState('');
  const [localType, setLocalType] = useState<MapContentFilter>('all');
  const [localCategory, setLocalCategory] = useState('All Categories');
  const [localNeighborhood, setLocalNeighborhood] = useState('All Neighborhoods');

  const sTerm = searchTerm !== undefined ? searchTerm : localSearch;
  const sType = selectedType !== undefined ? selectedType : localType;
  const sCat = selectedCategory !== undefined ? selectedCategory : localCategory;
  const sNeigh = selectedNeighborhood !== undefined ? selectedNeighborhood : localNeighborhood;
  const showingEvents = isEventsMapFilter(sType);
  const showEventsOnMap = showingEvents || sType === 'all';
  const showItemsOnMap = !showingEvents;

  useEffect(() => {
    if (showingEvents) {
      setSelectedPost(null);
    } else if (sType !== 'all') {
      setSelectedEvent(null);
    }
  }, [showingEvents, sType]);

  // React Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const itemMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const eventMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userLocationRef = useRef<LatLng | null>(null);
  const lastGpsStateUpdateRef = useRef<LatLng | null>(null);
  const lastMarkerPositionRef = useRef<LatLng | null>(null);
  const hasGpsFixRef = useRef(false);
  const isLocatingRef = useRef(true);
  const locationErrorRef = useRef<string | null>(null);
  const userLocationIconRef = useRef<L.DivIcon | null>(null);
  const geoUnsubscribeRef = useRef<(() => void) | null>(null);
  const followPanRafRef = useRef<number | null>(null);
  const pendingFollowPanRef = useRef<LatLng | null>(null);
  const followUserRef = useRef(true);
  const mapVisibleRef = useRef(mapVisible);
  const lastFollowPanRef = useRef<LatLng | null>(null);
  const routePreviewActiveRef = useRef(false);
  const navigationOpenRef = useRef(false);
  const hasInitialMapCenterRef = useRef(false);
  const navRestoreDoneRef = useRef(false);
  const prevSelectedPostIdRef = useRef<string | undefined>(undefined);
  const prevSelectedEventIdRef = useRef<string | undefined>(undefined);
  const [mapReady, setMapReady] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const lastFitDestKeyRef = useRef<string | null>(null);
  const lastFitCoordsKeyRef = useRef<string | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const routeEndpointsRef = useRef<{ start: { lat: number; lng: number }; end: { lat: number; lng: number } } | null>(null);
  const routeCoordsRef = useRef<[number, number][] | null>(null);
  const selectionCardRef = useRef<HTMLDivElement | null>(null);
  const routeAutoFitEnabledRef = useRef(true);
  const programmaticMapMoveUntilRef = useRef(0);

  const markProgrammaticMapMove = (ms = 450) => {
    programmaticMapMoveUntilRef.current = Date.now() + ms;
  };

  // Default coordinate centered around the user's neighborhood
  const userNeighborhood = userProfile?.neighborhood || 'Midtown';
  const defaultCoord = NEIGHBORHOOD_COORDS[userNeighborhood] || { x: 53, y: 40 };
  const fallbackLatLng = useMemo(() => convertPercentToLatLng(defaultCoord.x, defaultCoord.y), [defaultCoord]);
  const resolveUserGpsLocation = useCallback((): LatLng | null => {
    return userLocationRef.current ?? userLocation ?? getLastLiveLatLng();
  }, [userLocation]);
  const resolveNavOrigin = useCallback((): LatLng => {
    return resolveUserGpsLocation() ?? fallbackLatLng;
  }, [resolveUserGpsLocation, fallbackLatLng]);

  useEffect(() => {
    routeAutoFitEnabledRef.current = true;
    lastFitCoordsKeyRef.current = null;
  }, [selectedPost?.id, selectedEvent?.id]);

  const [selectionCardHeight, setSelectionCardHeight] = useState(0);
  const hasMapSelection = Boolean(selectedPost || selectedEvent);

  useEffect(() => {
    const cardEl = selectionCardRef.current;
    const mapRoot = mapContainerRef.current?.parentElement;
    if (!cardEl || !mapRoot || !isFullScreenMobile) return;

    const syncCardStack = () => {
      const height = hasMapSelection ? Math.ceil(cardEl.getBoundingClientRect().height) : 0;
      setSelectionCardHeight(height);
      mapRoot.style.setProperty('--sbn-map-card-stack', `${height}px`);
    };

    syncCardStack();
    const observer = new ResizeObserver(syncCardStack);
    observer.observe(cardEl);
    return () => observer.disconnect();
  }, [hasMapSelection, isFullScreenMobile, selectedPost?.id, selectedEvent?.id]);

  const fitRouteToAvailableView = useCallback(
    (options?: { force?: boolean }) => {
      const map = mapRef.current;
      const mapEl = mapContainerRef.current;
      const coords = routeCoordsRef.current;
      if (!map || !mapEl || !coords || coords.length < 2) return;
      if (!options?.force && !routeAutoFitEnabledRef.current) return;

      const measured = measureMapFitPadding({
        mapElement: mapEl,
        obstructingElements: [selectionCardRef.current],
        defaults: {
          top: isFullScreenMobile ? 56 : 40,
          bottom: isFullScreenMobile ? 20 : 32,
          left: 28,
          right: 28,
        },
        margin: 18,
      });

      const cardStack = hasMapSelection ? selectionCardHeight : 0;
      const safeBottom =
        typeof window !== 'undefined'
          ? Number.parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue('--sbn-safe-area-bottom') || '0',
            ) || 0
          : 0;
      const top = Math.max(measured.topLeft[1], isFullScreenMobile ? 52 : 40);
      const bottom = Math.max(
        measured.bottomRight[1],
        cardStack > 0 ? cardStack + 24 + safeBottom : measured.bottomRight[1],
      );

      const dest = routeEndpointsRef.current?.end;
      const padding = {
        topLeft: [measured.topLeft[0], top] as [number, number],
        bottomRight: [measured.bottomRight[0], bottom] as [number, number],
      };

      markProgrammaticMapMove();
      map.invalidateSize({ animate: false });
      if (map.getSize().x < 32 || map.getSize().y < 32) {
        window.requestAnimationFrame(() => {
          fitRouteToAvailableView(options);
        });
        return;
      }
      fitRoutePreviewToViewport({
        map,
        routeCoords: coords,
        end: dest,
        padding,
        maxZoom: 15,
        minZoom: 9,
      });
    },
    [hasMapSelection, isFullScreenMobile, selectionCardHeight],
  );

  const selectionFitPadding = useCallback((): ReturnType<typeof measureMapFitPadding> => {
    const mapEl = mapContainerRef.current;
    if (!mapEl) {
      return { topLeft: [28, 56], bottomRight: [28, 160] };
    }
    const measured = measureMapFitPadding({
      mapElement: mapEl,
      obstructingElements: [selectionCardRef.current],
      defaults: {
        top: isFullScreenMobile ? 56 : 40,
        bottom: isFullScreenMobile ? 20 : 32,
        left: 28,
        right: 28,
      },
      margin: 18,
    });
    const cardStack = hasMapSelection ? selectionCardHeight : 0;
    const safeBottom =
      typeof window !== 'undefined'
        ? Number.parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--sbn-safe-area-bottom') || '0',
          ) || 0
        : 0;
    const top = Math.max(measured.topLeft[1], isFullScreenMobile ? 52 : 40);
    const bottom = Math.max(
      measured.bottomRight[1],
      cardStack > 0 ? cardStack + 24 + safeBottom : measured.bottomRight[1],
    );
    return {
      topLeft: [measured.topLeft[0], top],
      bottomRight: [measured.bottomRight[0], bottom],
    };
  }, [hasMapSelection, isFullScreenMobile, selectionCardHeight]);

  const framePinInView = useCallback(
    (lat: number, lng: number) => {
      const map = mapRef.current;
      if (!map) return;
      markProgrammaticMapMove();
      frameSelectionPreview({
        map,
        dest: { lat, lng },
        user: userLocationRef.current,
        padding: selectionFitPadding(),
        maxZoom: 15,
      });
    },
    [selectionFitPadding],
  );
  const framePinInViewRef = useRef(framePinInView);
  framePinInViewRef.current = framePinInView;

  const lockNavOrigin = useCallback(() => {
    setLockedNavOrigin(resolveUserGpsLocation());
  }, [resolveUserGpsLocation]);

  useEffect(() => {
    routePreviewActiveRef.current = Boolean(selectedPost || selectedEvent);
  }, [selectedPost, selectedEvent]);

  useEffect(() => {
    navigationOpenRef.current = navigationOpen;
  }, [navigationOpen]);

  const immersiveNavActive = navigationOpen;

  useEffect(() => {
    onImmersiveModeChange?.(immersiveNavActive);
    return () => {
      onImmersiveModeChange?.(false);
    };
  }, [immersiveNavActive, onImmersiveModeChange]);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  useEffect(() => {
    if (!navigationOpen && !readActiveNavSession(userProfile.uid)) return;
    return retainLiveGeolocation();
  }, [navigationOpen, userProfile.uid]);

  useEffect(() => {
    mapVisibleRef.current = mapVisible;
    if (!mapVisible) return;

    const map = mapRef.current;
    if (!map) return;

    const pos = userLocationRef.current;
    if (pos) {
      try {
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([pos.lat, pos.lng]);
        } else if (!navigationOpenRef.current) {
          userMarkerRef.current = L.marker([pos.lat, pos.lng], {
            icon: createUserLocationIcon(),
            zIndexOffset: 500,
          }).addTo(map);
        }
      } catch (error) {
        console.warn('Could not restore user marker on map tab:', error);
      }
    }

    // One refresh after the tab becomes visible (container was display:none).
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false, pan: false });
    }, 200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mapVisible]);

  const createUserLocationIcon = () => {
    if (!userLocationIconRef.current) {
      userLocationIconRef.current = L.divIcon({
        html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-8 w-8 rounded-full bg-blue-500/20"></span>
          <div class="h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
        className: 'custom-user-avatar-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    }
    return userLocationIconRef.current;
  };

  const applyLiveUserPosition = (latitude: number, longitude: number) => {
    const nextPos = { lat: latitude, lng: longitude };
    userLocationRef.current = nextPos;

    const gpsStateMeters =
      routePreviewActiveRef.current || navigationOpenRef.current ? 12 : GPS_STATE_UPDATE_METERS;
    const shouldUpdateState =
      !lastGpsStateUpdateRef.current ||
      haversineMeters(lastGpsStateUpdateRef.current, nextPos) >= gpsStateMeters;

    if (!hasGpsFixRef.current) {
      hasGpsFixRef.current = true;
      lastGpsStateUpdateRef.current = nextPos;
      if (isLocatingRef.current) {
        isLocatingRef.current = false;
        setIsLocating(false);
      }
      if (locationErrorRef.current) {
        locationErrorRef.current = null;
        setLocationError(null);
      }
      setUserLocation(nextPos);
    } else if (shouldUpdateState) {
      lastGpsStateUpdateRef.current = nextPos;
      setUserLocation(nextPos);
    }

    if (navigationOpenRef.current || !mapVisibleRef.current) return;

    const map = mapRef.current;
    if (!map) return;

    try {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([latitude, longitude]);
      } else {
        userMarkerRef.current = L.marker([latitude, longitude], {
          icon: createUserLocationIcon(),
          zIndexOffset: 500,
        }).addTo(map);
      }
      lastMarkerPositionRef.current = nextPos;
    } catch (error) {
      console.warn('Could not update user location marker:', error);
    }

    // Previewing a pin/event: keep the camera on the route, not chasing GPS.
    if (!followUserRef.current || routePreviewActiveRef.current) return;

    if (!hasInitialMapCenterRef.current) {
      try {
        markProgrammaticMapMove();
        map.setView([latitude, longitude], 14, { animate: false });
        hasInitialMapCenterRef.current = true;
        lastFollowPanRef.current = nextPos;
      } catch (error) {
        console.warn('Could not center map on first GPS fix:', error);
      }
      return;
    }

    const lastPan = lastFollowPanRef.current;
    if (lastPan && haversineMeters(lastPan, nextPos) < GPS_FOLLOW_PAN_METERS) return;

    lastFollowPanRef.current = nextPos;
    pendingFollowPanRef.current = nextPos;
    if (followPanRafRef.current != null) return;

    followPanRafRef.current = requestAnimationFrame(() => {
      followPanRafRef.current = null;
      const target = pendingFollowPanRef.current;
      const liveMap = mapRef.current;
      if (!target || !liveMap || !followUserRef.current || !mapVisibleRef.current) return;
      try {
        liveMap.panTo([target.lat, target.lng], { animate: false, noMoveStart: true });
      } catch (error) {
        console.warn('Could not follow user on map:', error);
      }
    });
  };

  const handleGeolocationError = (error: GeolocationPositionError) => {
    console.warn('Geolocation failed:', error);
    if (error.code === error.PERMISSION_DENIED) {
      hasGpsFixRef.current = false;
      userLocationRef.current = null;
      lastGpsStateUpdateRef.current = null;
      lastMarkerPositionRef.current = null;
      setUserLocation(null);
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.remove();
        } catch {
          // Marker may already be gone.
        }
        userMarkerRef.current = null;
      }
    }
    if (hasGpsFixRef.current || error.code === error.TIMEOUT) return;

    if (isLocatingRef.current) {
      isLocatingRef.current = false;
      setIsLocating(false);
    }

    const message =
      error.code === error.PERMISSION_DENIED
        ? 'Location permission denied. Enable GPS in your browser to follow the map.'
        : 'Could not get GPS. Check permissions and try again.';

    if (locationErrorRef.current !== message) {
      locationErrorRef.current = message;
      setLocationError(message);
    }
  };

  /** Re-enable follow mode and center on the latest GPS fix. */
  const handleLocateUser = () => {
    if (routePreviewActiveRef.current) {
      setFollowUser(false);
      followUserRef.current = false;
      routeAutoFitEnabledRef.current = true;
      fitRouteToAvailableView({ force: true });
      return;
    }

    setFollowUser(true);
    followUserRef.current = true;

    if (userLocationRef.current && mapRef.current) {
      const pos = userLocationRef.current;
      markProgrammaticMapMove();
      mapRef.current.setView([pos.lat, pos.lng], Math.max(mapRef.current.getZoom(), 14), {
        animate: false,
      });
      lastFollowPanRef.current = pos;
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => applyLiveUserPosition(position.coords.latitude, position.coords.longitude),
      handleGeolocationError,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  // Filter items in real time for accuracy
  const activeItems = useMemo((): ItemPost[] => {
    if (showingEvents) return [];

    return items.filter((item) => {
      if (item.status !== 'active' && item.status !== 'pending_pickup') return false;

      // 1. Search text filter
      const searchString = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      const matchesSearch = searchString.includes(sTerm.toLowerCase());

      // 2. Type filter (Gives / Asks)
      const matchesType = sType === 'all' || item.type === sType;

      // 3. Category filter
      const matchesCategory = sCat === 'All Categories' || item.category === sCat;

      // 4. Neighborhood filter
      const matchesNeighborhood = sNeigh === 'All Neighborhoods' || item.neighborhood === sNeigh;

      return matchesSearch && matchesType && matchesCategory && matchesNeighborhood;
    });
  }, [items, sType, sCat, sNeigh, sTerm, showingEvents]);

  useEffect(() => {
    const posterIds = activeItems
      .map((i) => i.userId)
      .filter((uid) => uid !== userProfile.uid);
    const uniquePosterIds = Array.from(new Set<string>(posterIds));
    if (uniquePosterIds.length === 0) {
      setPosterCoordByUid({});
      return;
    }
    void getUserPickupCoordinationByIds(uniquePosterIds).then(setPosterCoordByUid);
  }, [activeItems, userProfile.uid]);

  const activeEvents = useMemo(() => {
    if (!showEventsOnMap) return [];

    return events.filter((event) => {
      if (!isEventUpcoming(event)) return false;

      const searchString = `${event.title} ${event.description} ${event.location} ${event.neighborhood}`.toLowerCase();
      const matchesSearch = searchString.includes(sTerm.toLowerCase());
      const matchesNeighborhood = sNeigh === 'All Neighborhoods' || event.neighborhood === sNeigh;

      return matchesSearch && matchesNeighborhood;
    });
  }, [events, showEventsOnMap, sNeigh, sTerm]);

  const mapDisplayEvents = useMemo(
    () => pickSoonestPerEventSeries(activeEvents),
    [activeEvents],
  );

  // Only listings with an exact, viewer-visible GPS pin appear on the map.
  const blipPositions = useMemo(() => {
    const publicBlips = activeItems.flatMap((item) => {
      if (!hasExactMapPin(item, userProfile?.uid)) return [];
      const customCoords = extractGPSCoordinates(item.description)!;
      const { lat, lng } = convertPercentToLatLng(customCoords.x, customCoords.y);
      return [
        {
          item,
          lat,
          lng,
          color: getCategoryColor(item.category),
        },
      ];
    });
    const meetBlips = chatMeetLocations.flatMap((loc) => {
      const item = activeItems.find((i) => i.id === loc.itemId);
      if (!item || hasExactMapPin(item, userProfile?.uid)) return [];
      return [
        {
          item,
          lat: loc.lat,
          lng: loc.lng,
          color: getCategoryColor(item.category),
        },
      ];
    });
    return [...publicBlips, ...meetBlips];
  }, [activeItems, userProfile?.uid, chatMeetLocations]);

  const mapPinnedItems = useMemo(
    () => blipPositions.map((entry) => entry.item),
    [blipPositions],
  );

  // Find current listing index in filtered list for pagination
  const currentIndex = useMemo(() => {
    if (!selectedPost) return -1;
    return mapPinnedItems.findIndex((item) => item.id === selectedPost.id);
  }, [selectedPost, mapPinnedItems]);

  const currentEventIndex = useMemo(() => {
    if (!selectedEvent) return -1;
    return mapDisplayEvents.findIndex((event) => event.id === selectedEvent.id);
  }, [selectedEvent, mapDisplayEvents]);

  const handleNextPost = () => {
    if (mapPinnedItems.length <= 1 || currentIndex === -1) return;
    setSlideDirection('right');
    const nextIdx = (currentIndex + 1) % mapPinnedItems.length;
    setSelectedPost(mapPinnedItems[nextIdx]);
  };

  const handlePrevPost = () => {
    if (mapPinnedItems.length <= 1 || currentIndex === -1) return;
    setSlideDirection('left');
    const prevIdx = (currentIndex - 1 + mapPinnedItems.length) % mapPinnedItems.length;
    setSelectedPost(mapPinnedItems[prevIdx]);
  };

  const handleNextEvent = () => {
    if (mapDisplayEvents.length <= 1 || currentEventIndex === -1) return;
    setSlideDirection('right');
    const nextIdx = (currentEventIndex + 1) % mapDisplayEvents.length;
    setSelectedEvent(mapDisplayEvents[nextIdx]);
  };

  const handlePrevEvent = () => {
    if (mapDisplayEvents.length <= 1 || currentEventIndex === -1) return;
    setSlideDirection('left');
    const prevIdx = (currentEventIndex - 1 + mapDisplayEvents.length) % mapDisplayEvents.length;
    setSelectedEvent(mapDisplayEvents[prevIdx]);
  };

  const eventBlipPositions = useMemo(() => {
    return mapDisplayEvents.flatMap((event) => {
      if (
        typeof event.locationLat === 'number' &&
        typeof event.locationLng === 'number' &&
        Number.isFinite(event.locationLat) &&
        Number.isFinite(event.locationLng)
      ) {
        return [{ event, lat: event.locationLat, lng: event.locationLng }];
      }
      return [];
    });
  }, [mapDisplayEvents]);

  // Map mounted lifecycle hook
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Build leaflet map focusing on user sector
    const map = L.map(mapContainerRef.current, MAP_INIT_OPTIONS).setView(
      [fallbackLatLng.lat, fallbackLatLng.lng],
      12,
    );

    // Apply soft, beautiful CartoDB Voyager tile layer with NO labels/city-icons to keep the focus solely on the user's listing blips
    L.tileLayer(SBN_MAP_TILE_URL, SBN_MAP_TILE_OPTIONS).addTo(map);

    // Dynamic Markers Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;

    mapRef.current = map;
    setMapReady(true);

    const unsubscribeGeo = subscribeLiveGeolocation(
      (position) => applyLiveUserPosition(position.coords.latitude, position.coords.longitude),
      handleGeolocationError,
    );
    geoUnsubscribeRef.current = unsubscribeGeo;

    const onUserMapInteraction = () => {
      if (Date.now() < programmaticMapMoveUntilRef.current) return;
      routeAutoFitEnabledRef.current = false;
      setFollowUser(false);
      followUserRef.current = false;
    };
    map.on('dragstart', onUserMapInteraction);
    map.on('zoomstart', onUserMapInteraction);

    const refreshMapSize = () => {
      if (!mapVisibleRef.current) return;
      map.invalidateSize({ animate: false, pan: false });
    };

    const timer = window.setTimeout(refreshMapSize, 250);

    let resizeTimer: number | null = null;
    const onWindowResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshMapSize, 300);
    };
    window.addEventListener('resize', onWindowResize, { passive: true });

    return () => {
      window.clearTimeout(timer);
      if (resizeTimer) window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onWindowResize);
      map.off('dragstart', onUserMapInteraction);
      map.off('zoomstart', onUserMapInteraction);
      geoUnsubscribeRef.current?.();
      geoUnsubscribeRef.current = null;
      if (followPanRafRef.current != null) {
        cancelAnimationFrame(followPanRafRef.current);
        followPanRafRef.current = null;
      }
      hasInitialMapCenterRef.current = false;
      lastFollowPanRef.current = null;
      lastMarkerPositionRef.current = null;
      lastGpsStateUpdateRef.current = null;
      hasGpsFixRef.current = false;
      isLocatingRef.current = true;
      locationErrorRef.current = null;
      userLocationRef.current = null;
      itemMarkersRef.current.clear();
      eventMarkersRef.current.clear();
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      markersGroupRef.current = null;
      routeLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Sync listing/event pins incrementally — avoid clearLayers on every filter tick.
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!mapReady || !map || !markersGroup) return;

    const syncMarkers = <T,>(
      positions: { id: string; lat: number; lng: number; data: T }[],
      registry: Map<string, L.Marker>,
      createIcon: (data: T) => L.DivIcon,
      onSelect: (data: T, lat: number, lng: number) => void,
    ) => {
      const nextIds = new Set(positions.map((entry) => entry.id));

      registry.forEach((marker, id) => {
        if (nextIds.has(id)) return;
        markersGroup.removeLayer(marker);
        registry.delete(id);
      });

      positions.forEach(({ id, lat, lng, data }) => {
        const existing = registry.get(id);
        if (existing) {
          existing.setLatLng([lat, lng]);
          return;
        }

        const marker = L.marker([lat, lng], { icon: createIcon(data) })
          .addTo(markersGroup)
          .on('click', () => onSelect(data, lat, lng));
        registry.set(id, marker);
      });
    };

    if (showItemsOnMap) {
      syncMarkers(
        blipPositions.map(({ item, lat, lng, color }) => ({
          id: item.id,
          lat,
          lng,
          data: { item, color },
        })),
        itemMarkersRef.current,
        ({ item, color }) => createItemBlipIcon(item, color, false),
        ({ item }, lat, lng) => {
          setSlideDirection('right');
          setSelectedPost(item);
          setSelectedEvent(null);
          routeAutoFitEnabledRef.current = true;
          setFollowUser(false);
          followUserRef.current = false;
          framePinInViewRef.current(lat, lng);
        },
      );
    } else {
      itemMarkersRef.current.forEach((marker) => markersGroup.removeLayer(marker));
      itemMarkersRef.current.clear();
    }

    if (showEventsOnMap) {
      syncMarkers(
        eventBlipPositions.map(({ event, lat, lng }) => ({
          id: event.id,
          lat,
          lng,
          data: event,
        })),
        eventMarkersRef.current,
        () => createEventBlipIcon(false),
        (event, lat, lng) => {
          setSlideDirection('right');
          setSelectedEvent(event);
          setSelectedPost(null);
          routeAutoFitEnabledRef.current = true;
          setFollowUser(false);
          followUserRef.current = false;
          framePinInViewRef.current(lat, lng);
        },
      );
    } else {
      eventMarkersRef.current.forEach((marker) => markersGroup.removeLayer(marker));
      eventMarkersRef.current.clear();
    }
  }, [blipPositions, eventBlipPositions, showItemsOnMap, showEventsOnMap, mapReady]);

  // Highlight selected pin without rebuilding every marker.
  useEffect(() => {
    if (showEventsOnMap) {
      eventMarkersRef.current.forEach((marker, eventId) => {
        marker.setIcon(createEventBlipIcon(selectedEvent?.id === eventId));
      });
    }

    if (showItemsOnMap) {
      itemMarkersRef.current.forEach((marker, itemId) => {
        const blip = blipPositions.find((entry) => entry.item.id === itemId);
        if (!blip) return;
        marker.setIcon(createItemBlipIcon(blip.item, blip.color, selectedPost?.id === itemId));
      });
    }
  }, [selectedPost?.id, selectedEvent?.id, showItemsOnMap, showEventsOnMap, blipPositions, eventBlipPositions]);

  const routeDestination = useMemo(() => {
    if (selectedPost) {
      const chatMeet = chatMeetLocations.find((loc) => loc.itemId === selectedPost.id);
      const coordinated = resolveCoordinationDestination(
        selectedPost,
        userProfile.uid,
        chatMeet,
      );
      if (coordinated) return coordinated;
      const session = readActiveNavSession(userProfile.uid);
      if (session?.targetId === selectedPost.id && session.targetType === 'post') {
        return session.destination;
      }
      if (session?.postId === selectedPost.id) return session.destination;
      return null;
    }

    if (selectedEvent) {
      if (
        typeof selectedEvent.locationLat === 'number' &&
        typeof selectedEvent.locationLng === 'number' &&
        Number.isFinite(selectedEvent.locationLat) &&
        Number.isFinite(selectedEvent.locationLng)
      ) {
        return { lat: selectedEvent.locationLat, lng: selectedEvent.locationLng };
      }
      const session = readActiveNavSession(userProfile.uid);
      if (session?.targetId === selectedEvent.id && session.targetType === 'event') {
        return session.destination;
      }
    }

    return null;
  }, [selectedPost, selectedEvent, userProfile.uid, chatMeetLocations]);

  const navTargetLabel = selectedPost?.title ?? selectedEvent?.title ?? '';
  const navTargetId = selectedPost?.id ?? selectedEvent?.id ?? null;

  const hasGpsFix = userLocation != null;

  const {
    coords: routeCoords,
    distanceMeters: fetchedRouteDistanceMeters,
    durationSeconds: routeDurationSeconds,
    navRoute: prefetchedNavRoute,
    loading: routeLoading,
  } = usePreviewDrivingRoute(
    userLocation,
    routeDestination,
    true,
    selectedPost?.id ?? selectedEvent?.id ?? null,
  );

  useEffect(() => {
    routeCoordsRef.current = routeCoords;
  }, [routeCoords]);

  const mapRoutePreviewVisible = Boolean(
    hasMapSelection && routeDestination && routeCoords && routeCoords.length >= 2,
  );

  const liveRouteDistanceMeters = useMemo(() => {
    const here = userLocationRef.current ?? userLocation;
    if (routeCoords && here && routeCoords.length >= 2) {
      return remainingRouteMeters(routeCoords, here);
    }
    return fetchedRouteDistanceMeters;
  }, [routeCoords, userLocation, fetchedRouteDistanceMeters]);

  const routeEndpoints = useMemo(() => {
    if (!routeDestination) return null;
    const start = userLocationRef.current ?? userLocation;
    if (!start) return null;
    return { start, end: routeDestination };
  }, [routeDestination, hasGpsFix]);

  useEffect(() => {
    // Allow restore again when the signed-in user changes.
    navRestoreDoneRef.current = false;
  }, [userProfile.uid]);

  useEffect(() => {
    if (navRestoreDoneRef.current) return;

    const session = readActiveNavSession(userProfile.uid);
    if (!session) {
      navRestoreDoneRef.current = true;
      return;
    }

    if (session.targetType === 'event') {
      if (!eventsHydrated) return;

      const event = events.find((entry) => entry.id === session.targetId);
      if (!event) {
        // Only clear once the events feed has finished loading and the target is missing.
        clearActiveNavSession();
        navRestoreDoneRef.current = true;
        return;
      }

      navRestoreDoneRef.current = true;
      prevSelectedEventIdRef.current = event.id;
      lockNavOrigin();
      setSelectedEvent(event);
      setSelectedPost(null);
      setNavigationOpen(true);
      return;
    }

    if (!itemsHydrated) return;

    // Wait for a non-empty feed before treating a missing post as gone — a
    // transient empty load must not wipe an in-progress navigation session.
    if (items.length === 0) return;

    const post = items.find((item) => item.id === (session.targetId || session.postId));
    if (!post) {
      clearActiveNavSession();
      navRestoreDoneRef.current = true;
      return;
    }

    navRestoreDoneRef.current = true;
    prevSelectedPostIdRef.current = post.id;
    lockNavOrigin();
    setSelectedPost(post);
    setSelectedEvent(null);
    setNavigationOpen(true);
  }, [items, events, itemsHydrated, eventsHydrated, userProfile.uid, lockNavOrigin]);

  useEffect(() => {
    const currentId = selectedPost?.id;
    const previousId = prevSelectedPostIdRef.current;
    prevSelectedPostIdRef.current = currentId;

    if (previousId === undefined || previousId === currentId) return;

    if (!navigationOpenRef.current) return;
    setNavigationOpen(false);
    setLockedNavOrigin(null);
    clearActiveNavSession();
  }, [selectedPost?.id]);

  useEffect(() => {
    const currentId = selectedEvent?.id;
    const previousId = prevSelectedEventIdRef.current;
    prevSelectedEventIdRef.current = currentId;

    if (previousId === undefined || previousId === currentId) return;

    if (!navigationOpenRef.current) return;
    setNavigationOpen(false);
    setLockedNavOrigin(null);
    clearActiveNavSession();
  }, [selectedEvent?.id]);

  const persistNavigationSession = useCallback(() => {
    if (!routeDestination) return;

    const existing = readActiveNavSession(userProfile.uid);
    const startedAt =
      existing &&
      ((selectedPost && existing.targetId === selectedPost.id && existing.targetType === 'post') ||
        (selectedEvent && existing.targetId === selectedEvent.id && existing.targetType === 'event'))
        ? existing.startedAt
        : Date.now();

    if (selectedPost) {
      saveActiveNavSession({
        userId: userProfile.uid,
        targetType: 'post',
        targetId: selectedPost.id,
        postId: selectedPost.id,
        destination: routeDestination,
        destinationLabel: selectedPost.title,
        startedAt,
      });
      return;
    }

    if (selectedEvent) {
      saveActiveNavSession({
        userId: userProfile.uid,
        targetType: 'event',
        targetId: selectedEvent.id,
        destination: routeDestination,
        destinationLabel: selectedEvent.title,
        startedAt,
      });
    }
  }, [selectedPost, selectedEvent, routeDestination, userProfile.uid]);

  const openNavigation = useCallback(() => {
    if (!resolveUserGpsLocation()) return;
    unlockNavigationSpeech();
    lockNavOrigin();
    persistNavigationSession();
    setNavigationOpen(true);
  }, [lockNavOrigin, persistNavigationSession, resolveUserGpsLocation]);

  const handleExitNavigation = useCallback(() => {
    clearActiveNavSession();
    setLockedNavOrigin(null);
    setNavigationOpen(false);
  }, []);

  useEffect(() => {
    if (!navigationOpen || !routeDestination || (!selectedPost && !selectedEvent)) return;
    persistNavigationSession();
  }, [navigationOpen, selectedPost, selectedEvent, routeDestination, persistNavigationSession]);

  // Events navigate straight from the map pin. Curb alerts use "Pick Up" (direct nav, no poster notification).
  // Other types start their coordination flow (Go Get / Drop off / Meet up).
  const handleNavigateRequest = useCallback(async () => {
    if (!supportsInAppNavigation()) {
      if (selectedPost) openItemDetail?.(selectedPost);
      else if (selectedEvent) onViewEvent?.(selectedEvent);
      return;
    }

    if (selectedEvent) {
      openNavigation();
      return;
    }

    if (!selectedPost) return;
    if (selectedPost.userId === userProfile.uid) {
      if (!getItemMapDestination(selectedPost, userProfile.uid)) {
        openItemDetail?.(selectedPost);
        return;
      }
      openNavigation();
      return;
    }

    if (isStaffViewer) {
      const staffDestination =
        getItemMapDestination(selectedPost, userProfile.uid) ??
        getItemMapDestination(selectedPost, selectedPost.userId);
      if (staffDestination) {
        openNavigation();
        return;
      }
      openItemDetail?.(selectedPost);
      return;
    }

    const chatMeet = chatMeetLocations.find((loc) => loc.itemId === selectedPost.id);
    const destination = resolveCoordinationDestination(
      selectedPost,
      userProfile.uid,
      chatMeet,
    );
    if (!destination) {
      openItemDetail?.(selectedPost);
      return;
    }

    if (navigatesDirectlyToPin(selectedPost)) {
      openNavigation();
      return;
    }

    const { ensureGoGetAllowed } = await import('../lib/goGetEligibility');
    const allowed = await ensureGoGetAllowed({
      self: userProfile,
      otherUserId: selectedPost.userId,
      otherDisplayName: selectedPost.userDisplayName,
      alert,
    });
    if (!allowed) return;

    if (selectedPost.type === 'looking') {
      const ok = await confirmDropOffAsFulfiller(confirm, selectedPost.userDisplayName, selectedPost.title);
      if (!ok) return;
      // Poster waits (fulfiller); map user navigates with the item (requester).
      const result = await createGoGetSession({
        item: selectedPost,
        fulfillerUserId: selectedPost.userId,
        fulfillerName: selectedPost.userDisplayName,
        requesterUserId: userProfile.uid,
        requesterName: userProfile.displayName,
        destination,
        destinationLabel: `${selectedPost.userDisplayName}'s area`,
      });
      if (result.ok && result.session?.status === 'active') openNavigation();
      else if (!result.ok) await alert({ title: 'Could not start', message: result.errorMessage || 'Could not start drop off.' });
      else openItemDetail?.(selectedPost);
      return;
    }

    if (selectedPost.type === 'trade') {
      const ok = await confirmMeetUp(confirm, selectedPost.userDisplayName, selectedPost.title);
      if (!ok) return;
      const result = await createGoGetSession({
        item: selectedPost,
        fulfillerUserId: selectedPost.userId,
        fulfillerName: selectedPost.userDisplayName,
        requesterUserId: userProfile.uid,
        requesterName: userProfile.displayName,
        destination,
        destinationLabel: `Meetup: ${selectedPost.title}`,
      });
      if (result.ok && result.session?.status === 'active') openNavigation();
      else if (!result.ok) await alert({ title: 'Could not start', message: result.errorMessage || 'Could not start meet up.' });
      else openItemDetail?.(selectedPost);
      return;
    }

    const ok = await confirmGoGetAsRequester(
      confirm,
      selectedPost.userDisplayName,
      selectedPost.title,
      selectedPost.category,
    );
    if (!ok) return;
    const result = await createGoGetSession({
      item: selectedPost,
      fulfillerUserId: selectedPost.userId,
      fulfillerName: selectedPost.userDisplayName,
      requesterUserId: userProfile.uid,
      requesterName: userProfile.displayName,
      destination,
      destinationLabel: selectedPost.title,
    });
    if (result.ok && result.session?.status === 'active') openNavigation();
    else if (!result.ok) await alert({ title: 'Could not start', message: result.errorMessage || 'Could not start Go Get.' });
    else openItemDetail?.(selectedPost);
  }, [selectedEvent, selectedPost, userProfile, isStaffViewer, openNavigation, openItemDetail, confirm, alert, chatMeetLocations]);

  const handleOpenExternalMaps = useCallback(() => {
    if (!routeEndpoints) return;
    openDrivingDirections(routeEndpoints.end, routeEndpoints.start);
  }, [routeEndpoints]);

  const navigationOverlay =
    navigationOpen && routeDestination && lockedNavOrigin && navTargetId
      ? createPortal(
          <React.Fragment key={navTargetId}>
            <MapNavigationView
              origin={lockedNavOrigin}
              destination={routeDestination}
              destinationLabel={navTargetLabel}
              initialRoute={prefetchedNavRoute}
              onExit={handleExitNavigation}
            />
          </React.Fragment>,
          document.body,
        )
      : null;

  // Redraw only when the selected pin or polyline actually changes — GPS ticks
  // used to clearLayers() here and flash the line in place.
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    const activeTargetId = selectedPost?.id ?? selectedEvent?.id ?? null;
    if (!activeTargetId || !routeDestination || !routeCoords || routeCoords.length < 2) {
      lastFitCoordsKeyRef.current = null;
      return;
    }

    const destKey = `${routeDestination.lat.toFixed(5)},${routeDestination.lng.toFixed(5)}`;
    const destChanged = destKey !== lastFitDestKeyRef.current;
    const coordsFitKey = `${routeCoords.length}:${routeCoords[0][0].toFixed(4)},${routeCoords[0][1].toFixed(4)}:${routeCoords[routeCoords.length - 1][0].toFixed(4)},${routeCoords[routeCoords.length - 1][1].toFixed(4)}`;
    const coordsChanged = coordsFitKey !== lastFitCoordsKeyRef.current;

    if (destChanged) {
      lastFitDestKeyRef.current = destKey;
      routeAutoFitEnabledRef.current = true;
    }
    if (coordsChanged) {
      lastFitCoordsKeyRef.current = coordsFitKey;
    }

    L.polyline(routeCoords, ROUTE_LINE_CASING).addTo(routeLayer);
    L.polyline(routeCoords, ROUTE_LINE_MAIN).addTo(routeLayer);

    if (destChanged || coordsChanged) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => fitRouteToAvailableView({ force: destChanged }));
      });
    }
  }, [selectedPost?.id, selectedEvent?.id, routeDestination?.lat, routeDestination?.lng, routeCoords, fitRouteToAvailableView]);

  useEffect(() => {
    if (!hasMapSelection || selectionCardHeight <= 0) return;
    if (!routeCoordsRef.current || routeCoordsRef.current.length < 2) return;
    routeAutoFitEnabledRef.current = true;
    const id = window.requestAnimationFrame(() => fitRouteToAvailableView({ force: true }));
    return () => window.cancelAnimationFrame(id);
  }, [selectionCardHeight, hasMapSelection, fitRouteToAvailableView]);

  useEffect(() => {
    if (!mapRoutePreviewVisible) return;
    if (!routeCoordsRef.current || routeCoordsRef.current.length < 2) return;
    routeAutoFitEnabledRef.current = true;
    const id = window.requestAnimationFrame(() => fitRouteToAvailableView({ force: true }));
    return () => window.cancelAnimationFrame(id);
  }, [mapRoutePreviewVisible, fitRouteToAvailableView]);

  useEffect(() => {
    if (!routeDestination) {
      routeEndpointsRef.current = null;
      lastFitDestKeyRef.current = null;
      lastFitCoordsKeyRef.current = null;
      return;
    }
    const start = userLocationRef.current ?? userLocation;
    if (start) routeEndpointsRef.current = { start, end: routeDestination };
  }, [routeDestination, userLocation]);

  useEffect(() => {
    if (!routeDestination) return;
    if (routeCoords && routeCoords.length >= 2) return;
    framePinInView(routeDestination.lat, routeDestination.lng);
  }, [routeDestination?.lat, routeDestination?.lng, routeCoords, framePinInView]);

  // Neighborhood filter — don't steal the camera while a listing route is up.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routePreviewActiveRef.current) return;

    if (sNeigh && sNeigh !== 'All Neighborhoods') {
      const parentCoord = NEIGHBORHOOD_COORDS[sNeigh];
      if (parentCoord) {
        const { lat, lng } = convertPercentToLatLng(parentCoord.x, parentCoord.y);
        markProgrammaticMapMove();
        map.setView([lat, lng], 13, { animate: false });
      }
    }
  }, [sNeigh]);

  // Route bounds fit inside the markers rendering effect when routeCoords load.

  // Immersive mobile layout implementation
  if (isFullScreenMobile) {
    return (
      <div
        id="sacramento_interactive_map_view"
        className={`relative w-full h-full overflow-hidden font-sans${hasMapSelection ? ' sbn-map-has-selection' : ''}`}
      >
        {navigationOverlay}
        {/* Immersive Leaflet Container */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full z-0" 
          id="leaflet_map_immersive_mobile"
        />

        {/* Mobile map controls — zoom top-left; center bottom-left; new post bottom-right */}
        <div className="absolute sbn-map-edge-top left-3 z-20 pointer-events-auto" id="mobile_map_zoom_controls">
          <div className="flex flex-col bg-surface border border-app p-0.5 rounded-xl shadow-app w-11">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-11 h-11 flex items-center justify-center text-app bg-surface hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-t-lg"
              title="Zoom in"
              aria-label="Zoom in"
              id="mobile_zoom_in_btn"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="h-px bg-app mx-1" />
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-11 h-11 flex items-center justify-center text-app bg-surface hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-b-lg"
              title="Zoom out"
              aria-label="Zoom out"
              id="mobile_zoom_out_btn"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {!mapRoutePreviewVisible && (
          <button
            type="button"
            onClick={handleLocateUser}
            className={`absolute sbn-map-float-btn left-4 w-11 h-11 rounded-full shadow-app flex items-center justify-center transition-all active:scale-95 cursor-pointer border pointer-events-auto ${
              isLocating
                ? 'bg-accent text-on-accent border-accent'
                : followUser
                  ? 'bg-accent text-on-accent border-accent'
                  : 'bg-surface text-app hover:bg-surface-hover border-app'
            }`}
            id="mobile_floating_locator_btn"
            title={followUser ? 'Following your location (tap to recenter)' : 'Center on my location'}
            aria-label={followUser ? 'Following your location, tap to recenter' : 'Center on my location'}
          >
            <Compass className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
        )}

        {!mapRoutePreviewVisible && (
          <MapCreateFab onOpenNewPost={onOpenNewPost} className="absolute sbn-map-float-btn right-4" />
        )}

        {/* Location error toast */}
        {locationError && (
          <div className="absolute top-20 left-4 right-4 z-[35] sbn-card p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-app">⚠️ {locationError}</span>
            <button
              type="button"
              onClick={() => setLocationError(null)}
              aria-label="Dismiss location error"
              className="p-1.5 rounded-full text-muted hover:text-app hover:bg-inset cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Categories reference overlay sheet */}
        <AnimatePresence>
          {showColorGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 z-30 flex flex-col p-4 justify-end font-sans"
              id="mobile_color_guide_overlay"
              role="presentation"
              onClick={() => setShowColorGuide(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="sbn-card w-full max-h-[72vh] flex flex-col p-5 shadow-2xl rounded-b-none"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-app shrink-0">
                  <div>
                    <h4 className="font-display font-bold text-base text-app">Map color guide</h4>
                    <p className="text-xs text-muted mt-0.5">Tap a color to filter the map</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColorGuide(false)}
                    aria-label="Close map color guide"
                    className="p-2 rounded-full text-muted hover:text-app hover:bg-inset cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-accent mb-2">Giving</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ITEM_CATEGORIES.map((cat) => (
                        <div key={cat} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-inset">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
                          <span className="text-xs font-medium text-app truncate">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted mb-2">Looking for</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ISO_CATEGORIES.map((cat) => (
                        <div key={cat} className="flex items-center gap-2 py-1.5 px-2 rounded-xl bg-inset">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getCategoryColor(cat) }} />
                          <span className="text-xs font-medium text-app truncate">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected listing/event floating panel */}
        <div ref={selectionCardRef} className="absolute sbn-map-selection-dock z-30 pointer-events-none">
          <AnimatePresence>
            {selectedEvent && currentEventIndex >= 0 && (
              <MapSelectedEventCard
                event={selectedEvent}
                currentIndex={currentEventIndex}
                total={mapDisplayEvents.length}
                slideDirection={slideDirection}
                compact
                onClose={() => setSelectedEvent(null)}
                onPrev={handlePrevEvent}
                onNext={handleNextEvent}
                onViewEvent={onViewEvent}
                userProfile={userProfile}
                eventsEngagement={eventsEngagement}
                commentsLocked={commentsLocked}
                routeEndpoints={routeEndpoints}
                routeLoading={routeLoading}
                distanceMeters={liveRouteDistanceMeters}
                durationSeconds={routeDurationSeconds}
                routeOnMap={isRoadGeometry(routeCoords)}
                hasLiveGps={!!userLocation}
                canNavigate={supportsInAppNavigation() && hasGpsFix && !!routeDestination}
                onStartNavigation={handleNavigateRequest}
                onOpenExternalMaps={handleOpenExternalMaps}
              />
            )}
            {selectedPost && hasExactMapPin(selectedPost, userProfile?.uid) && (
              <MapSelectedListingCard
                compact
                post={selectedPost}
                currentIndex={currentIndex}
                total={mapPinnedItems.length}
                slideDirection={slideDirection}
                onClose={() => setSelectedPost(null)}
                onPrev={handlePrevPost}
                onNext={handleNextPost}
                userProfile={userProfile}
                isStaffViewer={isStaffViewer}
                userLat={userLocation?.lat ?? null}
                userLng={userLocation?.lng ?? null}
                openItemDetail={openItemDetail}
                onEditItem={onEditItem}
                onClaimSubmitted={onClaimSubmitted}
                onStaffListingChat={onStaffListingChat}
                onInitiateChat={onInitiateChat}
                usesNavigate={neighborListingUsesNavigate(selectedPost)}
                routeEndpoints={routeEndpoints}
                routeLoading={routeLoading}
                distanceMeters={liveRouteDistanceMeters}
                durationSeconds={routeDurationSeconds}
                routeOnMap={isRoadGeometry(routeCoords)}
                hasLiveGps={!!userLocation}
                canNavigate={supportsInAppNavigation() && hasGpsFix && !!routeDestination}
                navigateLabel={
                  isStaffViewer || !supportsGoGetCoordination()
                    ? 'Navigate'
                    : getListingNavigateLabel(selectedPost)
                }
                onStartNavigation={handleNavigateRequest}
                onOpenExternalMaps={handleOpenExternalMaps}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Standard interactive map layouts for desktop/tablet
  return (
    <div id="sacramento_interactive_map_view" className="bg-surface border border-app p-5 rounded-2xl font-sans flex flex-col space-y-4 text-app">
      {navigationOverlay}
      {selectedType === undefined && (
        <div className="flex flex-col space-y-1 pb-2 border-b border-app">
          <span className="text-[9px] font-black text-accent uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent animate-ping"></span>
            Sacramento Neighborhood Map
          </span>
          <h2 className="text-sm font-bold text-app tracking-tight">Interactive Community Items</h2>
        </div>
      )}

      {/* Internal Filter Controls if running in standalone mode */}
      {selectedType === undefined && (
        <div className="bg-inset border border-app p-4 rounded-xl space-y-3" id="map_internal_filters">
          <div className="flex flex-col xs:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search pins (e.g. table, books)..."
                className="sbn-input text-xs"
                id="map_internal_search_input"
              />
            </div>

            {/* Type buttons + category index */}
            <div className="flex bg-surface p-1 border border-app gap-1 rounded-xl shrink-0" id="map_internal_type_selector">
              <button
                onClick={() => { setLocalType('all'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg ${
                  localType === 'all' ? 'bg-accent text-on-accent shadow-xs' : 'text-muted hover:text-app'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setLocalType('giveaway'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg ${
                  localType === 'giveaway' ? 'bg-accent text-on-accent shadow-xs' : 'text-muted hover:text-app'
                }`}
              >
                Gives
              </button>
              <button
                onClick={() => { setLocalType('looking'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg ${
                  localType === 'looking' ? 'bg-accent text-on-accent shadow-xs' : 'text-muted hover:text-app'
                }`}
              >
                Asks
              </button>
              <button
                onClick={() => { setLocalType('trade'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg ${
                  localType === 'trade' ? 'bg-accent text-on-accent shadow-xs' : 'text-muted hover:text-app'
                }`}
              >
                Trade
              </button>
              <button
                onClick={() => { setLocalType('events'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg ${
                  localType === 'events' ? 'bg-accent text-on-accent shadow-xs' : 'text-muted hover:text-app'
                }`}
              >
                Events
              </button>
              <button
                type="button"
                onClick={() => setShowColorGuide(true)}
                className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg text-muted hover:text-app border-l border-app ml-0.5 pl-2.5"
                id="map_internal_color_index_btn"
              >
                🎨 Index
              </button>
            </div>
          </div>

          <div className={`grid gap-2.5 ${localType === 'events' ? 'grid-cols-1' : 'grid-cols-2'}`} id="map_internal_dropdowns">
            {/* Category selection */}
            {localType !== 'events' && (
            <div className="flex items-center space-x-1.5 bg-surface px-3 py-2 border border-app rounded-xl">
              <Tag className="w-3.5 h-3.5 text-subtle shrink-0" />
              <select
                value={localCategory}
                onChange={(e) => setLocalCategory(e.target.value)}
                className="w-full bg-transparent text-[11px] text-app font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider font-sans"
                id="map_internal_category_select"
              >
                <option value="All Categories" className="bg-surface text-app">All Categories</option>
                {localType === 'all' ? (
                  <>
                    <optgroup label="OFFERS / GIFTS" className="text-[10px] bg-inset text-accent uppercase font-bold">
                      {ITEM_CATEGORIES.map((c) => (
                        <option key={`map_giv_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ISO / REQUESTS" className="text-[10px] bg-inset text-muted uppercase font-bold">
                      {ISO_CATEGORIES.map((c) => (
                        <option key={`map_iso_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                      ))}
                    </optgroup>
                  </>
                ) : localType === 'giveaway' || localType === 'trade' ? (
                  ITEM_CATEGORIES.map((c) => (
                    <option key={`map_${localType}_only_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                  ))
                ) : (
                  ISO_CATEGORIES.map((c) => (
                    <option key={`map_iso_only_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                  ))
                )}
              </select>
            </div>
            )}

            {/* Neighborhood selection */}
            <div className="flex items-center space-x-1.5 bg-surface px-3 py-2 border border-app rounded-xl">
              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
              <select
                value={localNeighborhood}
                onChange={(e) => setLocalNeighborhood(e.target.value)}
                className="w-full bg-transparent text-[11px] text-app font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider font-sans"
                id="map_internal_neighborhood_select"
              >
                <option value="All Neighborhoods" className="bg-surface text-app">All Neighborhoods</option>
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} className="bg-surface text-app">{n.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-app pb-2.5">
        <div>
          <h3 className="text-[11px] font-black text-accent uppercase tracking-widest flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-accent animate-pulse rounded-full"></span>
            Sacramento Activity Map
          </h3>
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5" id="active_pins_count_display">
            {showingEvents
              ? `${mapDisplayEvents.length} events · ${eventBlipPositions.length} on map`
              : `${activeItems.length} listings · ${blipPositions.length} on map`}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 bg-inset border border-app px-2.5 py-1 rounded-lg select-none">
            <span className="text-[9px] font-black text-subtle uppercase tracking-wider font-mono">NEIGHBORHOOD GPS</span>
          </div>
        </div>
      </div>

      {/* Map Sandbox Visualizer */}
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-inset border border-app rounded-2xl overflow-hidden select-none" id="sacramento_district_grid_canvas_font_sans">
        {/* Real Leaflet Map Render Surface */}
        <div ref={mapContainerRef} className="w-full h-full z-0" id="leaflet_map_render_canvas" />

        {/* Legend Overlay Map Cards */}
        <div className="absolute top-3 left-3 bg-surface/95 border border-app p-3 z-10 space-y-1.5 shadow-xl max-w-[155px] scale-90 origin-top-left rounded-xl text-app">
          <span className="text-[8.5px] font-black text-subtle uppercase tracking-widest block font-mono">Legend</span>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-950 bg-accent block shrink-0"></span>
            <span>GIVING (black ring)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white bg-white block shrink-0"></span>
            <span>LOOKING (white ring)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-400 bg-zinc-400 block shrink-0"></span>
            <span>TRADE (grey ring)</span>
          </div>
        </div>

        {/* Custom Map Controller HUD Panel (Zoom & Live Locating) on the opposite side, stacked vertically with Locate at bottom under zoom */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-2 shadow-xl select-none" id="custom_map_hud_panel">
          {/* Zoom Actions Container */}
          <div className="flex flex-col bg-surface/95 border border-app p-0.5 rounded-xl shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-8.5 h-8.5 flex items-center justify-center text-app hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-t-lg"
              title="Zoom In"
              aria-label="Zoom in"
              id="custom_zoom_in_btn"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-app/20 mx-1" />
            <button
              type="button"
              onClick={handleZoomOut}
              className="w-8.5 h-8.5 flex items-center justify-center text-app hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-b-lg"
              title="Zoom Out"
              aria-label="Zoom out"
              id="custom_zoom_out_btn"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Center to User (Locate Me) control at the bottom under the +- */}
          {!mapRoutePreviewVisible && (
            <button
              type="button"
              onClick={handleLocateUser}
              className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl shadow-md border transition-all active:scale-95 cursor-pointer ${
                isLocating
                  ? 'bg-accent text-on-accent border-accent'
                  : followUser
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-surface/95 border-app text-app hover:bg-surface-hover hover:text-accent'
              }`}
              title={followUser ? 'Following your location (tap to recenter)' : 'Follow my location'}
              aria-label={followUser ? 'Following your location, tap to recenter' : 'Follow my location'}
              id="custom_locate_user_btn"
            >
              <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {!mapRoutePreviewVisible && (
          <MapCreateFab onOpenNewPost={onOpenNewPost} className="absolute bottom-3 left-3 z-10" />
        )}

        {/* Category Color Guide Drawer Overlay */}
        <AnimatePresence>
          {showColorGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000]/80 backdrop-blur-sm z-40 flex flex-col p-4 overflow-hidden font-sans"
              id="map_category_color_guide_overlay"
            >
              <div className="bg-surface border border-app rounded-2xl flex-1 flex flex-col p-4 overflow-hidden max-h-full text-app">
                <div className="flex items-center justify-between border-b border-app pb-2 mb-3 shrink-0">
                  <div>
                    <h4 className="text-[10px] font-black text-app uppercase tracking-widest">Category Colors Index</h4>
                    <p className="text-[8.5px] text-muted font-bold uppercase tracking-wider block mt-0.5">
                      {selectedType === undefined ? 'Touch color to isolate on map' : 'Color map reference'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowColorGuide(false)}
                    aria-label="Close map color guide"
                    className="p-1 px-2 text-muted hover:text-app cursor-pointer bg-inset rounded-lg border border-app"
                    id="close_color_guide_btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <div>
                    <h5 className="text-[9px] font-extrabold text-accent uppercase tracking-wider mb-2 font-mono">Gives / Offers Colors</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                      {ITEM_CATEGORIES.map((cat) => {
                        const col = getCategoryColor(cat);
                        const isCurrentActive = sCat === cat;
                        return (
                          <div
                            key={cat}
                            onClick={() => {
                              if (selectedType === undefined) {
                                setLocalType('giveaway');
                                setLocalCategory(cat);
                              }
                              setShowColorGuide(false);
                            }}
                            className={`flex items-center gap-2 py-1 px-1.5 border rounded-lg cursor-pointer transition-all ${
                              isCurrentActive ? 'border-accent bg-accent/10' : 'border-transparent hover:border-app hover:bg-inset'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: col }} />
                            <span className="truncate uppercase text-[8.5px] font-bold text-muted">{cat}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-app pt-3">
                    <h5 className="text-[9px] font-extrabold text-muted uppercase tracking-wider mb-2 font-mono">Asks / ISO Colors</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                      {ISO_CATEGORIES.map((cat) => {
                        const col = getCategoryColor(cat);
                        const isCurrentActive = sCat === cat;
                        return (
                          <div
                            key={cat}
                            onClick={() => {
                              if (selectedType === undefined) {
                                setLocalType('looking');
                                setLocalCategory(cat);
                              }
                              setShowColorGuide(false);
                            }}
                            className={`flex items-center gap-2 py-1 px-1.5 border rounded-lg cursor-pointer transition-all ${
                              isCurrentActive ? 'border-accent bg-accent/10' : 'border-transparent hover:border-app hover:bg-inset'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: col }} />
                            <span className="truncate uppercase text-[8.5px] font-bold text-muted">{cat}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedType === undefined && (localType !== 'all' || localCategory !== 'All Categories') && (
                  <button
                    onClick={() => {
                      setLocalType('all');
                      setLocalCategory('All Categories');
                      setShowColorGuide(false);
                    }}
                    className="mt-3 w-full bg-accent text-on-accent py-2 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-accent-hover transition-colors cursor-pointer shrink-0"
                    id="map_clear_colors_filter_btn"
                  >
                    Clear Filter (Show All Map)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fallback Empty Guide - Beautiful, non-blocking friendly popup overlay */}
        {((itemsHydrated && showItemsOnMap && blipPositions.length === 0 && (!showEventsOnMap || eventBlipPositions.length === 0)) ||
          (eventsHydrated && showingEvents && eventBlipPositions.length === 0)) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-[var(--color-accent)]/30 p-3.5 shadow-2xl rounded-2xl z-20 w-[90%] max-w-sm text-center animate-pulse-short">
            <div className="flex items-start space-x-3 text-left">
              <div className="p-2 bg-[var(--color-accent)]/10 text-accent rounded-xl shrink-0 mt-0.5">
                {showingEvents ? <CalendarDays className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-app uppercase tracking-widest">
                  {showingEvents ? 'No Events On Map' : 'Quiet Neighborhood Sector'}
                </h4>
                <p className="text-[10px] text-muted font-semibold leading-relaxed">
                  {showingEvents
                    ? 'No events with a map pin match your filters. Events without a set location still appear in the list.'
                    : 'No pinned listings match your filters. Listings without a map pin only appear in the Stuff feed.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Blip Mini Card Slide Panel */}
      <AnimatePresence mode="popLayout">
        {selectedEvent && currentEventIndex >= 0 && (
          <MapSelectedEventCard
            event={selectedEvent}
            currentIndex={currentEventIndex}
            total={activeEvents.length}
            slideDirection={slideDirection}
            onClose={() => setSelectedEvent(null)}
            onPrev={handlePrevEvent}
            onNext={handleNextEvent}
            onViewEvent={onViewEvent}
            userProfile={userProfile}
            eventsEngagement={eventsEngagement}
            commentsLocked={commentsLocked}
            routeEndpoints={routeEndpoints}
            routeLoading={routeLoading}
            distanceMeters={liveRouteDistanceMeters}
            durationSeconds={routeDurationSeconds}
            routeOnMap={isRoadGeometry(routeCoords)}
            hasLiveGps={!!userLocation}
                    canNavigate={supportsInAppNavigation() && hasGpsFix && !!routeDestination}
            onStartNavigation={handleNavigateRequest}
            onOpenExternalMaps={handleOpenExternalMaps}
          />
        )}
        {selectedPost && hasExactMapPin(selectedPost, userProfile?.uid) && (
          <MapSelectedListingCard

            post={selectedPost}
            currentIndex={currentIndex}
            total={mapPinnedItems.length}
            slideDirection={slideDirection}
            onClose={() => setSelectedPost(null)}
            onPrev={handlePrevPost}
            onNext={handleNextPost}
            userProfile={userProfile}
            isStaffViewer={isStaffViewer}
            userLat={userLocation?.lat ?? null}
            userLng={userLocation?.lng ?? null}
            openItemDetail={openItemDetail}
            onEditItem={onEditItem}
            onClaimSubmitted={onClaimSubmitted}
            onStaffListingChat={onStaffListingChat}
            onInitiateChat={onInitiateChat}
            usesNavigate={neighborListingUsesNavigate(selectedPost)}
            routeEndpoints={routeEndpoints}
            routeLoading={routeLoading}
            distanceMeters={liveRouteDistanceMeters}
            durationSeconds={routeDurationSeconds}
            routeOnMap={isRoadGeometry(routeCoords)}
            hasLiveGps={!!userLocation}
            canNavigate={supportsInAppNavigation() && hasGpsFix && !!routeDestination}
            navigateLabel={
              isStaffViewer || !supportsGoGetCoordination()
                ? 'Navigate'
                : getListingNavigateLabel(selectedPost)
            }
            onStartNavigation={handleNavigateRequest}
            onOpenExternalMaps={handleOpenExternalMaps}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
