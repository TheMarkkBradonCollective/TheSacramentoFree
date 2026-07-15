import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownUp,
  Calendar,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CommunityEvent, SACRAMENTO_NEIGHBORHOODS, UserProfile } from '../types';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { isEventUpcoming } from '../lib/eventRsvp';
import { EVENTS } from '../siteContent';
import EventCard from './EventCard';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { haversineMeters, type LatLng } from '../lib/mapRoute';

interface EventsViewProps {
  events: CommunityEvent[];
  userProfile: UserProfile;
  engagement: EventsEngagementApi;
  onViewEvent: (event: CommunityEvent) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  commentsLocked?: boolean;
  sneakPeek?: boolean;
}

type EventTimeFilter = 'all' | 'upcoming' | 'past';
type EventSortMode = 'soonest' | 'newest' | 'most_rsvps';

const TIME_FILTER_OPTIONS: { value: EventTimeFilter; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

const SORT_OPTIONS: { value: EventSortMode; label: string; hint: string }[] = [
  { value: 'soonest', label: 'Soonest', hint: 'Next on the calendar first' },
  { value: 'newest', label: 'Newest', hint: 'Recently posted first' },
  { value: 'most_rsvps', label: 'Popular', hint: 'Most RSVPs first' },
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
  const [myAreaOnly, setMyAreaOnly] = useState(false);
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

  const hasExtraFilters =
    timeFilter !== 'all' ||
    selectedNeighborhood !== 'All Neighborhoods' ||
    myAreaOnly ||
    searchTerm.trim() !== '' ||
    sortBy !== 'soonest';

  const clearFilters = () => {
    setSearchTerm('');
    setTimeFilter('all');
    setSortBy('soonest');
    setSelectedNeighborhood('All Neighborhoods');
    setMyAreaOnly(false);
  };

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

      if (myAreaOnly && event.neighborhood !== userProfile.neighborhood) return false;

      return true;
    });

    const rsvpTotal = (eventId: string) => {
      const rsvp = engagement.getRsvpsForEvent(eventId);
      return rsvp.going + rsvp.maybe + rsvp.gone + rsvp.missed;
    };

    return [...filtered].sort((a, b) => {
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
  }, [
    events,
    searchTerm,
    timeFilter,
    selectedNeighborhood,
    myAreaOnly,
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

        <div className="space-y-2" id="events_sort_bar">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sort events</p>
            <p className="text-[10px] text-subtle">
              {SORT_OPTIONS.find((option) => option.value === sortBy)?.hint}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sort events">
            {SORT_OPTIONS.map(({ value, label }) => {
              const active = sortBy === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  id={`events_sort_${value}`}
                  onClick={() => setSortBy(value)}
                  className={`sbn-chip flex items-center gap-1.5 ${active ? 'sbn-chip-active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">When</p>
          <div className="flex flex-wrap gap-2" id="events_time_filter">
            {TIME_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTimeFilter(value)}
                className={`sbn-chip ${timeFilter === value ? 'sbn-chip-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick picks</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMyAreaOnly((prev) => !prev)}
              className={`sbn-chip ${myAreaOnly ? 'sbn-chip-active' : ''}`}
            >
              My area
            </button>
          </div>
        </div>

        <div className="pt-1 border-t border-app">
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

              <FilterSelect
                id="events_filter_sort_select"
                label="More sort options"
                icon={ArrowDownUp}
                value={sortBy}
                onChange={(v) => setSortBy(v as EventSortMode)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                engagement={engagement}
                onViewEvent={onViewEvent}
                onViewProfile={onViewProfile}
                commentsLocked={commentsLocked}
                distanceMeters={getEventDistance(event)}
                onNavigate={() => onViewEvent(event)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
