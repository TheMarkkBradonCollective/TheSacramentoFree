import { useMemo, useState, type ReactNode } from 'react';
import { ItemPost, PostStatus, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, UserProfile } from '../types';
import {
  ArrowDownUp,
  Bookmark,
  CircleDot,
  Search as SearchIcon,
  MapPin,
  Tag,
  AlertCircle,
  ThumbsUp,
  X,
} from 'lucide-react';
import ItemCard from './ItemCard';
import PostItemModal from './PostItemModal';
import { updateSupabaseItemStatus } from '../supabase';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { useSavedItems } from '../hooks/useSavedItems';
import { SITE } from '../siteContent';

export type ItemsEngagementApi = ReturnType<typeof useItemsEngagement>;

type StatusFilter = 'all' | Exclude<PostStatus, 'withdrawn'>;
type VoteFilter = 'all' | 'i_interested' | 'has_interest' | 'has_comments';
type SortOption = 'newest' | 'oldest' | 'most_upvotes' | 'most_comments' | 'top_score';

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

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most_upvotes', label: 'Most interested (upvotes)' },
  { value: 'most_comments', label: 'Most comments' },
  { value: 'top_score', label: 'Highest score (upvotes − downvotes)' },
];

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
  const [selectedType, setSelectedType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [selectedVoteFilter, setSelectedVoteFilter] = useState<VoteFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);

  const { savedIds, toggleSaved, isSaved } = useSavedItems();

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
    setUpdatingItemId(itemId);

    try {
      await updateSupabaseItemStatus(itemId, newStatus);
      onRefresh();
    } catch (err) {
      console.warn('Supabase update status failed:', err);
      onRefresh();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const hasExtraFilters =
    selectedType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedVoteFilter !== 'all' ||
    sortBy !== 'newest' ||
    selectedCategory !== 'All Categories' ||
    selectedNeighborhood !== 'All Neighborhoods' ||
    searchTerm.trim() !== '' ||
    showSavedOnly;

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType('all');
    setSelectedCategory('All Categories');
    setSelectedNeighborhood('All Neighborhoods');
    setSelectedStatus('all');
    setSelectedVoteFilter('all');
    setSortBy('newest');
    setShowSavedOnly(false);
  };

  const filteredItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (item.status === 'withdrawn') return false;

      const searchString = `${item.title} ${item.description} ${item.category}`.toLowerCase();
      if (!searchString.includes(searchTerm.toLowerCase())) return false;

      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedCategory !== 'All Categories' && item.category !== selectedCategory) return false;
      if (selectedNeighborhood !== 'All Neighborhoods' && item.neighborhood !== selectedNeighborhood) return false;
      if (showSavedOnly && !savedIds.has(item.id)) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

      const votes = getVotesForPost(item.id);
      const commentCount = getCommentsForPost(item.id).length;

      if (selectedVoteFilter === 'i_interested' && votes.userVote !== 'up') return false;
      if (selectedVoteFilter === 'has_interest' && votes.upvotes === 0) return false;
      if (selectedVoteFilter === 'has_comments' && commentCount === 0) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'most_upvotes':
          return getVotesForPost(b.id).upvotes - getVotesForPost(a.id).upvotes;
        case 'most_comments':
          return getCommentsForPost(b.id).length - getCommentsForPost(a.id).length;
        case 'top_score': {
          const scoreA = getVotesForPost(a.id).upvotes - getVotesForPost(a.id).downvotes;
          const scoreB = getVotesForPost(b.id).upvotes - getVotesForPost(b.id).downvotes;
          return scoreB - scoreA;
        }
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [
    items,
    searchTerm,
    selectedType,
    selectedCategory,
    selectedNeighborhood,
    showSavedOnly,
    savedIds,
    selectedStatus,
    selectedVoteFilter,
    sortBy,
    getVotesForPost,
    getCommentsForPost,
  ]);

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

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Listing type</p>
          <div className="flex flex-wrap gap-2" id="feed_type_filter">
            {(['all', 'giveaway', 'looking'] as const).map((type) => (
              <button
                key={type}
                type="button"
                id={`type_${type}_btn`}
                onClick={() => {
                  setSelectedType(type);
                  setSelectedCategory('All Categories');
                  setShowSavedOnly(false);
                }}
                className={`sbn-chip ${selectedType === type && !showSavedOnly ? 'sbn-chip-active' : ''}`}
              >
                {type === 'all' ? 'All' : type === 'giveaway' ? 'Giving' : 'Looking for'}
              </button>
            ))}
            <button
              type="button"
              id="type_saved_btn"
              onClick={() => setShowSavedOnly((v) => !v)}
              className={`sbn-chip flex items-center gap-1.5 ${showSavedOnly ? 'sbn-chip-active' : ''}`}
            >
              <Bookmark className={`w-3 h-3 ${showSavedOnly ? 'fill-current' : ''}`} />
              Saved
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Quick picks</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedVoteFilter('has_interest');
                setSortBy('most_upvotes');
                setShowSavedOnly(false);
              }}
              className={`sbn-chip ${selectedVoteFilter === 'has_interest' && sortBy === 'most_upvotes' ? 'sbn-chip-active' : ''}`}
            >
              Trending
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('active');
                setSelectedType('giveaway');
                setSelectedVoteFilter('all');
                setShowSavedOnly(false);
              }}
              className={`sbn-chip ${selectedStatus === 'active' && selectedType === 'giveaway' && !showSavedOnly ? 'sbn-chip-active' : ''}`}
            >
              Free stuff
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('active');
                setSelectedType('looking');
                setSelectedVoteFilter('all');
                setShowSavedOnly(false);
              }}
              className={`sbn-chip ${selectedStatus === 'active' && selectedType === 'looking' && !showSavedOnly ? 'sbn-chip-active' : ''}`}
            >
              ISO requests
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-app">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Refine results</p>
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
                </>
              ) : selectedType === 'giveaway' ? (
                ITEM_CATEGORIES.map((c) => (
                  <option key={`giveaway_only_${c}`} value={c}>
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
        </div>

        <div className="pt-3 border-t border-app">
          <FilterSelect
            id="filter_sort_select"
            label="Sort results"
            icon={ArrowDownUp}
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>
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
            {showSavedOnly
              ? 'You haven\'t saved any listings yet. Tap the bookmark icon on any listing to save it.'
              : selectedVoteFilter === 'i_interested'
                ? 'No listings you have marked as interested yet. Vote up on posts you want to follow.'
                : `Try different filters, or be the first to post. ${SITE.tagline}`}
          </p>
          {showSavedOnly && (
            <button
              type="button"
              onClick={() => setShowSavedOnly(false)}
              className="sbn-btn sbn-btn-secondary sbn-btn-sm mt-4"
            >
              Browse all listings
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-5" id="items_grid_cards">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
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
    </>
  );
}
