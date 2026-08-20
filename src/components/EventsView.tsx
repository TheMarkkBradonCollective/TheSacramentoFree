import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CommunityEvent, SACRAMENTO_NEIGHBORHOODS, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { isEventPast, isEventUpcoming, resolveEventStatus } from '../lib/eventRsvp';
import { buildSeriesUpcomingCountMap, collapseEventSeriesForDisplay } from '../lib/eventSeries';
import { EVENTS } from '../siteContent';
import FilterLabeledSwitch from './FilterLabeledSwitch';
import CollapsibleFilterSection from './CollapsibleFilterSection';
import EventCard from './EventCard';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { haversineMeters, type LatLng } from '../lib/mapRoute';

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
}

type EventTimeFilter = 'all' | 'upcoming' | 'past';
type EventSortMode = 'soonest' | 'newest' | 'most_rsvps';
type EventQuickPick = 'my_area' | 'with_photos' | 'has_pin' | 'im_going' | 'has_rsvps' | 'series';

const TIME_FILTER_OPTIONS: { value: EventTimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

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

function FilterSelect({
  id,
  label,
  icon: Icon,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  icon: typeof MapPin;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={id}>
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" aria-hidden />
        {label}
      </span>
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
}: EventsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>('all');
  const [sortBy, setSortBy] = useState<EventSortMode>('soonest');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [activeQuickPicks, setActiveQuickPicks] = useState<Set<EventQuickPick>>(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

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
    if (event.userId === userProfile.uid) return false;
    if (resolveEventStatus(event) === 'cancelled' || isEventPast(event)) return false;
    return eventHasMapPin(event);
  };

  const hasExtraFilters =
    timeFilter !== 'all' ||
    selectedNeighborhood !== 'All Neighborhoods' ||
    activeQuickPicks.size > 0 ||
    searchTerm.trim() !== '' ||
    sortBy !== 'soonest';

  const toggleFilterCount = [
    sortBy !== 'soonest',
    timeFilter !== 'all',
    activeQuickPicks.size > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setTimeFilter('all');
    setSortBy('soonest');
    setSelectedNeighborhood('All Neighborhoods');
    setActiveQuickPicks(new Set());
  };

  const handleSortSwitch = (value: EventSortMode) => (checked: boolean) => {
    if (checked) {
      setSortBy(value);
      return;
    }
    if (sortBy === value) setSortBy('soonest');
  };

  const handleTimeSwitch = (value: EventTimeFilter) => (checked: boolean) => {
    if (checked) {
      setTimeFilter(value);
      return;
    }
    if (timeFilter === value) setTimeFilter('all');
  };

  const handleQuickPickSwitch = (pick: EventQuickPick) => (checked: boolean) => {
    setActiveQuickPicks((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pick);
      else next.delete(pick);
      return next;
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
    engagement,
  ]);

  if (isLoading && events.length === 0) {
    return (
      <div className="sbn-card text-center py-16 px-8 border-dashed">
        <Calendar className="w-10 h-10 text-muted mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-muted">Loading community events…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="events_feed_wrapper">
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

        <CollapsibleFilterSection
          id="events_filter_toggles_toggle"
          title="Sort & filters"
          activeCount={toggleFilterCount}
        >
          <div className="space-y-3" id="events_filter_switches">
            <div className="space-y-1.5" id="events_sort_bar">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sort events</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <FilterLabeledSwitch
                    key={value}
                    id={`events_sort_${value}`}
                    label={label}
                    checked={sortBy === value}
                    onChange={handleSortSwitch(value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">When</p>
              <div className="flex flex-wrap gap-2" id="events_time_filter">
                {TIME_FILTER_OPTIONS.map(({ value, label }) => (
                  <FilterLabeledSwitch
                    key={value}
                    id={`events_time_${value}`}
                    label={label}
                    checked={timeFilter === value}
                    onChange={handleTimeSwitch(value)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick picks</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_QUICK_PICKS.map(({ id, label }) => (
                  <FilterLabeledSwitch
                    key={id}
                    id={`events_quick_pick_${id}`}
                    label={label}
                    checked={activeQuickPicks.has(id)}
                    onChange={handleQuickPickSwitch(id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </CollapsibleFilterSection>

        <div className="pt-0 border-t border-app">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="sbn-chip w-full justify-between flex items-center gap-2"
            aria-expanded={filtersOpen}
          >
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Refine filters
            </span>
            <span className="text-subtle text-xs">
              {selectedNeighborhood !== 'All Neighborhoods' ? '1 active' : 'Neighborhood'}
            </span>
          </button>

          {filtersOpen && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FilterSelect
                id="events_filter_neighborhood_select"
                label="Neighborhood"
                icon={MapPin}
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
            </div>
          )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-5" id="events_grid_cards">
          {filteredEvents.map((event) => (
            <div key={event.id}>
              <EventCard
                event={event}
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
