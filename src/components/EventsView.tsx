import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  LayoutGrid,
  LayoutList,
  MapPin,
  Plus,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CommunityEvent, SACRAMENTO_NEIGHBORHOODS, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { isEventPast, isEventUpcoming, resolveEventStatus } from '../lib/eventRsvp';
import { supportsInAppNavigation } from '../lib/goGetCoordinationGating';
import { buildSeriesUpcomingCountMap, collapseEventSeriesForDisplay } from '../lib/eventSeries';
import { EVENTS } from '../siteContent';
import CollapsibleFilterSection from './CollapsibleFilterSection';
import FilterLabeledSwitch from './FilterLabeledSwitch';
import { EventGridSkeleton } from './Skeleton';
import EventCard from './EventCard';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { haversineMeters, type LatLng } from '../lib/mapRoute';
import {
  readEventsViewMode,
  writeEventsViewMode,
  type FeedViewMode,
} from '../lib/feedDisplayPrefs';
import { persistUserAppPreferences } from '../lib/appPreferences';

interface EventsViewProps {
  events: CommunityEvent[];
  userProfile: UserProfile;
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onNavigateEvent?: (event: CommunityEvent) => void;
  onStaffEventChat?: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  commentsLocked?: boolean;
  sneakPeek?: boolean;
  onOpenNewEvent?: () => void;
}

type EventTimeFilter = 'upcoming' | 'past';
type EventSortMode = 'soonest' | 'newest' | 'most_rsvps';
type EventQuickPick = 'my_area' | 'with_photos' | 'has_pin' | 'im_going' | 'has_rsvps' | 'series';

const SORT_OPTIONS: { value: EventSortMode; label: string }[] = [
  { value: 'soonest', label: 'Soonest' },
  { value: 'newest', label: 'Newest' },
  { value: 'most_rsvps', label: 'Popular' },
];

const EVENT_QUICK_PICKS: { id: EventQuickPick; label: string }[] = [
  { id: 'my_area', label: 'My area' },
  { id: 'with_photos', label: 'With photos' },
  { id: 'has_pin', label: 'Has map' },
  { id: 'im_going', label: "I'm going" },
  { id: 'has_rsvps', label: 'Has RSVPs' },
  { id: 'series', label: 'Series' },
];

function eventCreatedMs(event: CommunityEvent): number {
  const { createdAt } = event;
  if (!createdAt) return 0;
  if (typeof createdAt === 'object' && createdAt !== null && 'seconds' in createdAt) {
    return (createdAt as { seconds: number }).seconds * 1000;
  }
  return new Date(createdAt).getTime();
}

function eventTimeToolbarLabel(filter: EventTimeFilter | null): string {
  if (!filter) return 'All';
  return filter === 'upcoming' ? 'Upcoming' : 'Past';
}

function FilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  hideLabel = false,
  children,
}: {
  id: string;
  label: string;
  icon: typeof MapPin;
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      {!hideLabel ? (
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
          <Icon className="w-3 h-3 shrink-0" aria-hidden />
          {label}
        </span>
      ) : null}
      <div className="flex items-center rounded-xl border border-app bg-inset px-3 py-2.5">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-app focus:outline-none cursor-pointer"
        >
          {children}
        </select>
      </div>
    </label>
  );
}

export default function EventsView({
  events,
  userProfile,
  engagement,
  onViewEvent,
  onNavigateEvent,
  onStaffEventChat,
  onViewProfile,
  onRefresh,
  isLoading = false,
  commentsLocked = false,
  sneakPeek = false,
  onOpenNewEvent,
}: EventsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter | null>(null);
  const [sortBy, setSortBy] = useState<EventSortMode | null>(null);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [activeQuickPicks, setActiveQuickPicks] = useState<Set<EventQuickPick>>(() => new Set());
  const [viewMode, setViewMode] = useState<FeedViewMode>(() => readEventsViewMode());
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);

  // Subscribe to live GPS so we can show distance badges on event cards.
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const locationMountedRef = useRef(false);
  useEffect(() => {
    locationMountedRef.current = true;
    const unsub = subscribeLiveGeolocation((pos) => {
      setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    return () => {
      locationMountedRef.current = false;
      unsub();
    };
  }, []);

  const getEventDistance = (event: CommunityEvent): number | null => {
    if (!userLocation || event.locationLat == null || event.locationLng == null) return null;
    return haversineMeters(userLocation, { lat: event.locationLat, lng: event.locationLng });
  };

  const eventHasMapPin = (event: CommunityEvent): boolean =>
    typeof event.locationLat === 'number' &&
    typeof event.locationLng === 'number' &&
    Number.isFinite(event.locationLat) &&
    Number.isFinite(event.locationLng);

  const canNavigateToEvent = (event: CommunityEvent): boolean => {
    if (!supportsInAppNavigation()) return false;
    if (event.userId === userProfile.uid) return false;
    if (resolveEventStatus(event) === 'cancelled' || isEventPast(event)) return false;
    return eventHasMapPin(event);
  };

  const handleViewModeChange = (mode: FeedViewMode) => {
    setViewMode(mode);
    writeEventsViewMode(mode);
    void persistUserAppPreferences(userProfile, { eventsViewMode: mode });
  };

  /** Filters panel only — toolbar when/sort toggles have their own active styling. */
  const panelFilterCount = [
    searchTerm.trim() !== '',
    sortBy !== null,
    selectedNeighborhood !== 'All Neighborhoods',
    activeQuickPicks.size > 0,
  ].filter(Boolean).length;

  const hasExtraFilters = panelFilterCount > 0 || timeFilter !== null;

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy(null);
    setSelectedNeighborhood('All Neighborhoods');
    setActiveQuickPicks(new Set());
  };

  const handleSortSwitch = (value: EventSortMode) => (checked: boolean) => {
    if (checked) {
      setSortBy(value);
      return;
    }
    if (sortBy === value) setSortBy(null);
  };

  const handleQuickPickSwitch = (pick: EventQuickPick) => (checked: boolean) => {
    setActiveQuickPicks((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pick);
      else next.delete(pick);
      return next;
    });
  };

  const cycleTimeFilter = () => {
    setTimeFilter((current) => {
      if (current === null) return 'upcoming';
      if (current === 'upcoming') return 'past';
      return null;
    });
  };

  const seriesUpcomingCounts = useMemo(() => buildSeriesUpcomingCountMap(events), [events]);

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const searchString = `${event.title} ${event.description} ${event.location} ${event.neighborhood}`.toLowerCase();
      if (!searchString.includes(searchTerm.toLowerCase())) return false;

      const upcoming = isEventUpcoming(event);
      if (timeFilter === 'upcoming' && !upcoming) return false;
      if (timeFilter === 'past' && upcoming) return false;

      if (selectedNeighborhood !== 'All Neighborhoods' && event.neighborhood !== selectedNeighborhood) {
        return false;
      }

      if (activeQuickPicks.has('my_area') && event.neighborhood !== userProfile.neighborhood) {
        return false;
      }
      if (activeQuickPicks.has('with_photos') && !event.imageUrl) return false;
      if (activeQuickPicks.has('has_pin') && (event.locationLat == null || event.locationLng == null)) {
        return false;
      }
      if (activeQuickPicks.has('series') && !event.seriesId) return false;

      const rsvp = engagement.getRsvpsForEvent(event.id);
      if (activeQuickPicks.has('im_going') && rsvp.userRsvp !== 'going') return false;
      if (activeQuickPicks.has('has_rsvps') && rsvp.going + rsvp.maybe === 0) return false;

      return true;
    });

    const rsvpTotal = (eventId: string) => {
      const rsvp = engagement.getRsvpsForEvent(eventId);
      return rsvp.going + rsvp.maybe + rsvp.gone + rsvp.missed;
    };

    const sorted = [...filtered].sort((a, b) => {
      if (viewMode === 'grid') {
        return eventCreatedMs(b) - eventCreatedMs(a);
      }

      if (sortBy === 'newest') {
        return eventCreatedMs(b) - eventCreatedMs(a);
      }
      if (sortBy === 'most_rsvps') {
        return rsvpTotal(b.id) - rsvpTotal(a.id);
      }
      const aUpcoming = isEventUpcoming(a);
      const bUpcoming = isEventUpcoming(b);
      const aTime = new Date(a.eventStartAt).getTime();
      const bTime = new Date(b.eventStartAt).getTime();
      if (aUpcoming && bUpcoming) return aTime - bTime;
      if (!aUpcoming && !bUpcoming) return bTime - aTime;
      return aUpcoming ? -1 : 1;
    });

    return collapseEventSeriesForDisplay(sorted);
  }, [
    events,
    searchTerm,
    timeFilter,
    selectedNeighborhood,
    activeQuickPicks,
    userProfile.neighborhood,
    sortBy,
    viewMode,
    userLocation,
    engagement,
  ]);

  if (isLoading && events.length === 0) {
    return <EventGridSkeleton />;
  }

  return (
    <div className="space-y-3" id="events_feed_wrapper">
      <div className="space-y-1 min-w-0" id="events_view_mode_bar">
        <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
          <div className="shrink-0">
            {onOpenNewEvent ? (
              <button
                type="button"
                id="events_new_listing_btn"
                onClick={onOpenNewEvent}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-accent bg-accent px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-on-accent hover:bg-accent-hover transition-colors cursor-pointer whitespace-nowrap"
                aria-label="New event"
                title="New event"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>New</span>
              </button>
            ) : null}
          </div>

          <div className="flex-1 min-w-0 flex justify-center px-0.5 overflow-x-auto sbn-feed-toolbar-scroll">
            <div className="inline-flex items-center gap-1 sm:gap-1.5 min-w-0">
              <button
                type="button"
                id="events_time_toggle"
                onClick={cycleTimeFilter}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-w-0 shrink-0 ${
                  timeFilter !== null
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-app bg-inset text-app hover:border-accent/40'
                }`}
                aria-pressed={timeFilter !== null}
                aria-label={`When: ${eventTimeToolbarLabel(timeFilter)}`}
              >
                <span>{eventTimeToolbarLabel(timeFilter)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              id="events_filters_panel_toggle"
              onClick={() => setFiltersPanelOpen((open) => !open)}
              aria-expanded={filtersPanelOpen}
              aria-label="Filters"
              className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                filtersPanelOpen
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-app bg-inset text-muted hover:text-app hover:border-accent/40'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="hidden md:inline">Filters</span>
              {panelFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-accent text-on-accent px-1.5 py-0.5 rounded-full min-w-[1.125rem] text-center leading-none">
                  {panelFilterCount}
                </span>
              )}
            </button>
            <div
              className="inline-flex rounded-xl border border-app bg-inset p-0.5 shrink-0"
              role="group"
              aria-label="Events view"
              id="events_view_mode_toggle"
            >
              <button
                type="button"
                id="events_view_grid_btn"
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
                onClick={() => handleViewModeChange('grid')}
                className={`inline-flex items-center justify-center rounded-[0.65rem] p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-app hover:bg-surface-hover'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" aria-hidden />
                <span className="sr-only">Grid</span>
              </button>
              <button
                type="button"
                id="events_view_list_btn"
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
                onClick={() => handleViewModeChange('list')}
                className={`inline-flex items-center justify-center rounded-[0.65rem] p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-accent text-on-accent'
                    : 'text-muted hover:text-app hover:bg-surface-hover'
                }`}
              >
                <LayoutList className="w-4 h-4 shrink-0" aria-hidden />
                <span className="sr-only">List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtersPanelOpen && (
      <div className="sbn-card p-4 sm:p-5 space-y-4" id="events_filter_panel">
        {commentsLocked && events.length > 0 && (
          <p className="text-xs text-muted leading-relaxed border-l-2 border-l-accent pl-3">
            {EVENTS.staffPreviewNote}
          </p>
        )}

        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input
            type="text"
            id="events_search_input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events…"
            className="sbn-input w-full"
          />
        </div>

        <div className="space-y-3" id="events_filter_switches">
          <CollapsibleFilterSection
            id="events_sort_bar"
            title="Sort events"
            activeCount={sortBy !== null ? 1 : 0}
            defaultOpen={sortBy !== null}
          >
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map(({ value, label }) => (
                <span key={value} className="contents">
                  <FilterLabeledSwitch
                    id={`events_sort_${value}`}
                    label={label}
                    checked={sortBy === value}
                    onChange={handleSortSwitch(value)}
                  />
                </span>
              ))}
            </div>
          </CollapsibleFilterSection>

          <CollapsibleFilterSection
            id="events_quick_picks"
            title="Quick picks"
            activeCount={activeQuickPicks.size}
            defaultOpen={activeQuickPicks.size > 0}
          >
            <div className="flex flex-wrap gap-2">
              {EVENT_QUICK_PICKS.map(({ id, label }) => (
                <span key={id} className="contents">
                  <FilterLabeledSwitch
                    id={`events_quick_pick_${id}`}
                    label={label}
                    checked={activeQuickPicks.has(id)}
                    onChange={handleQuickPickSwitch(id)}
                  />
                </span>
              ))}
            </div>
          </CollapsibleFilterSection>
        </div>

        <div className="pt-3 border-t border-app">
          <CollapsibleFilterSection
            id="events_neighborhood_section"
            title="Neighborhood"
            icon={MapPin}
            activeCount={selectedNeighborhood !== 'All Neighborhoods' ? 1 : 0}
            defaultOpen={selectedNeighborhood !== 'All Neighborhoods'}
          >
            <FilterSelect
              id="events_filter_neighborhood_select"
              label="Neighborhood"
              icon={MapPin}
              hideLabel
              value={selectedNeighborhood}
              onChange={setSelectedNeighborhood}
            >
              <option value="All Neighborhoods">All neighborhoods</option>
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </FilterSelect>
          </CollapsibleFilterSection>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-app">
          <p className="text-xs text-muted">
            <span className="font-semibold text-app">{filteredEvents.length}</span> event
            {filteredEvents.length === 1 ? '' : 's'}
            {hasExtraFilters ? ' match your filters' : ''}
          </p>
          {hasExtraFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="sbn-chip text-xs flex items-center gap-1"
              id="events_clear_filters_btn"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>
      )}

      {filteredEvents.length === 0 ? (
        <div className="sbn-card text-center py-16 px-8 border-dashed" id="empty_events_state">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-app">
            {events.length === 0 ? 'No events yet' : 'No events found'}
          </h3>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
            {events.length === 0
              ? sneakPeek
                ? 'Events unlock when we reach 500 neighbors. Here is a preview of what is coming:'
                : 'Be the first to post a free neighborhood gathering — potlucks, swaps, park meetups, and more.'
              : 'Try different filters, or post a new event for your neighborhood.'}
          </p>
          {sneakPeek && events.length === 0 && (
            <ul className="mt-5 space-y-2 text-sm text-muted text-left max-w-sm mx-auto">
              {EVENTS.previewBullets.map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center text-xs">
                    ✓
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onRefresh} className="sbn-btn sbn-btn-secondary sbn-btn-sm mt-4">
            Refresh
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5'
              : 'flex flex-col gap-2 sm:gap-2.5'
          }
          id="events_grid_cards"
        >
          {filteredEvents.map((event) => (
            <div key={event.id}>
              <EventCard
                event={event}
                layout={viewMode}
                currentUserId={userProfile.uid}
                userProfile={userProfile}
                engagement={engagement}
                onViewEvent={onViewEvent}
                onViewProfile={onViewProfile}
                commentsLocked={commentsLocked}
                seriesUpcomingCount={
                  event.seriesId ? seriesUpcomingCounts.get(event.seriesId) : undefined
                }
                distanceMeters={getEventDistance(event)}
                onNavigate={
                  canNavigateToEvent(event)
                    ? () => (onNavigateEvent ?? onViewEvent)(event)
                    : undefined
                }
                onStaffChat={
                  onStaffEventChat && isStaffActingOfficial(userProfile)
                    ? () => onStaffEventChat(event)
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
