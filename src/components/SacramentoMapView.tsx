import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, UserProfile, ITEM_CATEGORIES, ISO_CATEGORIES, extractGPSCoordinates, NEIGHBORHOOD_COORDS, convertPercentToLatLng } from '../types';
import {
  canViewerSeeExactLocation,
  hasStoredGps,
  stripListingMetadata,
} from '../lib/itemLocation';
import { extractListingImageUrls } from '../lib/listingContent';
import {
  estimateDrivingStats,
  fetchDrivingRoute,
  formatRouteDistance,
  formatRouteDuration,
  openDrivingDirections,
  type LatLng,
} from '../lib/mapRoute';
import { MapPin, MessageSquare, X, Tag, Eye, Compass, ChevronLeft, ChevronRight, Plus, Minus, Pencil, Navigation } from 'lucide-react';
import ClaimAtPickupButton from './ClaimAtPickupButton';
import ListingImage from './ListingImage';
import { motion, AnimatePresence } from 'motion/react';
import L from 'leaflet';

interface SacramentoMapViewProps {
  items: ItemPost[];
  userProfile: UserProfile;
  selectedType?: 'all' | 'giveaway' | 'looking';
  selectedCategory?: string;
  selectedNeighborhood?: string;
  searchTerm?: string;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem?: (item: ItemPost) => void;
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

interface MapSelectionRouteRowProps {
  selectedPost: ItemPost;
  routeEndpoints: { start: LatLng; end: LatLng } | null;
  routeLoading: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  hasLiveGps: boolean;
  viewerUserId: string;
}

function MapSelectionRouteRow({
  selectedPost,
  routeEndpoints,
  routeLoading,
  distanceMeters,
  durationSeconds,
  hasLiveGps,
  viewerUserId,
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
          <p className="text-[9px] font-medium text-muted animate-pulse">Calculating distance…</p>
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
          </>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() =>
          openDrivingDirections(routeEndpoints.end, hasLiveGps ? routeEndpoints.start : undefined)
        }
        className="sbn-btn sbn-btn-primary sbn-btn-sm shrink-0"
        title="Open turn-by-turn directions in Maps"
      >
        <Navigation className="w-3.5 h-3.5" />
        Navigate
      </button>
    </div>
  );
}

export default function SacramentoMapView({
  items,
  userProfile,
  selectedType,
  selectedCategory,
  selectedNeighborhood,
  searchTerm,
  onInitiateChat,
  onClaimSubmitted,
  onViewItem,
  onEditItem,
  onItemDetail,
  isFullScreenMobile = false,
  mapVisible = true,
  colorGuideOpen: colorGuideOpenProp,
  onColorGuideOpenChange,
  onOpenNewPost,
}: SacramentoMapViewProps) {
  const openItemDetail = onViewItem || onItemDetail;
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
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
  const [localType, setLocalType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [localCategory, setLocalCategory] = useState('All Categories');
  const [localNeighborhood, setLocalNeighborhood] = useState('All Neighborhoods');

  const sTerm = searchTerm !== undefined ? searchTerm : localSearch;
  const sType = selectedType !== undefined ? selectedType : localType;
  const sCat = selectedCategory !== undefined ? selectedCategory : localCategory;
  const sNeigh = selectedNeighborhood !== undefined ? selectedNeighborhood : localNeighborhood;

  // React Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const followUserRef = useRef(true);
  const selectedPostRef = useRef<ItemPost | null>(null);
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

  /** ~40 m — avoid refetching OSRM on every GPS tick. */
  const coordsMovedEnough = (
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    thresholdDeg = 0.00035,
  ) => Math.abs(a.lat - b.lat) > thresholdDeg || Math.abs(a.lng - b.lng) > thresholdDeg;

  // Default coordinate centered around the user's neighborhood
  const userNeighborhood = userProfile?.neighborhood || 'Midtown';
  const defaultCoord = NEIGHBORHOOD_COORDS[userNeighborhood] || { x: 53, y: 40 };
  const fallbackLatLng = useMemo(() => convertPercentToLatLng(defaultCoord.x, defaultCoord.y), [defaultCoord]);

  useEffect(() => {
    selectedPostRef.current = selectedPost;
  }, [selectedPost]);

  useEffect(() => {
    followUserRef.current = followUser;
  }, [followUser]);

  const createUserLocationIcon = () =>
    L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-10 w-10 rounded-full bg-blue-500/25 animate-ping"></span>
          <span class="absolute inline-flex h-6 w-6 rounded-full bg-blue-500/40"></span>
          <div class="h-4.5 w-4.5 rounded-full bg-blue-600 border-2.5 border-white shadow-xl flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      className: 'custom-user-avatar-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

  const applyLiveUserPosition = (latitude: number, longitude: number) => {
    setUserLocation({ lat: latitude, lng: longitude });
    setIsLocating(false);
    setLocationError(null);

    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
    } else {
      const userMarker = L.marker([latitude, longitude], {
        icon: createUserLocationIcon(),
        zIndexOffset: 500,
      })
        .addTo(map)
        .bindPopup(`
          <div class="p-1.5 font-sans">
            <b class="text-[10px] uppercase font-black text-blue-600 tracking-wide">Your Location</b>
            <p class="text-[10px] text-subtle mt-0.5 font-semibold">Live GPS — map follows you while moving</p>
          </div>
        `);
      userMarkerRef.current = userMarker;
    }

    if (!followUserRef.current || selectedPostRef.current) return;

    if (!hasInitialMapCenterRef.current) {
      map.setView([latitude, longitude], 14, { animate: false });
      hasInitialMapCenterRef.current = true;
      return;
    }

    map.panTo([latitude, longitude], { animate: true, duration: 0.35 });
  };

  const handleGeolocationError = (error: GeolocationPositionError) => {
    console.warn('Geolocation failed:', error);
    setIsLocating(false);
    if (error.code === error.PERMISSION_DENIED) {
      setLocationError('Location permission denied. Enable GPS in your browser to follow the map.');
    } else {
      setLocationError('Could not get GPS. Check permissions and try again.');
    }
  };

  const startLiveLocationWatch = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device.');
      setIsLocating(false);
      return;
    }
    if (geoWatchIdRef.current != null) return;

    setIsLocating(true);
    setLocationError(null);

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (position) => applyLiveUserPosition(position.coords.latitude, position.coords.longitude),
      handleGeolocationError,
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
  };

  const stopLiveLocationWatch = () => {
    if (geoWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
      geoWatchIdRef.current = null;
    }
  };

  /** Re-enable follow mode and center on the latest GPS fix. */
  const handleLocateUser = () => {
    setFollowUser(true);
    followUserRef.current = true;

    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], Math.max(mapRef.current.getZoom(), 14), {
        animate: true,
      });
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
  }, [items, sType, sCat, sNeigh, sTerm]);

  // Find current listing index in filtered list for pagination
  const currentIndex = useMemo(() => {
    if (!selectedPost) return -1;
    return activeItems.findIndex(item => item.id === selectedPost.id);
  }, [selectedPost, activeItems]);

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

  // Distribute points deterministically so multiple posts in the same neighbourhood don't stack directly
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

  // Map mounted lifecycle hook
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Build leaflet map focusing on user sector
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true
    }).setView([fallbackLatLng.lat, fallbackLatLng.lng], 12);

    // Apply soft, beautiful CartoDB Voyager tile layer with NO labels/city-icons to keep the focus solely on the user's listing blips
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>'
    }).addTo(map);

    // Dynamic Markers Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    const routeLayer = L.layerGroup().addTo(map);
    routeLayerRef.current = routeLayer;

    mapRef.current = map;
    setMapReady(true);

    const onUserPanMap = () => {
      setFollowUser(false);
      followUserRef.current = false;
    };
    map.on('dragstart', onUserPanMap);

    startLiveLocationWatch();

    // Trigger immediate and asynchronous container size invalidation to solve hidden tab layout bug
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    // Watch dynamic resize adjustments (tab changes, screen resizing, device orientation)
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.off('dragstart', onUserPanMap);
      stopLiveLocationWatch();
      hasInitialMapCenterRef.current = false;
      setMapReady(false);
      map.remove();
      mapRef.current = null;
      markersGroupRef.current = null;
      routeLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Recalculate size when mobile tab becomes visible again (display:none → block)
  useEffect(() => {
    const map = mapRef.current;
    if (!mapVisible || !map) return;

    const refresh = () => map.invalidateSize({ animate: false });
    refresh();
    const raf = requestAnimationFrame(refresh);
    const timer = setTimeout(refresh, 200);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [mapVisible]);

  // Resume map follow when a listing popup is closed and follow mode is on
  useEffect(() => {
    if (selectedPost || !followUser || !userLocation || !mapRef.current) return;
    mapRef.current.panTo([userLocation.lat, userLocation.lng], { animate: true });
  }, [selectedPost, followUser]);

  const routeEndpoints = useMemo(() => {
    if (!selectedPost) return null;
    const selectedBlip = blipPositions.find((b) => b.item.id === selectedPost.id);
    if (!selectedBlip) return null;
    return {
      start: userLocation || fallbackLatLng,
      end: { lat: selectedBlip.lat, lng: selectedBlip.lng },
    };
  }, [selectedPost, blipPositions, userLocation, fallbackLatLng]);

  useEffect(() => {
    if (!selectedPost) {
      routeEndpointsRef.current = null;
      routeFitForPostIdRef.current = null;
      setRouteCoords(null);
      setRouteDistanceMeters(null);
      setRouteDurationSeconds(null);
      setRouteLoading(false);
      routeLayerRef.current?.clearLayers();
      return;
    }

    if (!routeEndpoints) return;

    const prev = routeEndpointsRef.current;
    const destMoved = !prev || coordsMovedEnough(prev.end, routeEndpoints.end);
    const startMoved = !prev || coordsMovedEnough(prev.start, routeEndpoints.start);
    const selectionChanged = routeFitForPostIdRef.current !== selectedPost.id;

    if (!selectionChanged && !destMoved && !startMoved) return;

    routeEndpointsRef.current = routeEndpoints;

    const fetchId = ++routeFetchIdRef.current;
    if (selectionChanged) {
      routeFitForPostIdRef.current = null;
      setRouteCoords(null);
      setRouteDistanceMeters(null);
      setRouteDurationSeconds(null);
      setRouteLoading(true);
    }

    fetchDrivingRoute(routeEndpoints.start, routeEndpoints.end).then((result) => {
      if (fetchId !== routeFetchIdRef.current) return;

      const resolved = result ?? estimateDrivingStats(routeEndpoints.start, routeEndpoints.end);
      setRouteCoords(resolved.coords);
      setRouteDistanceMeters(resolved.distanceMeters);
      setRouteDurationSeconds(resolved.durationSeconds);
      setRouteLoading(false);
    });
  }, [selectedPost, routeEndpoints]);

  // Update all items points & neighborhood labels
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!mapReady || !map || !markersGroup) return;

    markersGroup.clearLayers();

    // 1. Draw Listing locations pins
    blipPositions.forEach(({ item, lat, lng, color }) => {
      const isSelected = selectedPost?.id === item.id;

      const blipIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span style="border-color: ${color}" class="absolute inline-flex h-6 w-6 rounded-full border opacity-50 block animate-pulse"></span>
            <div style="background-color: ${color}" class="h-3.5 w-3.5 rounded-full border-2 shadow-md ${
              item.type === 'giveaway' ? 'border-zinc-950' : 'border-white'
            } ${isSelected ? 'ring-2 ring-zinc-950 ring-offset-1 scale-125 z-50' : ''}">
              <div class="w-1 h-1 rounded-full bg-white opacity-80 mx-auto mt-[2.5px]"></div>
            </div>
          </div>
        `,
        className: 'custom-item-blip-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      // Marker mapping click handler
      L.marker([lat, lng], { icon: blipIcon })
        .addTo(markersGroup)
        .on('click', () => {
          setSlideDirection('right');
          setSelectedPost(item);
          map.setView([lat, lng], map.getZoom(), { animate: true });
        });
    });

  }, [blipPositions, selectedPost, activeItems, mapReady, mapVisible]);

  // Route layer — separate from blips so marker refreshes don't wipe the line.
  useEffect(() => {
    const map = mapRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !routeLayer) return;

    routeLayer.clearLayers();

    const endpoints = routeEndpointsRef.current;
    if (!selectedPost || !endpoints || !routeCoords || routeCoords.length < 2) return;

    const { start: startLatLng, end: selectedLatLng } = endpoints;

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

    const startIcon = L.divIcon({
      html: `
        <div class="h-3.5 w-3.5 bg-[#FF4500] rounded-full border-2.5 border-white shadow-md flex items-center justify-center">
          <div class="h-1 w-1 bg-white rounded-full"></div>
        </div>
      `,
      className: 'route-start-marker',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    L.marker([startLatLng.lat, startLatLng.lng], { icon: startIcon, zIndexOffset: 200 }).addTo(routeLayer);

    const destIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute inline-flex h-8 w-8 rounded-full bg-[#FF4500]/25 animate-ping"></span>
          <div class="h-4.5 w-4.5 bg-[#FF4500] rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      className: 'route-destination-pulsing-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    L.marker([selectedLatLng.lat, selectedLatLng.lng], { icon: destIcon, zIndexOffset: 201 }).addTo(routeLayer);

    if (routeFitForPostIdRef.current !== selectedPost.id) {
      routeFitForPostIdRef.current = selectedPost.id;
      map.fitBounds(routeCoords, { padding: [60, 60], maxZoom: 14, animate: true });
    }
  }, [selectedPost, routeCoords]);

  // Handle programmatically panning/zooming to a selected neighborhood
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (sNeigh && sNeigh !== 'All Neighborhoods') {
      const parentCoord = NEIGHBORHOOD_COORDS[sNeigh];
      if (parentCoord) {
        const { lat, lng } = convertPercentToLatLng(parentCoord.x, parentCoord.y);
        map.setView([lat, lng], 13, { animate: true });
      }
    }
  }, [sNeigh]);

  // Route bounds fit inside the markers rendering effect when routeCoords load.

  // Immersive mobile layout implementation
  if (isFullScreenMobile) {
    return (
      <div id="sacramento_interactive_map_view" className="relative w-full h-full overflow-hidden font-sans">
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
          <div className="absolute top-20 left-4 right-4 z-35 sbn-card p-3 flex items-center justify-between gap-3">
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

        {/* Selected Blip floating detours block panel */}
        <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-none">
          <AnimatePresence mode="popLayout">
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
                          selectedPost.type === 'giveaway' ? 'bg-accent text-on-accent' : 'bg-inset border border-app text-muted'
                        }`}>
                          {selectedPost.type === 'giveaway' ? '🎁 GIFT' : '🔍 ASK'}
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
                        hasLiveGps={!!userLocation}
                        viewerUserId={userProfile.uid}
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
                            {onClaimSubmitted && (
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
                type="button"
                onClick={() => setShowColorGuide(true)}
                className="px-3 py-1 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer transition-all rounded-lg text-muted hover:text-app border-l border-app ml-0.5 pl-2.5"
                id="map_internal_color_index_btn"
              >
                🎨 Index
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5" id="map_internal_dropdowns">
            {/* Category selection */}
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
                ) : localType === 'giveaway' ? (
                  ITEM_CATEGORIES.map((c) => (
                    <option key={`map_giv_only_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                  ))
                ) : (
                  ISO_CATEGORIES.map((c) => (
                    <option key={`map_iso_only_${c}`} value={c} className="bg-surface text-app">{c.toUpperCase()}</option>
                  ))
                )}
              </select>
            </div>

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
            <span className="w-2.5 h-2.5 rounded-full border border-app bg-[#FF4500] block shrink-0"></span>
            <span>GIVEAWAY LIST</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted">
            <span className="w-2.5 h-2.5 rounded-full border border-white bg-white block shrink-0"></span>
            <span>WANTED REQ (ISO)</span>
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
        {activeItems.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-md border border-[#FF4500]/30 p-3.5 shadow-2xl rounded-2xl z-20 w-[90%] max-w-sm text-center animate-pulse-short">
            <div className="flex items-start space-x-3 text-left">
              <div className="p-2 bg-[#FF4500]/10 text-accent rounded-xl shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-app uppercase tracking-widest">Quiet Neighborhood Sector</h4>
                <p className="text-[10px] text-muted font-semibold leading-relaxed">
                  No active listings or ISO request pins match your selected filters. Create a new post or modify your filtering to light up the map!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected Blip Mini Card Slide Panel */}
      <AnimatePresence mode="popLayout">
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
                      selectedPost.type === 'giveaway' ? 'bg-accent text-on-accent font-mono' : 'bg-inset border border-app text-muted font-mono'
                    }`}>
                      {selectedPost.type === 'giveaway' ? '🎁 GIFT OFFER' : '🔍 ASK'}
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
                    hasLiveGps={!!userLocation}
                    viewerUserId={userProfile.uid}
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
                        {onClaimSubmitted && (
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
