import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, UserProfile, ITEM_CATEGORIES, ISO_CATEGORIES, extractGPSCoordinates, NEIGHBORHOOD_COORDS, convertPercentToLatLng, CommunityEvent } from '../types';
import {
  canViewerSeeExactLocation,
  hasStoredGps,
  stripListingMetadata,
} from '../lib/itemLocation';
import { extractListingImageUrls } from '../lib/listingContent';
import {
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  haversineMeters,
  isRoadGeometry,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import MapNavigationView from './MapNavigationView';
import NavigateNotifyDialog from './NavigateNotifyDialog';
import { notifyPosterEnRoute } from '../lib/navigationNotify';
import { MapPin, MessageSquare, X, Tag, Eye, Compass, ChevronLeft, ChevronRight, Plus, Minus, Pencil, Navigation, CalendarDays, Map as MapIcon } from 'lucide-react';
import ClaimAtPickupButton from './ClaimAtPickupButton';
import ListingImage from './ListingImage';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';
import { getPostTypeMapDetailLabel, getPostTypeMapLabel, isEventsMapFilter, type MapContentFilter } from '../lib/postType';

interface SacramentoMapViewProps {
  items: ItemPost[];
  events?: CommunityEvent[];
  userProfile: UserProfile;
  selectedType?: MapContentFilter;
  selectedCategory?: string;
  selectedNeighborhood?: string;
  searchTerm?: string;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
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
}

const EVENT_MAP_COLOR = '#9333EA';

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
    'Porch Pickup': '#F97316', 
    'Free Pile / Box': '#F59E0B', 
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
    'Borrow Request': '#EAB308', 
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
  return colors[category] || '#FF6A39'; 
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

const MAP_TILE_OPTIONS = {
  maxZoom: 19,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 3,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
} as const;

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
}) {
  return (
    <motion.div
      key={event.id}
      initial={{ opacity: 0, x: slideDirection === 'right' ? (compact ? 70 : 80) : -(compact ? 70 : 80) }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideDirection === 'right' ? -(compact ? 70 : 80) : compact ? 70 : 80 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={compact ? 'pointer-events-auto sbn-card p-4 shadow-2xl w-full' : 'border border-app bg-surface p-4 relative font-sans text-app rounded-2xl shadow-xl'}
      id={compact ? 'mobile_map_event_detail_card' : 'map_event_detail_card'}
    >
      <div className={`absolute top-3 right-12 flex items-center space-x-1 pointer-events-auto bg-inset border border-app px-2 py-1 rounded-lg ${compact ? '' : 'top-2.5 py-0.5'}`}>
        <button
          type="button"
          onClick={onPrev}
          disabled={total <= 1}
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
          className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
        >
          <ChevronRight className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 text-muted hover:text-app transition-colors cursor-pointer bg-inset border border-app p-1 rounded-lg"
      >
        <X className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      <div className={`flex gap-3 ${compact ? 'mt-2' : 'gap-4 text-left'}`}>
        <div
          className={`shrink-0 rounded-xl border border-app flex items-center justify-center ${compact ? 'w-16 h-16' : 'w-18 h-18 sm:w-24 sm:h-24'}`}
          style={{ backgroundColor: `${EVENT_MAP_COLOR}22` }}
        >
          <CalendarDays className={compact ? 'w-7 h-7' : 'w-9 h-9'} style={{ color: EVENT_MAP_COLOR }} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[7.5px] font-bold tracking-wider text-white"
              style={{ backgroundColor: EVENT_MAP_COLOR }}
            >
              📅 EVENT
            </span>
            <h4 className={`font-semibold text-app mt-1 truncate ${compact ? 'text-xs' : 'text-sm'}`}>{event.title}</h4>
            <p className={`text-muted mt-0.5 line-clamp-2 ${compact ? 'text-[9.5px]' : 'text-xs'}`}>{event.description}</p>
            <p className={`text-accent font-semibold mt-1 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
              {formatEventMapDate(event.eventStartAt)}
            </p>
            <p className={`text-muted mt-0.5 truncate ${compact ? 'text-[8px]' : 'text-[9px]'}`}>
              {event.location} · {event.neighborhood}
            </p>
          </div>

          {onViewEvent && (
            <div className={`flex gap-1 shrink-0 ${compact ? 'mt-2 pt-2 border-t border-app' : 'mt-3 pt-3 border-t border-app'}`}>
              <button
                type="button"
                onClick={() => onViewEvent(event)}
                className="sbn-btn sbn-btn-primary sbn-btn-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                View event
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface MapSelectionRouteRowProps {
  selectedPost: ItemPost;
  routeEndpoints: { start: LatLng; end: LatLng } | null;
  routeLoading: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  routeOnMap: boolean;
  hasLiveGps: boolean;
  viewerUserId: string;
  onStartNavigation?: () => void;
  onOpenExternalMaps?: () => void;
  canNavigate?: boolean;
}

function MapSelectionRouteRow({
  selectedPost,
  routeEndpoints,
  routeLoading,
  distanceMeters,
  durationSeconds,
  routeOnMap,
  hasLiveGps,
  viewerUserId,
  onStartNavigation,
  onOpenExternalMaps,
  canNavigate = false,
}: MapSelectionRouteRowProps) {
  if (!routeEndpoints) return null;

  const exactPin = canViewerSeeExactLocation(selectedPost, viewerUserId);
  const locationHint = exactPin
    ? 'Exact pickup pin on map'
    : `Approx. area · ${selectedPost.neighborhood}`;

  return (
    <div className="mt-2 pt-2 border-t border-app flex items-center gap-2">
      <div className="flex-1 min-w-0">
        {routeLoading ? (
          <p className="text-[9px] font-medium text-muted animate-pulse">Calculating route…</p>
        ) : distanceMeters != null ? (
          <>
            <p className="text-[10px] font-bold text-app leading-snug">
              <span className="text-accent">{formatRouteDistance(distanceMeters)}</span>
              <span className="text-muted font-semibold"> away</span>
              {durationSeconds != null && durationSeconds > 0 && (
                <span className="text-muted font-semibold">
                  {' '}
                  · {formatRouteDuration(durationSeconds)} drive
                </span>
              )}
            </p>
            <p className="text-[8px] text-muted mt-0.5 truncate">{locationHint}</p>
            {!hasLiveGps && (
              <p className="text-[7.5px] text-subtle mt-0.5">Enable GPS for distance from you</p>
            )}
            {!routeOnMap && distanceMeters != null && (
              <p className="text-[7.5px] text-subtle mt-0.5">Road route loading…</p>
            )}
          </>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onStartNavigation?.()}
          disabled={!canNavigate || !onStartNavigation}
          className="sbn-btn sbn-btn-primary sbn-btn-sm disabled:opacity-40"
          title={canNavigate ? 'Start in-app turn-by-turn navigation' : 'Enable GPS to navigate'}
        >
          <Navigation className="w-3.5 h-3.5" />
          Navigate
        </button>
        {onOpenExternalMaps && hasLiveGps && (
          <button
            type="button"
            onClick={onOpenExternalMaps}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
            title="Open directions in Google or Apple Maps"
          >
            <MapIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
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
}: SacramentoMapViewProps) {
  const openItemDetail = onViewItem || onItemDetail;
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [navigateNotifyOpen, setNavigateNotifyOpen] = useState(false);
  const [notifyingPoster, setNotifyingPoster] = useState(false);
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

  useEffect(() => {
    if (showingEvents) {
      setSelectedPost(null);
    } else {
      setSelectedEvent(null);
    }
  }, [showingEvents]);

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
  const selectedPostRef = useRef<ItemPost | null>(null);
  const navigationOpenRef = useRef(false);
  const navigateNotifyOpenRef = useRef(false);
  const hasInitialMapCenterRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [followUser, setFollowUser] = useState(true);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const routeFetchIdRef = useRef(0);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const routeEndpointsRef = useRef<{ start: { lat: number; lng: number }; end: { lat: number; lng: number } } | null>(null);
  const routeFitForPostIdRef = useRef<string | null>(null);

  // Default coordinate centered around the user's neighborhood
  const userNeighborhood = userProfile?.neighborhood || 'Midtown';
  const defaultCoord = NEIGHBORHOOD_COORDS[userNeighborhood] || { x: 53, y: 40 };
  const fallbackLatLng = useMemo(() => convertPercentToLatLng(defaultCoord.x, defaultCoord.y), [defaultCoord]);

  useEffect(() => {
    selectedPostRef.current = selectedPost;
  }, [selectedPost]);

  useEffect(() => {
    navigationOpenRef.current = navigationOpen;
  }, [navigationOpen]);

  useEffect(() => {
    navigateNotifyOpenRef.current = navigateNotifyOpen;
  }, [navigateNotifyOpen]);

  const immersiveNavActive = navigationOpen || navigateNotifyOpen;

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
    mapVisibleRef.current = mapVisible;
    if (!mapVisible) return;

    const map = mapRef.current;
    if (!map) return;

    const pos = userLocationRef.current;
    if (pos) {
      try {
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([pos.lat, pos.lng]);
        } else if (!navigationOpenRef.current && !navigateNotifyOpenRef.current) {
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

    const shouldUpdateState =
      !lastGpsStateUpdateRef.current ||
      haversineMeters(lastGpsStateUpdateRef.current, nextPos) >= GPS_STATE_UPDATE_METERS;

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

    if (navigationOpenRef.current || navigateNotifyOpenRef.current || !mapVisibleRef.current) return;

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

    if (!followUserRef.current || selectedPostRef.current) return;

    if (!hasInitialMapCenterRef.current) {
      try {
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
    setFollowUser(true);
    followUserRef.current = true;

    if (userLocationRef.current && mapRef.current) {
      const pos = userLocationRef.current;
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
  const activeItems = useMemo(() => {
    if (showingEvents) return [];

    return items.filter((item) => {
      if (item.status !== 'active') return false;

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

  const activeEvents = useMemo(() => {
    if (!showingEvents) return [];

    return events.filter((event) => {
      if (event.status !== 'active') return false;

      const searchString = `${event.title} ${event.description} ${event.location} ${event.neighborhood}`.toLowerCase();
      const matchesSearch = searchString.includes(sTerm.toLowerCase());
      const matchesNeighborhood = sNeigh === 'All Neighborhoods' || event.neighborhood === sNeigh;

      return matchesSearch && matchesNeighborhood;
    });
  }, [events, showingEvents, sNeigh, sTerm]);

  // Find current listing index in filtered list for pagination
  const currentIndex = useMemo(() => {
    if (!selectedPost) return -1;
    return activeItems.findIndex(item => item.id === selectedPost.id);
  }, [selectedPost, activeItems]);

  const currentEventIndex = useMemo(() => {
    if (!selectedEvent) return -1;
    return activeEvents.findIndex((event) => event.id === selectedEvent.id);
  }, [selectedEvent, activeEvents]);

  const handleNextPost = () => {
    if (activeItems.length <= 1 || currentIndex === -1) return;
    setSlideDirection('right');
    const nextIdx = (currentIndex + 1) % activeItems.length;
    setSelectedPost(activeItems[nextIdx]);
  };

  const handlePrevPost = () => {
    if (activeItems.length <= 1 || currentIndex === -1) return;
    setSlideDirection('left');
    const prevIdx = (currentIndex - 1 + activeItems.length) % activeItems.length;
    setSelectedPost(activeItems[prevIdx]);
  };

  const handleNextEvent = () => {
    if (activeEvents.length <= 1 || currentEventIndex === -1) return;
    setSlideDirection('right');
    const nextIdx = (currentEventIndex + 1) % activeEvents.length;
    setSelectedEvent(activeEvents[nextIdx]);
  };

  const handlePrevEvent = () => {
    if (activeEvents.length <= 1 || currentEventIndex === -1) return;
    setSlideDirection('left');
    const prevIdx = (currentEventIndex - 1 + activeEvents.length) % activeEvents.length;
    setSelectedEvent(activeEvents[prevIdx]);
  };

  // Distribute points deterministically
  const blipPositions = useMemo(() => {
    const neighborhoodCounts: Record<string, number> = {};
    
    return activeItems.map((item) => {
      const customCoords = extractGPSCoordinates(item.description);
      const hasPin = hasStoredGps(item.description);
      const showExactPin = hasPin && customCoords && canViewerSeeExactLocation(item, userProfile?.uid);

      // Use the pickup pin the poster saved — never scatter when GPS exists and is visible
      if (showExactPin && customCoords) {
        const { lat, lng } = convertPercentToLatLng(customCoords.x, customCoords.y);
        return {
          item,
          lat,
          lng,
          color: getCategoryColor(item.category),
        };
      }

      // No GPS pin (or hidden from this viewer): approximate by neighborhood sector
      const parentCoord = NEIGHBORHOOD_COORDS[item.neighborhood] || { x: 50, y: 50 };
      const currentCount = neighborhoodCounts[item.neighborhood] || 0;
      neighborhoodCounts[item.neighborhood] = currentCount + 1;

      let hash = 0;
      for (let i = 0; i < item.id.length; i++) {
        hash = (hash * 13 + item.id.charCodeAt(i)) % 360;
      }
      
      const angle = (hash + currentCount * 73) * (Math.PI / 180);
      const radius = currentCount === 0 ? 0 : 3.2 + Math.min(currentCount * 1.5, 7.5); 
      
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      const px = Math.max(8, Math.min(92, parentCoord.x + dx));
      const py = Math.max(8, Math.min(92, parentCoord.y + dy));
      const { lat, lng } = convertPercentToLatLng(px, py);

      return {
        item,
        lat,
        lng,
        color: getCategoryColor(item.category)
      };
    });
  }, [activeItems, userProfile?.uid]);

  const eventBlipPositions = useMemo(() => {
    const neighborhoodCounts: Record<string, number> = {};

    return activeEvents.map((event) => {
      const parentCoord = NEIGHBORHOOD_COORDS[event.neighborhood] || { x: 50, y: 50 };
      const currentCount = neighborhoodCounts[event.neighborhood] || 0;
      neighborhoodCounts[event.neighborhood] = currentCount + 1;

      let hash = 0;
      for (let i = 0; i < event.id.length; i++) {
        hash = (hash * 17 + event.id.charCodeAt(i)) % 360;
      }

      const angle = (hash + currentCount * 61) * (Math.PI / 180);
      const radius = currentCount === 0 ? 0 : 3.5 + Math.min(currentCount * 1.6, 8);

      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      const px = Math.max(8, Math.min(92, parentCoord.x + dx));
      const py = Math.max(8, Math.min(92, parentCoord.y + dy));
      const { lat, lng } = convertPercentToLatLng(px, py);

      return { event, lat, lng };
    });
  }, [activeEvents]);

  // Map mounted lifecycle hook
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Build leaflet map focusing on user sector
    const map = L.map(mapContainerRef.current, MAP_INIT_OPTIONS).setView(
      [fallbackLatLng.lat, fallbackLatLng.lng],
      12,
    );

    // Apply soft, beautiful CartoDB Voyager tile layer with NO labels/city-icons to keep the focus solely on the user's listing blips
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', MAP_TILE_OPTIONS).addTo(map);

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

    const onUserPanMap = () => {
      setFollowUser(false);
      followUserRef.current = false;
    };
    map.on('dragstart', onUserPanMap);

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
      map.off('dragstart', onUserPanMap);
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

    if (showingEvents) {
      itemMarkersRef.current.forEach((marker) => markersGroup.removeLayer(marker));
      itemMarkersRef.current.clear();

      syncMarkers(
        eventBlipPositions.map(({ event, lat, lng }) => ({
          id: event.id,
          lat,
          lng,
          data: event,
        })),
        eventMarkersRef.current,
        (event) => createEventBlipIcon(false),
        (event, lat, lng) => {
          setSlideDirection('right');
          setSelectedEvent(event);
          map.setView([lat, lng], map.getZoom(), { animate: false });
        },
      );
      return;
    }

    eventMarkersRef.current.forEach((marker) => markersGroup.removeLayer(marker));
    eventMarkersRef.current.clear();

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
        map.setView([lat, lng], map.getZoom(), { animate: false });
      },
    );
  }, [blipPositions, eventBlipPositions, showingEvents, mapReady]);

  // Highlight selected pin without rebuilding every marker.
  useEffect(() => {
    if (showingEvents) {
      eventMarkersRef.current.forEach((marker, eventId) => {
        marker.setIcon(createEventBlipIcon(selectedEvent?.id === eventId));
      });
      return;
    }

    itemMarkersRef.current.forEach((marker, itemId) => {
      const blip = blipPositions.find((entry) => entry.item.id === itemId);
      if (!blip) return;
      marker.setIcon(createItemBlipIcon(blip.item, blip.color, selectedPost?.id === itemId));
    });
  }, [selectedPost?.id, selectedEvent?.id, showingEvents, blipPositions, eventBlipPositions]);

  const routeDestination = useMemo(() => {
    if (!selectedPost) return null;
    const selectedBlip = blipPositions.find((b) => b.item.id === selectedPost.id);
    if (!selectedBlip) return null;
    return { lat: selectedBlip.lat, lng: selectedBlip.lng } as LatLng;
  }, [selectedPost?.id, blipPositions]);

  const hasGpsFix = userLocation != null;

  const routeEndpoints = useMemo(() => {
    if (!routeDestination) return null;
    const start = userLocationRef.current ?? userLocation;
    if (!start) return null;
    return { start, end: routeDestination };
  }, [routeDestination, hasGpsFix]);

  useEffect(() => {
    setNavigationOpen(false);
    setNavigateNotifyOpen(false);
  }, [selectedPost?.id]);

  const openNavigation = useCallback(() => {
    setNavigationOpen(true);
  }, []);

  const handleNavigateRequest = useCallback(() => {
    if (!selectedPost) return;
    if (selectedPost.userId === userProfile.uid) {
      openNavigation();
      return;
    }
    setNavigateNotifyOpen(true);
  }, [selectedPost, userProfile.uid, openNavigation]);

  const handleOpenExternalMaps = useCallback(() => {
    if (!routeEndpoints) return;
    openDrivingDirections(routeEndpoints.end, routeEndpoints.start);
  }, [routeEndpoints]);

  const handleNavigateSkipNotify = useCallback(() => {
    setNavigateNotifyOpen(false);
    openNavigation();
  }, [openNavigation]);

  const handleNavigateNotifyPoster = useCallback(async () => {
    if (!selectedPost || routeDistanceMeters == null || routeDurationSeconds == null) {
      setNavigateNotifyOpen(false);
      openNavigation();
      return;
    }

    setNotifyingPoster(true);
    try {
      await notifyPosterEnRoute({
        item: selectedPost,
        travelerUserId: userProfile.uid,
        travelerName: userProfile.displayName,
        distanceMeters: routeDistanceMeters,
        durationSeconds: routeDurationSeconds,
      });
    } finally {
      setNotifyingPoster(false);
      setNavigateNotifyOpen(false);
      openNavigation();
    }
  }, [
    selectedPost,
    routeDistanceMeters,
    routeDurationSeconds,
    userProfile.uid,
    userProfile.displayName,
    openNavigation,
  ]);

  const navigationOverlay =
    navigationOpen && routeDestination && selectedPost && (userLocationRef.current ?? userLocation)
      ? createPortal(
          <MapNavigationView
            origin={(userLocationRef.current ?? userLocation)!}
            destination={routeDestination}
            destinationLabel={selectedPost.title}
            onExit={() => setNavigationOpen(false)}
          />,
          document.body,
        )
      : null;

  const navigateNotifyDialog =
    selectedPost && selectedPost.userId !== userProfile.uid ? (
      <NavigateNotifyDialog
        open={navigateNotifyOpen}
        posterName={selectedPost.userDisplayName}
        itemTitle={selectedPost.title}
        distanceMeters={routeDistanceMeters}
        durationSeconds={routeDurationSeconds}
        notifying={notifyingPoster}
        onNotify={() => void handleNavigateNotifyPoster()}
        onSkip={handleNavigateSkipNotify}
      />
    ) : null;

  useEffect(() => {
    if (!selectedPost || showingEvents || !routeDestination) {
      routeEndpointsRef.current = null;
      routeFitForPostIdRef.current = null;
      setRouteCoords(null);
      setRouteDistanceMeters(null);
      setRouteDurationSeconds(null);
      setRouteLoading(false);
      routeLayerRef.current?.clearLayers();
      return;
    }

    const start = userLocationRef.current ?? userLocation;
    if (!start) return;

    routeEndpointsRef.current = { start, end: routeDestination };

    const fetchId = ++routeFetchIdRef.current;
    routeFitForPostIdRef.current = null;
    setRouteCoords(null);
    setRouteDistanceMeters(null);
    setRouteDurationSeconds(null);
    setRouteLoading(true);

    fetchDrivingRoute(start, routeDestination).then((result) => {
      if (fetchId !== routeFetchIdRef.current) return;

      setRouteCoords(result.onRoads && isRoadGeometry(result.coords) ? result.coords : null);
      setRouteDistanceMeters(result.distanceMeters);
      setRouteDurationSeconds(result.durationSeconds);
      setRouteLoading(false);
    });
  }, [selectedPost?.id, routeDestination, showingEvents, hasGpsFix]);

  // Route layer — separate from blips so marker refreshes don't wipe the line.
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    const endpoints = routeEndpointsRef.current;
    if (!selectedPost || !endpoints || !routeCoords || routeCoords.length < 2) return;

    L.polyline(routeCoords, {
      color: '#FF4500',
      weight: 8,
      opacity: 0.28,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    L.polyline(routeCoords, {
      color: '#FF4500',
      weight: 4,
      opacity: 0.92,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(routeLayer);

    if (routeFitForPostIdRef.current !== selectedPost.id) {
      routeFitForPostIdRef.current = selectedPost.id;
      const bottomPad = isFullScreenMobile ? 220 : 60;
      map.fitBounds(routeCoords, {
        paddingTopLeft: [60, 60],
        paddingBottomRight: [bottomPad, 60],
        maxZoom: 14,
        animate: false,
      });
    }
  }, [selectedPost, routeCoords, isFullScreenMobile]);

  // Handle programmatically panning/zooming to a selected neighborhood
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (sNeigh && sNeigh !== 'All Neighborhoods') {
      const parentCoord = NEIGHBORHOOD_COORDS[sNeigh];
      if (parentCoord) {
        const { lat, lng } = convertPercentToLatLng(parentCoord.x, parentCoord.y);
        map.setView([lat, lng], 13, { animate: false });
      }
    }
  }, [sNeigh]);

  // Route bounds fit inside the markers rendering effect when routeCoords load.

  // Immersive mobile layout implementation
  if (isFullScreenMobile) {
    return (
      <div id="sacramento_interactive_map_view" className="relative w-full h-full overflow-hidden font-sans">
        {navigationOverlay}
        {navigateNotifyDialog}
        {/* Immersive Leaflet Container */}
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0 w-full h-full z-0" 
          id="leaflet_map_immersive_mobile"
        />

        {/* Mobile map controls — zoom top-left; center bottom-left; new post bottom-right */}
        <div className="absolute top-14 left-3 z-20 pointer-events-auto" id="mobile_map_zoom_controls">
          <div className="flex flex-col bg-surface border border-app p-0.5 rounded-xl shadow-app w-11">
            <button
              onClick={handleZoomIn}
              className="w-11 h-11 flex items-center justify-center text-app bg-surface hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-t-lg"
              title="Zoom in"
              id="mobile_zoom_in_btn"
            >
              <Plus className="w-5 h-5" />
            </button>
            <div className="h-px bg-app mx-1" />
            <button
              onClick={handleZoomOut}
              className="w-11 h-11 flex items-center justify-center text-app bg-surface hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-b-lg"
              title="Zoom out"
              id="mobile_zoom_out_btn"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleLocateUser}
          className={`absolute bottom-4 left-4 z-20 w-11 h-11 rounded-full shadow-app flex items-center justify-center transition-all active:scale-95 cursor-pointer border pointer-events-auto ${
            isLocating
              ? 'bg-accent text-on-accent border-accent'
              : followUser
                ? 'bg-accent text-on-accent border-accent'
                : 'bg-surface text-app hover:bg-surface-hover border-app'
          }`}
          id="mobile_floating_locator_btn"
          title={followUser ? 'Following your location (tap to recenter)' : 'Center on my location'}
        >
          <Compass className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>

        {onOpenNewPost && (
          <button
            type="button"
            onClick={onOpenNewPost}
            className="sbn-fab absolute bottom-4 right-4 z-20 pointer-events-auto"
            aria-label="New post"
            id="mobile_map_new_post_btn"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* Location error toast */}
        {locationError && (
          <div className="absolute top-20 left-4 right-4 z-[35] sbn-card p-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-app">⚠️ {locationError}</span>
            <button
              onClick={() => setLocationError(null)}
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
                    onClick={() => setShowColorGuide(false)}
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
        <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
          <AnimatePresence>
            {selectedEvent && currentEventIndex >= 0 && (
              <MapSelectedEventCard
                event={selectedEvent}
                currentIndex={currentEventIndex}
                total={activeEvents.length}
                slideDirection={slideDirection}
                compact
                onClose={() => setSelectedEvent(null)}
                onPrev={handlePrevEvent}
                onNext={handleNextEvent}
                onViewEvent={onViewEvent}
              />
            )}
            {selectedPost && (
              <motion.div
                key={selectedPost.id}
                initial={{ opacity: 0, x: slideDirection === 'right' ? 70 : -70 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === 'right' ? -70 : 70 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                id="mobile_map_detail_floating_card"
                className="pointer-events-auto sbn-card p-4 shadow-2xl w-full"
              >
                {/* Sliding Pagination Controls */}
                <div className="absolute top-3 right-12 flex items-center space-x-1 pointer-events-auto bg-inset border border-app px-2 py-1 rounded-lg">
                  <button
                    onClick={handlePrevPost}
                    disabled={activeItems.length <= 1}
                    className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[9px] font-bold font-mono text-muted min-w-[24px] text-center">
                    {currentIndex + 1}/{activeItems.length}
                  </span>
                  <button
                    onClick={handleNextPost}
                    disabled={activeItems.length <= 1}
                    className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-3 right-3 text-muted hover:text-app transition-colors cursor-pointer bg-inset border border-app p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex gap-3 mt-2">
                  {(() => {
                    const photos = selectedPost.imageUrls?.length
                      ? selectedPost.imageUrls
                      : extractListingImageUrls(selectedPost);
                    const thumb = photos[0];
                    return thumb ? (
                    <div className="relative w-16 h-16 rounded-xl border border-app shrink-0 overflow-hidden">
                      <ListingImage
                        src={thumb}
                        alt={selectedPost.title}
                        width={160}
                        className="w-full h-full object-cover"
                      />
                      {photos.length > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold bg-black/75 text-white px-1 rounded">
                          +{photos.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-inset border border-app rounded-xl shrink-0 flex flex-col items-center justify-center">
                      <Tag className="w-4 h-4 text-muted" />
                    </div>
                  );
                  })()}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[7.5px] font-bold tracking-wider ${
                          selectedPost.type === 'giveaway'
                            ? 'bg-accent text-on-accent'
                            : selectedPost.type === 'trade'
                              ? 'bg-zinc-500 text-white'
                              : 'bg-inset border border-app text-muted'
                        }`}>
                          {getPostTypeMapLabel(selectedPost.type)}
                        </span>
                        <span className="text-[8px] font-bold font-mono uppercase tracking-wider" style={{ color: getCategoryColor(selectedPost.category) }}>
                          {selectedPost.category}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-app mt-1 truncate">
                        {selectedPost.title}
                      </h4>

                      <p className="text-[9.5px] text-muted mt-0.5 line-clamp-1 break-words">
                        {stripListingMetadata(selectedPost.description)}
                      </p>

                      <MapSelectionRouteRow
                        selectedPost={selectedPost}
                        routeEndpoints={routeEndpoints}
                        routeLoading={routeLoading}
                        distanceMeters={routeDistanceMeters}
                        durationSeconds={routeDurationSeconds}
                        routeOnMap={isRoadGeometry(routeCoords)}
                        hasLiveGps={!!userLocation}
                        viewerUserId={userProfile.uid}
                        canNavigate={hasGpsFix && !!routeDestination}
                        onStartNavigation={handleNavigateRequest}
                        onOpenExternalMaps={handleOpenExternalMaps}
                      />
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-app gap-2">
                      <div className="flex items-center space-x-1 text-[9px] font-medium text-muted min-w-0">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{selectedPost.neighborhood}</span>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        {openItemDetail && (
                          <button
                            type="button"
                            onClick={() => openItemDetail(selectedPost)}
                            className="sbn-btn sbn-btn-secondary sbn-btn-sm"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        )}
                        {selectedPost.userId === userProfile.uid ? (
                          onEditItem && (
                            <button
                              type="button"
                              onClick={() => onEditItem(selectedPost)}
                              className="sbn-btn sbn-btn-primary sbn-btn-sm"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>
                          )
                        ) : (
                          <>
                            {onClaimSubmitted && selectedPost.type === 'giveaway' && (
                              <ClaimAtPickupButton
                                item={selectedPost}
                                user={userProfile}
                                userLat={userLocation?.lat ?? null}
                                userLng={userLocation?.lng ?? null}
                                onClaimSubmitted={onClaimSubmitted}
                                compact
                              />
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                onInitiateChat(
                                  selectedPost.userId,
                                  selectedPost.userDisplayName,
                                  selectedPost.userPhotoURL,
                                  selectedPost,
                                )
                              }
                              className="sbn-btn sbn-btn-primary sbn-btn-sm"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
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
      {navigateNotifyDialog}
      {selectedType === undefined && (
        <div className="flex flex-col space-y-1 pb-2 border-b border-app">
          <span className="text-[9px] font-black text-accent uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF4500] animate-ping"></span>
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
            <span className="inline-block w-2.5 h-2.5 bg-[#FF4500] animate-pulse rounded-full"></span>
            Sacramento Activity Map
          </h3>
          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5" id="active_pins_count_display">
            Sacramento Neighborhoods • {activeItems.length} active listings
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
            <span className="w-2.5 h-2.5 rounded-full border-2 border-zinc-950 bg-[#FF4500] block shrink-0"></span>
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
              onClick={handleZoomIn}
              className="w-8.5 h-8.5 flex items-center justify-center text-app hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-t-lg"
              title="Zoom In"
              id="custom_zoom_in_btn"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-[1px] bg-app/20 mx-1" />
            <button
              onClick={handleZoomOut}
              className="w-8.5 h-8.5 flex items-center justify-center text-app hover:bg-surface-hover hover:text-accent transition-colors cursor-pointer rounded-b-lg"
              title="Zoom Out"
              id="custom_zoom_out_btn"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Center to User (Locate Me) control at the bottom under the +- */}
          <button
            onClick={handleLocateUser}
            className={`w-8.5 h-8.5 flex items-center justify-center rounded-xl shadow-md border transition-all active:scale-95 cursor-pointer ${
              isLocating
                ? 'bg-accent text-on-accent border-accent'
                : followUser
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-surface/95 border-app text-app hover:bg-surface-hover hover:text-accent'
            }`}
            title={followUser ? 'Following your location (tap to recenter)' : 'Follow my location'}
            id="custom_locate_user_btn"
          >
            <Compass className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Category Color Guide Drawer Overlay */}
        <AnimatePresence>
          {showColorGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000]/80 backdrop-blur-xs z-40 flex flex-col p-4 overflow-hidden font-sans"
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
                    onClick={() => setShowColorGuide(false)}
                    className="p-1 px-2 text-muted hover:text-app cursor-pointer bg-inset rounded-lg border border-app"
                    id="close_color_guide_btn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-zinc-650">
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
                    className="mt-3 w-full bg-accent text-on-accent py-2 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-[#E03D00] transition-colors cursor-pointer shrink-0"
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
        {((showingEvents && activeEvents.length === 0) || (!showingEvents && activeItems.length === 0)) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-[#FF4500]/30 p-3.5 shadow-2xl rounded-2xl z-20 w-[90%] max-w-sm text-center animate-pulse-short">
            <div className="flex items-start space-x-3 text-left">
              <div className="p-2 bg-[#FF4500]/10 text-accent rounded-xl shrink-0 mt-0.5">
                {showingEvents ? <CalendarDays className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-app uppercase tracking-widest">
                  {showingEvents ? 'No Events On Map' : 'Quiet Neighborhood Sector'}
                </h4>
                <p className="text-[10px] text-muted font-semibold leading-relaxed">
                  {showingEvents
                    ? 'No upcoming community events match your filters. Check the Events tab or post a free neighborhood gathering!'
                    : 'No active listings or ISO request pins match your selected filters. Create a new post or modify your filtering to light up the map!'}
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
          />
        )}
        {selectedPost && (
          <motion.div
            key={selectedPost.id}
            initial={{ opacity: 0, x: slideDirection === 'right' ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection === 'right' ? -80 : 80 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            id="map_item_detail_card"
            className="border border-app bg-surface p-4 relative font-sans text-app rounded-2xl shadow-xl"
          >
            {/* Sliding Pagination Controls */}
            <div className="absolute top-2.5 right-12 flex items-center space-x-1.5 pointer-events-auto bg-inset border border-app px-2 py-0.5 rounded-lg animate-fade-in">
              <button
                onClick={handlePrevPost}
                disabled={activeItems.length <= 1}
                className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
                title="Slide Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-bold font-mono text-muted min-w-[28px] text-center">
                {currentIndex + 1}/{activeItems.length}
              </span>
              <button
                onClick={handleNextPost}
                disabled={activeItems.length <= 1}
                className="text-muted hover:text-app disabled:opacity-30 cursor-pointer p-0.5 inline-flex items-center"
                title="Slide Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Close buttons */}
            <button
              id="close_map_card_btn"
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 text-muted hover:text-app transition-colors cursor-pointer bg-inset border border-app p-1 rounded-lg"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4 text-left">
              {/* Cargo Image preview */}
              {(() => {
                const photos = selectedPost.imageUrls?.length
                  ? selectedPost.imageUrls
                  : extractListingImageUrls(selectedPost);
                const thumb = photos[0];
                return thumb ? (
                <div className="relative w-18 h-18 sm:w-24 sm:h-24 border border-app shrink-0 bg-app rounded-xl overflow-hidden">
                  <ListingImage
                    src={thumb}
                    alt={selectedPost.title}
                    width={240}
                    className="w-full h-full object-cover rounded-none"
                  />
                  {photos.length > 1 && (
                    <span className="absolute bottom-1 right-1 text-[7px] font-bold bg-black/75 text-white px-1 rounded">
                      +{photos.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-18 h-18 sm:w-24 sm:h-24 bg-app border border-app shrink-0 flex flex-col items-center justify-center text-center rounded-xl">
                  <Tag className="w-5 h-5 text-subtle" />
                  <span className="text-[6.5px] text-subtle font-bold tracking-widest mt-1 block">NO IMAGE</span>
                </div>
              );
              })()}

              <div className="flex-1 min-w-0 flex flex-col justify-between font-sans">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[7.5px] font-bold tracking-wider ${
                      selectedPost.type === 'giveaway'
                        ? 'bg-accent text-on-accent font-mono'
                        : selectedPost.type === 'trade'
                          ? 'bg-zinc-500 text-white font-mono'
                          : 'bg-inset border border-app text-muted font-mono'
                    }`}>
                      {getPostTypeMapDetailLabel(selectedPost.type)}
                    </span>
                    <span className="text-[8.5px] font-black font-mono uppercase tracking-wider" style={{ color: getCategoryColor(selectedPost.category) }}>
                      {selectedPost.category}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-app font-display mt-2 truncate">
                    {selectedPost.title}
                  </h4>

                  <p className="text-[10.5px] text-muted mt-1 line-clamp-2 leading-tight break-words font-medium">
                    {stripListingMetadata(selectedPost.description)}
                  </p>

                  <MapSelectionRouteRow
                    selectedPost={selectedPost}
                    routeEndpoints={routeEndpoints}
                    routeLoading={routeLoading}
                    distanceMeters={routeDistanceMeters}
                    durationSeconds={routeDurationSeconds}
                    routeOnMap={isRoadGeometry(routeCoords)}
                    hasLiveGps={!!userLocation}
                    viewerUserId={userProfile.uid}
                    canNavigate={hasGpsFix && !!routeDestination}
                    onStartNavigation={handleNavigateRequest}
                    onOpenExternalMaps={handleOpenExternalMaps}
                  />
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-app flex-wrap gap-2.5">
                  <div className="flex items-center space-x-1 text-[10px] font-bold text-app uppercase">
                    <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>{selectedPost.neighborhood}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {openItemDetail && (
                      <button
                        id="map_view_card_btn"
                        type="button"
                        onClick={() => openItemDetail(selectedPost)}
                        className="px-3 py-1.5 bg-inset hover:bg-surface-hover text-app text-[9.5px] font-bold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none border border-app"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}
                    {selectedPost.userId === userProfile.uid ? (
                      onEditItem && (
                        <button
                          id="map_edit_card_btn"
                          type="button"
                          onClick={() => onEditItem(selectedPost)}
                          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-on-accent text-[9.5px] font-bold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none border border-transparent"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )
                    ) : (
                      <>
                        {onClaimSubmitted && selectedPost.type === 'giveaway' && (
                          <ClaimAtPickupButton
                            item={selectedPost}
                            user={userProfile}
                            userLat={userLocation?.lat ?? null}
                            userLng={userLocation?.lng ?? null}
                            onClaimSubmitted={onClaimSubmitted}
                            compact
                          />
                        )}
                        <button
                          id="map_message_btn"
                          onClick={() =>
                            onInitiateChat(
                              selectedPost.userId,
                              selectedPost.userDisplayName,
                              selectedPost.userPhotoURL,
                              selectedPost,
                            )
                          }
                          className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-on-accent text-[9.5px] font-bold rounded-xl inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none border border-transparent"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Message</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
