import { useEffect, useMemo, useRef, useState } from 'react';
import { ItemPost, PostStatus, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, UserProfile } from '../types';
import {
  ArrowDownUp,
  CircleDot,
  LayoutGrid,
  LayoutList,
  Plus,
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
  Tag,
  AlertCircle,
  ThumbsUp,
  X,
} from 'lucide-react';
import FilterLabeledSwitch from './FilterLabeledSwitch';
import FilterToggleGroup from './FilterToggleGroup';
import ItemCard from './ItemCard';
import { ItemGridSkeleton } from './Skeleton';
import PostItemModal from './PostItemModal';
import PickupAttributionModal from './PickupAttributionModal';
import { updateSupabaseItemStatus, getUserPickupCoordinationByIds } from '../supabase';
import { canShowListingInAppNavigation } from '../lib/goGetCoordinationGating';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import { completedActionNeedsAttribution } from '../lib/pickupAttribution';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useSavedItems } from '../hooks/useSavedItems';
import { extractListingImageUrls } from '../lib/listingContent';
import { SITE } from '../siteContent';
import { LISTING_TYPE_FILTERS, getPostTypeCardColumnLabel, type ListingTypeFilter } from '../lib/postType';
import {
  compareFeedItems,
  compareFeedItemsByDistance,
  feedEngagementSlice,
  MORE_FEED_SORTS,
  PRIMARY_FEED_SORTS,
  type FeedSortMode,
} from '../lib/feedSort';
import { useTrackPresence } from '../contexts/PresenceContext';
import { subscribeLiveGeolocation } from '../lib/liveGeolocation';
import { haversineMeters, type LatLng } from '../lib/mapRoute';
import { getItemMapDestination } from '../lib/itemLocation';
import { isNativeApp } from '../lib/nativePlatform';
import {
  readFeedViewMode,
  isClosedCommunityListing,
  writeFeedViewMode,
  type FeedViewMode,
} from '../lib/feedDisplayPrefs';

export type ItemsEngagementApi = ReturnType<typeof useItemsEngagement>;

type StatusFilter = 'all' | Exclude<PostStatus, 'withdrawn'>;
type VoteFilter = 'all' | 'i_interested' | 'has_interest' | 'has_comments';

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Available' },
  { value: 'pending_pickup', label: 'Pending pickup' },
  { value: 'on_hold', label: 'On hold' },
];

const VOTE_FILTER_OPTIONS: { value: VoteFilter; label: string }[] = [
  { value: 'all', label: 'All interest' },
  { value: 'i_interested', label: 'I voted interested' },
  { value: 'has_interest', label: 'Has upvotes' },
  { value: 'has_comments', label: 'Has comments' },
];

type QuickPick = 'saved' | 'my_neighborhood' | 'with_photos' | 'needs_pickup';

const QUICK_PICKS: { id: QuickPick; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'my_neighborhood', label: 'My area' },
  { id: 'with_photos', label: 'With photos' },
  { id: 'needs_pickup', label: 'Needs pickup' },
];

function feedSortToolbarLabel(mode: 'nearest' | 'new', compact: boolean): string {
  if (compact) return mode === 'nearest' ? 'Near' : 'New';
  return mode === 'nearest' ? 'Nearest' : 'Newest';
}

function feedTypeToolbarLabel(type: ListingTypeFilter): string {
  switch (type) {
    case 'all':
      return 'All';
    case 'giveaway':
      return 'Give';
    case 'looking':
      return 'Look';
    case 'trade':
      return 'Trade';
  }
}

function needsPickupListing(item: ItemPost): boolean {
  if (item.status === 'pending_pickup' || item.status === 'on_hold') return true;
  return /pickup|curb|porch/i.test(item.category);
}

const ALL_FEED_SORT_OPTIONS: { value: FeedSortMode; label: string }[] = [
  ...PRIMARY_FEED_SORTS.map(({ value, label }) => ({ value, label })),
  ...MORE_FEED_SORTS,
];

function filterToggleOptionId(prefix: string, value: string): string {
  const slug = value.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `${prefix}_${slug || 'option'}`;
}

function FilterPanelToggleSection<T extends string>({
  id,
  label,
  icon: Icon,
  ariaLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  icon: typeof Tag;
  ariaLabel: string;
  options: { value: T; label: string; id?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1.5" id={id}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted flex items-center gap-1">
        <Icon className="w-3 h-3 shrink-0" aria-hidden />
        {label}
      </p>
      <FilterToggleGroup
        id={`${id}_group`}
        ariaLabel={ariaLabel}
        options={options.map((opt) => ({
          ...opt,
          id: opt.id ?? filterToggleOptionId(`${id}_group`, opt.value),
        }))}
        value={value}
        onChange={onChange}
        wrap
      />
    </div>
  );
}

interface ItemGridProps {
  items: ItemPost[];
  userProfile: UserProfile;
  engagement: ItemsEngagementApi;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onViewItem: (item: ItemPost) => void;
  onNavigateItem?: (item: ItemPost) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
  onOpenNewPost?: () => void;
}

export default function ItemGrid({
  items,
  userProfile,
  engagement,
  onInitiateChat,
  onStaffListingChat,
  onViewItem,
  onNavigateItem,
  onViewProfile,
  onRefresh,
  isLoading = false,
  onOpenNewPost,
}: ItemGridProps) {
  const [coordByUid, setCoordByUid] = useState<
    Record<string, Pick<UserProfile, 'goGetEnabled' | 'pickupAvailability'>>
  >({});

  useEffect(() => {
    const posterIds = [...new Set(items.map((i) => i.userId).filter((uid) => uid && uid !== userProfile.uid))];
    if (posterIds.length === 0) {
      setCoordByUid({});
      return;
    }
    void getUserPickupCoordinationByIds(posterIds).then(setCoordByUid);
  }, [items, userProfile.uid]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ListingTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedVoteFilter, setSelectedVoteFilter] = useState<VoteFilter>('all');
  const [sortBy, setSortBy] = useState<FeedSortMode | null>(null);
  const [activeQuickPicks, setActiveQuickPicks] = useState<Set<QuickPick>>(() => new Set());
  const [viewMode, setViewMode] = useState<FeedViewMode>(() => readFeedViewMode());
  const [gridSortMode, setGridSortMode] = useState<'nearest' | 'new'>('nearest');
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);
  const [attributionItem, setAttributionItem] = useState<ItemPost | null>(null);

  const { savedIds, toggleSaved, isSaved } = useSavedItems(userProfile.uid);

  // Subscribe to live GPS so we can show distance badges on cards.
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

  const getItemDistance = (item: ItemPost): number | null => {
    if (!userLocation) return null;
    const dest = getItemMapDestination(item, userProfile.uid);
    if (!dest) return null;
    return haversineMeters(userLocation, dest);
  };

  const handleViewModeChange = (mode: FeedViewMode) => {
    setViewMode(mode);
    writeFeedViewMode(mode);
  };

  const {
    getVotesForPost,
    getCommentsForPost,
    expandedPostComments,
    toggleComments,
    handleVote,
    handleAddComment,
    handleDeleteComment,
  } = engagement;

  // Status transitions
  const handleUpdateStatus = async (
    itemId: string,
    newStatus: 'completed' | 'withdrawn' | 'active' | 'pending_pickup' | 'on_hold',
  ) => {
    const item = items.find((entry) => entry.id === itemId);
    if (item && newStatus === 'completed' && completedActionNeedsAttribution(item, userProfile)) {
      setAttributionItem(item);
      return;
    }

    setUpdatingItemId(itemId);

    try {
      await updateSupabaseItemStatus(itemId, newStatus, userProfile.uid);
      onRefresh();
    } catch (err) {
      console.warn('Supabase update status failed:', err);
      onRefresh();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSortSwitch = (value: FeedSortMode) => (checked: boolean) => {
    if (checked) {
      setSortBy(value);
      return;
    }
    if (sortBy === value) setSortBy(null);
  };

  const handleQuickPickSwitch = (pick: QuickPick) => (checked: boolean) => {
    setActiveQuickPicks((prev) => {
      const next = new Set(prev);
      if (checked) next.add(pick);
      else next.delete(pick);
      return next;
    });
  };

  const activeFilterCount = [
    searchTerm.trim() !== '',
    sortBy !== null,
    selectedType !== 'all',
    selectedCategory !== 'All Categories',
    selectedNeighborhood !== 'All Neighborhoods',
    selectedStatus !== 'all',
    selectedVoteFilter !== 'all',
    activeQuickPicks.size > 0,
  ].filter(Boolean).length;

  const hasExtraFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('All Categories');
    setSelectedNeighborhood('All Neighborhoods');
    setSelectedStatus('all');
    setSelectedVoteFilter('all');
    setSortBy(null);
    setActiveQuickPicks(new Set());
  };

  const cycleTypeFilter = () => {
    setSelectedType((current) => {
      const idx = LISTING_TYPE_FILTERS.indexOf(current);
      const next = LISTING_TYPE_FILTERS[(idx + 1) % LISTING_TYPE_FILTERS.length];
      if (next !== 'all') setSelectedCategory('All Categories');
      return next;
    });
  };

  const categoryFilterOptions = useMemo(() => {
    const allOption = { value: 'All Categories', label: 'All categories' };
    if (selectedType === 'giveaway' || selectedType === 'trade') {
      return [allOption, ...ITEM_CATEGORIES.map((c) => ({ value: c, label: c }))];
    }
    if (selectedType === 'looking') {
      return [allOption, ...ISO_CATEGORIES.map((c) => ({ value: c, label: c }))];
    }
    const merged = [...ITEM_CATEGORIES, ...ISO_CATEGORIES.filter((c) => !ITEM_CATEGORIES.includes(c))];
    return [allOption, ...merged.map((c) => ({ value: c, label: c }))];
  }, [selectedType]);

  const neighborhoodFilterOptions = useMemo(
    () => [
      { value: 'All Neighborhoods', label: 'All neighborhoods' },
      ...SACRAMENTO_NEIGHBORHOODS.map((n) => ({ value: n, label: n })),
    ],
    [],
  );

  const statusFilterOptions = useMemo(
    () => STATUS_FILTER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const voteFilterOptions = useMemo(
    () => VOTE_FILTER_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const sortFilterOptions = useMemo(
    () => ALL_FEED_SORT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (item.status === 'withdrawn') return false;
      if (isClosedCommunityListing(item)) return false;

      const searchString = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      if (!searchString.includes(searchTerm.toLowerCase())) return false;

      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;
      if (selectedNeighborhood !== 'All Neighborhoods' && item.neighborhood !== selectedNeighborhood) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

      const votes = getVotesForPost(item.id);
      const commentCount = getCommentsForPost(item.id).length;

      if (selectedVoteFilter === 'i_interested' && votes.userVote !== 'up') return false;
      if (selectedVoteFilter === 'has_interest' && votes.upvotes === 0) return false;
      if (selectedVoteFilter === 'has_comments' && commentCount === 0) return false;

      if (activeQuickPicks.has('saved') && !savedIds.has(item.id)) return false;
      if (activeQuickPicks.has('my_neighborhood') && item.neighborhood !== userProfile.neighborhood) {
        return false;
      }
      if (activeQuickPicks.has('with_photos') && extractListingImageUrls(item).length === 0) return false;
      if (activeQuickPicks.has('needs_pickup') && !needsPickupListing(item)) return false;

      return true;
    });

    const getEngagement = (itemId: string) => {
      const votes = getVotesForPost(itemId);
      return feedEngagementSlice(votes.upvotes, votes.downvotes, getCommentsForPost(itemId).length);
    };

    if (gridSortMode === 'nearest') {
      return [...filtered].sort((a, b) => compareFeedItemsByDistance(a, b, getItemDistance));
    }

    if (viewMode === 'grid') {
      return [...filtered].sort((a, b) => compareFeedItems(a, b, 'new', getEngagement));
    }

    return [...filtered].sort((a, b) => compareFeedItems(a, b, sortBy ?? 'new', getEngagement));
  }, [
    items,
    searchTerm,
    selectedType,
    selectedCategory,
    selectedNeighborhood,
    savedIds,
    selectedStatus,
    selectedVoteFilter,
    sortBy,
    activeQuickPicks,
    userProfile.neighborhood,
    userProfile.uid,
    userLocation,
    viewMode,
    gridSortMode,
    getVotesForPost,
    getCommentsForPost,
  ]);

  const authorIds = useMemo(() => filteredItems.map((item) => item.userId), [filteredItems]);
  useTrackPresence(authorIds);

  return (
    <>
    <div className="space-y-3" id="item_feed_wrapper">
      <div className="space-y-1 min-w-0" id="feed_view_mode_bar">
        <div className="flex items-center gap-1 sm:gap-2 w-full min-w-0">
          <div className="shrink-0">
            {onOpenNewPost ? (
              <button
                type="button"
                id="feed_new_listing_btn"
                onClick={onOpenNewPost}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-accent bg-accent px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-on-accent hover:bg-accent-hover transition-colors cursor-pointer whitespace-nowrap"
                aria-label="New stuff listing"
                title="New stuff listing"
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
                id="feed_sort_toggle"
                onClick={() => setGridSortMode((mode) => (mode === 'nearest' ? 'new' : 'nearest'))}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-app bg-inset px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold text-app hover:border-accent/40 transition-colors cursor-pointer whitespace-nowrap min-w-0 shrink-0"
                aria-pressed={gridSortMode === 'nearest'}
                aria-label={feedSortToolbarLabel(gridSortMode, false)}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 text-accent" aria-hidden />
                <span className="sm:hidden">{feedSortToolbarLabel(gridSortMode, true)}</span>
                <span className="hidden sm:inline">{feedSortToolbarLabel(gridSortMode, false)}</span>
              </button>
              <button
                type="button"
                id="feed_type_toggle"
                onClick={cycleTypeFilter}
                className={`inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-1.5 sm:px-2.5 sm:gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer whitespace-nowrap min-w-0 shrink-0 ${
                  selectedType !== 'all'
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-app bg-inset text-app hover:border-accent/40'
                }`}
                aria-pressed={selectedType !== 'all'}
                aria-label={`Listing type: ${feedTypeToolbarLabel(selectedType)}`}
              >
                <span>{feedTypeToolbarLabel(selectedType)}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              id="feed_filters_panel_toggle"
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
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-accent text-on-accent px-1.5 py-0.5 rounded-full min-w-[1.125rem] text-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div
              className="inline-flex rounded-xl border border-app bg-inset p-0.5 shrink-0"
              role="group"
              aria-label="Feed view"
              id="feed_view_mode_toggle"
            >
              <button
                type="button"
                id="feed_view_grid_btn"
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
                id="feed_view_list_btn"
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
        {gridSortMode === 'nearest' && !userLocation && (
          <p className="text-[10px] text-muted text-center px-1">Turn on location for distance sorting</p>
        )}
      </div>

      {filtersPanelOpen && (
      <div className="sbn-card p-4 sm:p-5 space-y-4" id="filter_panel">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
          <input
            type="text"
            id="feed_search_input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search listings…"
            className="sbn-input w-full"
          />
        </div>

        <div className="space-y-3" id="feed_filter_switches">
          <div className="space-y-1.5" id="feed_sort_bar">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sort feed</p>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_FEED_SORTS.map(({ value, label }) => (
                <span key={value} className="contents">
                  <FilterLabeledSwitch
                    id={`feed_sort_${value}`}
                    label={label}
                    checked={sortBy === value}
                    onChange={handleSortSwitch(value)}
                  />
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick picks</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PICKS.map(({ id, label }) => (
                <span key={id} className="contents">
                  <FilterLabeledSwitch
                    id={`quick_pick_${id}`}
                    label={label}
                    checked={activeQuickPicks.has(id)}
                    onChange={handleQuickPickSwitch(id)}
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-app space-y-4">
          <FilterPanelToggleSection
            id="filter_category_section"
            label="Category"
            icon={Tag}
            ariaLabel="Category"
            options={categoryFilterOptions}
            value={selectedCategory}
            onChange={setSelectedCategory}
          />

          <FilterPanelToggleSection
            id="filter_neighborhood_section"
            label="Neighborhood"
            icon={MapPin}
            ariaLabel="Neighborhood"
            options={neighborhoodFilterOptions}
            value={selectedNeighborhood}
            onChange={setSelectedNeighborhood}
          />

          <FilterPanelToggleSection
            id="filter_status_section"
            label="Listing status"
            icon={CircleDot}
            ariaLabel="Listing status"
            options={statusFilterOptions}
            value={selectedStatus}
            onChange={(v) => setSelectedStatus(v as StatusFilter)}
          />

          <FilterPanelToggleSection
            id="filter_vote_section"
            label="Interest & comments"
            icon={ThumbsUp}
            ariaLabel="Interest and comments"
            options={voteFilterOptions}
            value={selectedVoteFilter}
            onChange={(v) => setSelectedVoteFilter(v as VoteFilter)}
          />

          <FilterPanelToggleSection
            id="filter_sort_section"
            label="More sort options"
            icon={ArrowDownUp}
            ariaLabel="More sort options"
            options={sortFilterOptions}
            value={sortBy ?? 'new'}
            onChange={(v) => setSortBy(v as FeedSortMode)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-app">
          <p className="text-xs text-muted">
            <span className="font-semibold text-app">{filteredItems.length}</span> listing
            {filteredItems.length === 1 ? '' : 's'}
            {hasExtraFilters ? ' match your filters' : ''}
          </p>
          {hasExtraFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="sbn-chip text-xs flex items-center gap-1"
              id="feed_clear_filters_btn"
            >
              <X className="w-3 h-3" />
              Clear all
            </button>
          )}
        </div>
      </div>
      )}

      {isLoading && items.length === 0 ? (
        <ItemGridSkeleton />
      ) : filteredItems.length === 0 ? (
        <div className="sbn-card text-center py-16 px-8 border-dashed" id="empty_feed_state">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-app">No listings found</h3>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
            {activeQuickPicks.has('saved')
              ? 'You haven\'t saved any listings yet. Tap the bookmark icon on any listing to save it.'
              : selectedVoteFilter === 'i_interested'
                ? 'No listings you have marked as interested yet. Vote up on posts you want to follow.'
                : `Try different filters, or be the first to post. ${SITE.tagline}`}
          </p>
          {activeQuickPicks.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveQuickPicks(new Set())}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm mt-4"
            >
              Clear quick picks
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5'
              : 'flex flex-col gap-2 sm:gap-2.5'
          }
          id="items_grid_cards"
        >
          {filteredItems.map((item) => (
            <div key={item.id}>
              <ItemCard
                item={item}
                layout={viewMode}
                currentUserId={userProfile.uid}
                voteState={getVotesForPost(item.id)}
                comments={getCommentsForPost(item.id)}
                commentsExpanded={!!expandedPostComments[item.id]}
                updating={updatingItemId === item.id}
                isSaved={isSaved(item.id)}
                onSave={toggleSaved}
                onVote={(dir) => handleVote(item.id, item.userId, dir)}
                onToggleComments={() => toggleComments(item.id)}
                onAddComment={(text) => handleAddComment(item.id, text)}
                onDeleteComment={(commentId) => void handleDeleteComment(item.id, commentId)}
                userProfile={userProfile}
                onUpdateStatus={(status) => handleUpdateStatus(item.id, status)}
                onEdit={() => setEditingItem(item)}
                onViewDetail={() => onViewItem(item)}
                onMessage={() =>
                  onInitiateChat(item.userId, item.userDisplayName, item.userPhotoURL, item)
                }
                onStaffChat={onStaffListingChat ? () => onStaffListingChat(item) : undefined}
                onViewProfile={onViewProfile}
                distanceMeters={getItemDistance(item)}
                showPickupCoordination={canShowListingInAppNavigation({
                  item,
                  viewerProfile: userProfile,
                  posterProfile: coordByUid[item.userId],
                  isStaffOfficial: isStaffActingOfficial(userProfile),
                })}
                onNavigate={
                  item.userId !== userProfile.uid
                    ? () => (onNavigateItem ?? onViewItem)(item)
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>

    {editingItem && (
      <PostItemModal
        userProfile={userProfile}
        editItem={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={() => {
          setEditingItem(null);
          onRefresh();
        }}
      />
    )}

    {attributionItem && (
      <PickupAttributionModal
        item={attributionItem}
        owner={userProfile}
        mode="complete"
        onClose={() => setAttributionItem(null)}
        onSaved={() => {
          setAttributionItem(null);
          onRefresh();
        }}
      />
    )}
    </>
  );
}
