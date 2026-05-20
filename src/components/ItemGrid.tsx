import { useState } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, UserProfile } from '../types';
import { Filter, Search as SearchIcon, MapPin, Tag, MessageSquare, AlertCircle, CheckCircle, Trash2, Calendar } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
    try {
      try {
        await updateSupabaseItemStatus(itemId, newStatus);
      } catch (sbErr) {
        console.warn('Supabase update status bypassed or failed:', sbErr);
      }

      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      onRefresh();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `items/${itemId}`);
      } catch (authError: any) {
        alert('You do not have administrative permissions to modify this listing.');
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    setUpdatingItemId(itemId);
    try {
      try {
        await deleteSupabaseItem(itemId);
      } catch (sbErr) {
        console.warn('Supabase delete item bypassed or failed:', sbErr);
      }

      const itemRef = doc(db, 'items', itemId);
      await deleteDoc(itemRef);
      onRefresh();
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.DELETE, `items/${itemId}`);
      } catch (authError: any) {
        alert('Insufficient rules permissions to delete this item.');
      }
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
      <div className="glass rounded-2xl p-5 shadow-sm border border-white/40" id="filter_panel">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4.5 w-4.5 text-slate-500" />
            </div>
            <input
              type="text"
              id="feed_search_input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search wood tables, kitchenware, baby books..."
              className="block w-full pl-10 pr-3 py-2.5 search-glass rounded-xl text-sm text-slate-900 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Giveaway vs Looking toggle */}
          <div className="flex bg-black/5 backdrop-blur-xs p-1 rounded-xl shrink-0" id="feed_type_filter">
            <button
              id="type_all_btn"
              onClick={() => setSelectedType('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedType === 'all' 
                  ? 'bg-white/60 text-slate-900 shadow-sm border border-white/50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Listings
            </button>
            <button
              id="type_gives_btn"
              onClick={() => setSelectedType('giveaway')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedType === 'giveaway' 
                  ? 'bg-white/60 text-emerald-800 shadow-sm border border-white/50' 
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Gives
            </button>
            <button
              id="type_asks_btn"
              onClick={() => setSelectedType('looking')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                selectedType === 'looking' 
                  ? 'bg-white/60 text-blue-800 shadow-sm border border-white/50' 
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Asks
            </button>
          </div>
        </div>

        {/* Compound Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-white/35 pt-4" id="compound_selectors">
          {/* Category Dropdown */}
          <div className="flex items-center space-x-2 bg-white/40 rounded-xl px-3 py-1.5 border border-white/50">
            <Tag className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              id="filter_category_select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="All Categories" className="bg-white">All Categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-white">{c}</option>
              ))}
            </select>
          </div>

          {/* Neighborhood Dropdown */}
          <div className="flex items-center space-x-2 bg-white/40 rounded-xl px-3 py-1.5 border border-white/50">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <select
              id="filter_neighborhood_select"
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-800 font-bold focus:outline-hidden cursor-pointer"
            >
              <option value="All Neighborhoods" className="bg-white">All Neighborhoods ({userProfile.neighborhood} default)</option>
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n} className="bg-white">{n}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Grid Results */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl border border-dashed border-white/50 p-8" id="empty_feed_state">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No postings match your search</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            Try resetting your filters or widen your neighborhood selection to see what neighbors are active in surrounding regions.
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
                className={`flex flex-col glass-card rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:scale-[1.01] transition-all duration-300 ${
                  item.status !== 'active' ? 'opacity-70' : ''
                }`}
              >
                {/* Header Information */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Badge row */}
                    <div className="flex items-center justify-between mb-3">
                      {item.type === 'giveaway' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 border border-emerald-500/25">
                          GIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-800 border border-blue-500/25">
                          ASK
                        </span>
                      )}

                      {/* Status label */}
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center text-[10px] text-slate-650 font-bold bg-white/40 border border-white/50 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          Completed
                        </span>
                      )}
                      {item.status === 'withdrawn' && (
                        <span className="inline-flex items-center text-[10px] text-red-650 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          Withdrawn
                        </span>
                      )}
                      {item.status === 'active' && (
                        <span className="inline-flex items-center text-[10px] text-emerald-650 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-slate-800 tracking-tight line-clamp-1">
                      {item.title}
                    </h4>

                    {/* Category */}
                    <span className="inline-block mt-1 text-[11px] font-bold text-slate-500 font-mono tracking-wide uppercase">
                      {item.category}
                    </span>

                    {/* Description */}
                    <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-5 pt-4 border-t border-white/30 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold text-slate-700">{item.neighborhood}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-650">
                        {item.createdAt 
                          ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Action Drawer */}
                <div className="px-5 py-4 bg-white/30 border-t border-white/30 backdrop-blur-xs flex items-center justify-between">
                  {/* Poster details */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <img
                      src={item.userPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`}
                      referrerPolicy="no-referrer"
                      alt={item.userDisplayName}
                      className="w-7 h-7 rounded-lg border border-white/40"
                    />
                    <div className="max-w-[100px]">
                      <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{item.userDisplayName}</p>
                      <p className="text-[9px] text-slate-550 font-bold">Neighbor</p>
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
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center space-x-1 border border-emerald-500/20 transition-all cursor-pointer"
                              title="Mark as completed/shared"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Stash Saved</span>
                            </button>
                            <button
                              id={`withdraw_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleUpdateStatus(item.id, 'withdrawn')}
                              className="px-2.5 py-1.5 bg-black/5 hover:bg-black/10 text-slate-700 rounded-lg text-[11px] font-bold border border-black/10 transition-all cursor-pointer"
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
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              Relist Post
                            </button>
                            <button
                              id={`delete_btn_${item.id}`}
                              disabled={updatingItemId === item.id}
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
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
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full inline-flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Message Neighbor</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block pr-1.5 font-mono">No longer active</span>
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
