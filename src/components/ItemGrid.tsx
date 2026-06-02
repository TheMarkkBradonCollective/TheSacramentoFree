import { useState } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, UserProfile } from '../types';
import { Search as SearchIcon, MapPin, Tag, AlertCircle } from 'lucide-react';
import ItemCard from './ItemCard';
import PostItemModal from './PostItemModal';
import { updateSupabaseItemStatus, deleteSupabaseItem } from '../supabase';
import { useItemsEngagement } from '../hooks/useItemsEngagement';
import { SITE } from '../siteContent';

export type ItemsEngagementApi = ReturnType<typeof useItemsEngagement>;

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
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);

  const {
    getVotesForPost,
    getCommentsForPost,
    expandedPostComments,
    toggleComments,
    handleVote,
    handleAddComment,
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

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    setUpdatingItemId(itemId);

    try {
      await deleteSupabaseItem(itemId);
      onRefresh();
    } catch (err) {
      console.warn('Supabase delete item failed:', err);
      onRefresh();
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Run modular filters
  const filteredItems = items.filter((item) => {
    // 1. Text Search
    const searchString = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    // 2. Type Filter
    const matchesType = selectedType === 'all' || item.type === selectedType;

    // 3. Category Filter
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;

    // 4. Neighborhood Filter
    const matchesNeighborhood = selectedNeighborhood === 'All Neighborhoods' || item.neighborhood === selectedNeighborhood;

    return matchesSearch && matchesType && matchesCategory && matchesNeighborhood;
  });

  return (
    <>
    <div className="space-y-6" id="item_feed_wrapper">
      <div className="sbn-card p-5" id="filter_panel">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
            <input
              type="text"
              id="feed_search_input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search listings…"
              className="sbn-input"
            />
          </div>
          <div className="flex flex-wrap gap-2 shrink-0" id="feed_type_filter">
            {(['all', 'giveaway', 'looking'] as const).map((type) => (
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
                {type === 'all' ? 'All' : type === 'giveaway' ? 'Giving' : 'Looking for'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-app">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-app bg-inset">
            <Tag className="w-4 h-4 text-subtle shrink-0" />
            <select
              id="filter_category_select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-app focus:outline-none cursor-pointer"
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
            </select>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-app bg-inset">
            <MapPin className="w-4 h-4 text-accent shrink-0" />
            <select
              id="filter_neighborhood_select"
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-app focus:outline-none cursor-pointer"
            >
              <option value="All Neighborhoods">All neighborhoods</option>
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="sbn-card text-center py-16 px-8 border-dashed" id="empty_feed_state">
          <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-app">No listings found</h3>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
            Try different filters, or be the first to post. {SITE.tagline}
          </p>
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
              onVote={(dir) => handleVote(item.id, item.userId, dir)}
              onToggleComments={() => toggleComments(item.id)}
              onAddComment={(text) => handleAddComment(item.id, text)}
              onUpdateStatus={(status) => handleUpdateStatus(item.id, status)}
              onEdit={() => setEditingItem(item)}
              onViewDetail={() => onViewItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
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
