import { useMemo, useState, type ReactNode } from 'react';
import { ItemPost, PostStatus, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, UserProfile } from '../types';
import {
  ArrowDownUp,
  Bookmark,
  ChevronDown,
  CircleDot,
  Flame,
  Search as SearchIcon,
  MapPin,
  SlidersHorizontal,
  Tag,
  AlertCircle,
  ThumbsUp,
  TrendingUp,
  X,
} from 'lucide-react';
import ItemCard from './ItemCard';
import PostItemModal from './PostItemModal';
import PickupAttributionModal from './PickupAttributionModal';
import { updateSupabaseItemStatus } from '../supabase';
import { completedActionNeedsAttribution } from '../lib/pickupAttribution';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useSavedItems } from '../hooks/useSavedItems';
import { extractListingImageUrls } from '../lib/listingContent';
import { SITE } from '../siteContent';
import { LISTING_TYPE_FILTERS, getPostTypeFilterLabel, type ListingTypeFilter } from '../lib/postType';
import {
  compareFeedItems,
  feedEngagementSlice,
  isPrimaryFeedSort,
  MORE_FEED_SORTS,
  PRIMARY_FEED_SORTS,
  type FeedSortMode,
} from '../lib/feedSort';
import { useTrackPresence } from '../contexts/PresenceContext';

export type ItemsEngagementApi = ReturnType<typeof useItemsEngagement>;

type StatusFilter = 'all' | Exclude<PostStatus, 'withdrawn'>;
type VoteFilter = 'all' | 'i_interested' | 'has_interest' | 'has_comments';

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Available' },
  { value: 'pending_pickup', label: 'Pending pickup' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
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

function needsPickupListing(item: ItemPost): boolean {
  if (item.status === 'pending_pickup' || item.status === 'on_hold') return true;
  return /pickup|curb|porch/i.test(item.category);
}

const PRIMARY_SORT_ICONS: Partial<Record<FeedSortMode, typeof Flame>> = {
  hot: Flame,
  top: TrendingUp,
};

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
  icon: typeof Tag;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
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

interface ItemGridProps {
  items: ItemPost[];
  userProfile: UserProfile;
  engagement: ItemsEngagementApi;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onViewItem: (item: ItemPost) => void;
  onViewProfile: (userId: string) => void;
  onRefresh: () => void;
}

export default function ItemGrid({
  items,
  userProfile,
  engagement,
  onInitiateChat,
  onViewItem,
  onViewProfile,
  onRefresh,
}: ItemGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ListingTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedVoteFilter, setSelectedVoteFilter] = useState<VoteFilter>('all');
  const [sortBy, setSortBy] = useState<FeedSortMode>('new');
  const [activeQuickPicks, setActiveQuickPicks] = useState<Set<QuickPick>>(() => new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);
  const [attributionItem, setAttributionItem] = useState<ItemPost | null>(null);

  const { savedIds, toggleSaved, isSaved } = useSavedItems(userProfile.uid);

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

  const toggleQuickPick = (pick: QuickPick) => {
    setActiveQuickPicks((prev) => {
      const next = new Set(prev);
      if (next.has(pick)) next.delete(pick);
      else next.add(pick);
      return next;
    });
  };

  const hasRefineFilters =
    selectedStatus !== 'all' ||
    selectedVoteFilter !== 'all' ||
    !isPrimaryFeedSort(sortBy) ||
    selectedCategory !== 'All Categories' ||
    selectedNeighborhood !== 'All Neighborhoods';

  const refineFilterCount = [
    selectedCategory !== 'All Categories',
    selectedNeighborhood !== 'All Neighborhoods',
    selectedStatus !== 'all',
    selectedVoteFilter !== 'all',
    !isPrimaryFeedSort(sortBy),
  ].filter(Boolean).length;

  const hasExtraFilters =
    selectedType !== 'all' ||
    hasRefineFilters ||
    searchTerm.trim() !== '' ||
    activeQuickPicks.size > 0;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('All Categories');
    setSelectedNeighborhood('All Neighborhoods');
    setSelectedStatus('all');
    setSelectedVoteFilter('all');
    setSortBy('new');
    setActiveQuickPicks(new Set());
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (item.status === 'withdrawn') return false;

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

    return [...filtered].sort((a, b) => compareFeedItems(a, b, sortBy, getEngagement));
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
    getVotesForPost,
    getCommentsForPost,
  ]);

  const authorIds = useMemo(() => filteredItems.map((item) => item.userId), [filteredItems]);
  useTrackPresence(authorIds);

  return (
    <>
    <div className="space-y-6" id="item_feed_wrapper">
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

        <div className="space-y-2" id="feed_sort_bar">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Sort feed</p>
            <p className="text-[10px] text-subtle">
              {PRIMARY_FEED_SORTS.find((option) => option.value === sortBy)?.hint ??
                MORE_FEED_SORTS.find((option) => option.value === sortBy)?.label}
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Sort feed">
            {PRIMARY_FEED_SORTS.map(({ value, label }) => {
              const Icon = PRIMARY_SORT_ICONS[value];
              const active = sortBy === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  id={`feed_sort_${value}`}
                  onClick={() => setSortBy(value)}
                  className={`sbn-chip flex items-center gap-1.5 ${active ? 'sbn-chip-active' : ''}`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Listing type</p>
          <div className="flex flex-wrap gap-2" id="feed_type_filter">
            {LISTING_TYPE_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                id={`type_${type}_btn`}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedCategory('All Categories');
                }}
                className={`sbn-chip ${selectedType === type ? 'sbn-chip-active' : ''}`}
              >
                {getPostTypeFilterLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick picks</p>
            <p className="text-[10px] text-subtle">Tap to combine multiple</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PICKS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                id={`quick_pick_${id}`}
                onClick={() => toggleQuickPick(id)}
                className={`sbn-chip flex items-center gap-1.5 ${activeQuickPicks.has(id) ? 'sbn-chip-active' : ''}`}
              >
                {id === 'saved' && (
                  <Bookmark className={`w-3 h-3 ${activeQuickPicks.has('saved') ? 'fill-current' : ''}`} />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-app">
          <button
            type="button"
            id="feed_filters_sort_toggle"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-app bg-inset px-4 py-3 text-left hover:border-accent/40 transition-colors"
          >
            <span className="flex items-center gap-2 min-w-0">
              <SlidersHorizontal className="w-4 h-4 text-accent shrink-0" aria-hidden />
              <span className="text-sm font-semibold text-app">Filters &amp; sort</span>
              {refineFilterCount > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-accent bg-accent-soft px-2 py-0.5 rounded-full shrink-0">
                  {refineFilterCount} active
                </span>
              )}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-muted shrink-0 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          {filtersOpen && (
            <div className="mt-3 space-y-3 rounded-xl border border-app bg-surface/50 p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FilterSelect
                  id="filter_category_select"
                  label="Category"
                  icon={Tag}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                >
                  <option value="All Categories">All categories</option>
                  {selectedType === 'all' ? (
                    <>
                      <optgroup label="Giving">
                        {ITEM_CATEGORIES.map((c) => (
                          <option key={`all_giveaway_${c}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Looking for">
                        {ISO_CATEGORIES.map((c) => (
                          <option key={`all_looking_${c}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Trade & Barter">
                        {ITEM_CATEGORIES.map((c) => (
                          <option key={`all_trade_${c}`} value={c}>
                            {c}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  ) : selectedType === 'giveaway' || selectedType === 'trade' ? (
                    ITEM_CATEGORIES.map((c) => (
                      <option key={`${selectedType}_only_${c}`} value={c}>
                        {c}
                      </option>
                    ))
                  ) : (
                    ISO_CATEGORIES.map((c) => (
                      <option key={`looking_only_${c}`} value={c}>
                        {c}
                      </option>
                    ))
                  )}
                </FilterSelect>

                <FilterSelect
                  id="filter_neighborhood_select"
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
                  id="filter_status_select"
                  label="Listing status"
                  icon={CircleDot}
                  value={selectedStatus}
                  onChange={(v) => setSelectedStatus(v as StatusFilter)}
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="filter_vote_select"
                  label="Interest & comments"
                  icon={ThumbsUp}
                  value={selectedVoteFilter}
                  onChange={(v) => setSelectedVoteFilter(v as VoteFilter)}
                >
                  {VOTE_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>

              <FilterSelect
                id="filter_sort_select"
                label="More sort options"
                icon={ArrowDownUp}
                value={sortBy}
                onChange={(v) => setSortBy(v as FeedSortMode)}
              >
                <optgroup label="Popular">
                  {PRIMARY_FEED_SORTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="More">
                  {MORE_FEED_SORTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              </FilterSelect>
            </div>
          )}
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

      {filteredItems.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-5" id="items_grid_cards">
          {filteredItems.map((item) => (
            <div key={item.id}>
              <ItemCard
                item={item}
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
              onViewProfile={onViewProfile}
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
