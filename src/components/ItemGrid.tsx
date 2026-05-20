import { useState } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, UserProfile } from '../types';
import { Filter, Search as SearchIcon, MapPin, Tag, MessageSquare, AlertCircle, CheckCircle, Trash2, Calendar } from 'lucide-react';
import { updateSupabaseItemStatus, deleteSupabaseItem } from '../supabase';

interface ItemGridProps {
  items: ItemPost[];
  userProfile: UserProfile;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onRefresh: () => void;
}

export default function ItemGrid({ items, userProfile, onInitiateChat, onRefresh }: ItemGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // Status transitions
  const handleUpdateStatus = async (itemId: string, newStatus: 'completed' | 'withdrawn' | 'active') => {
    setUpdatingItemId(itemId);
    
    // Update local storage immediately for seamless offline response
    const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
    let localListings: ItemPost[] = [];
    try {
      localListings = JSON.parse(localListingsStr);
    } catch (_) {}
    localListings = localListings.map(item => {
      if (item.id === itemId) return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      return item;
    });
    localStorage.setItem('local_user_listings', JSON.stringify(localListings));

    const cachedStr = localStorage.getItem('cached_items') || '[]';
    let cachedItems: ItemPost[] = [];
    try {
      cachedItems = JSON.parse(cachedStr);
    } catch (_) {}
    cachedItems = cachedItems.map(item => {
      if (item.id === itemId) return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      return item;
    });
    localStorage.setItem('cached_items', JSON.stringify(cachedItems));

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

    // Delete from local storage immediately for seamless offline response
    const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
    let localListings: ItemPost[] = [];
    try {
      localListings = JSON.parse(localListingsStr);
    } catch (_) {}
    localListings = localListings.filter(item => item.id !== itemId);
    localStorage.setItem('local_user_listings', JSON.stringify(localListings));

    const cachedStr = localStorage.getItem('cached_items') || '[]';
    let cachedItems: ItemPost[] = [];
    try {
      cachedItems = JSON.parse(cachedStr);
    } catch (_) {}
    cachedItems = cachedItems.filter(item => item.id !== itemId);
    localStorage.setItem('cached_items', JSON.stringify(cachedItems));

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
    <div className="space-y-6" id="item_feed_wrapper">
      {/* Search & Filtering Area */}
      <div className="bg-white rounded-none p-6 border border-zinc-200 shadow-xs" id="filter_panel">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <SearchIcon className="h-4.5 w-4.5 text-zinc-500" />
            </div>
            <input
              type="text"
              id="feed_search_input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search wood tables, kitchenware, organic lemon plants, toys..."
              className="block w-full pl-11 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-450 font-semibold focus:bg-white"
            />
          </div>

          {/* Giveaway vs Looking toggle */}
          <div className="flex bg-zinc-100 p-1 rounded-none border border-zinc-200 shrink-0" id="feed_type_filter">
            <button
              id="type_all_btn"
              onClick={() => setSelectedType('all')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'all' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              All Listings
            </button>
            <button
              id="type_gives_btn"
              onClick={() => setSelectedType('giveaway')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'giveaway' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-650 hover:text-black'
              }`}
            >
              Gives
            </button>
            <button
              id="type_asks_btn"
              onClick={() => setSelectedType('looking')}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'looking' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-650 hover:text-black'
              }`}
            >
              Asks
            </button>
          </div>
        </div>

        {/* Compound Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-zinc-150 pt-4" id="compound_selectors">
          {/* Category Dropdown */}
          <div className="flex items-center space-x-2.5 bg-zinc-50 rounded-none px-3 py-2 border border-zinc-200">
            <Tag className="w-4 h-4 text-zinc-500 shrink-0" />
            <select
              id="filter_category_select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-xs text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
            >
              <option value="All Categories" className="bg-white">All Categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-white">{c.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* Neighborhood Dropdown */}
          <div className="flex items-center space-x-2.5 bg-zinc-50 rounded-none px-3 py-2 border border-zinc-200">
            <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
            <select
              id="filter_neighborhood_select"
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-transparent text-xs text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
            >
              <option value="All Neighborhoods" className="bg-white">All Counties ({userProfile.neighborhood} Sector)</option>
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n} className="bg-white">{n.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-none border border-dashed border-zinc-300 p-8" id="empty_feed_state">
          <AlertCircle className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-xs font-black text-black uppercase tracking-widest">No listings matches operational filters</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto font-semibold">
            Re-adjust your sector configurations above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="items_grid_cards">
          {filteredItems.map((item) => {
            const isOwner = item.userId === userProfile.uid;
            
            return (
              <div
                key={item.id}
                id={`item_card_${item.id}`}
                className={`flex flex-col bg-white rounded-none border border-zinc-200 hover:border-black transition-all group ${
                  item.status !== 'active' ? 'opacity-65 bg-zinc-50' : ''
                }`}
              >
                {/* Header Information */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Badge row */}
                    <div className="flex items-center justify-between mb-4">
                      {item.type === 'giveaway' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest bg-black text-white border border-black">
                          Giveaway
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest bg-white text-black border border-black">
                          Request Wanted
                        </span>
                      )}

                      {/* Status label */}
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-[#05A357] bg-[#05A357]/10 border border-[#05A357]/20 px-2.5 py-0.5">
                          STASH COMPLETED
                        </span>
                      )}
                      {item.status === 'withdrawn' && (
                        <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-[#E11900] bg-[#E11900]/10 border border-[#E11900]/20 px-2.5 py-0.5">
                          Withdrawn
                        </span>
                      )}
                      {item.status === 'active' && (
                        <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange-light border border-brand-orange/20 px-2.5 py-0.5">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-black text-black group-hover:text-brand-orange transition-colors uppercase tracking-tight leading-tight">
                      {item.title}
                    </h4>

                    {/* Category */}
                    <span className="inline-block mt-1 text-[9.5px] font-black text-zinc-400 font-mono tracking-widest uppercase">
                      {item.category}
                    </span>

                    {/* Description */}
                    <p className="mt-2.5 text-xs text-zinc-600 font-semibold leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-sage" />
                      <span className="font-extrabold text-black uppercase tracking-wide">{item.neighborhood}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="font-bold text-zinc-500 uppercase">
                        {item.createdAt 
                          ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Action Drawer */}
                <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between">
                  {/* Poster details */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <img
                      src={item.userPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`}
                      referrerPolicy="no-referrer"
                      alt={item.userDisplayName}
                      className="w-7 h-7 rounded-none border border-zinc-200"
                    />
                    <div className="max-w-[100px]">
                      <p className="text-[10px] font-black text-black line-clamp-1 uppercase leading-none">{item.userDisplayName}</p>
                      <span className="text-[8.5px] text-zinc-400 font-bold uppercase block mt-1 tracking-wider">Member</span>
                    </div>
                  </div>

                  {/* Access Button Logic */}
                  <div>
                    {isOwner ? (
                      <div className="flex items-center space-x-1" id="owner_card_actions">
                        {item.status === 'active' ? (
                          <>
                            <button
                              id={`complete_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'completed')}
                              className="px-2.5 py-1.5 bg-black hover:bg-zinc-900 text-white rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                              title="Mark as completed/shared"
                            >
                              Completed
                            </button>
                            <button
                              id={`withdraw_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'withdrawn')}
                              className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                              title="Withdraw listing"
                            >
                              Withdraw
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              id={`relist_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'active')}
                              className="px-2.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Relist
                            </button>
                            <button
                              id={`delete_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-zinc-400 hover:text-[#E11900] hover:bg-red-500/10 rounded-none transition-colors cursor-pointer"
                              title="Delete listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      item.status === 'active' ? (
                        <button
                          id={`message_btn_${item.id}`}
                          onClick={() => onInitiateChat(item.userId, item.userDisplayName, item.userPhotoURL, item)}
                          className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white font-black text-[10px] uppercase tracking-widest rounded-none inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>SEND DISPATCH</span>
                        </button>
                      ) : (
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Archive Record</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
