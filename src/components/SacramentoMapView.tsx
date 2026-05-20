import React, { useState, useMemo } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, UserProfile, ITEM_CATEGORIES, ISO_CATEGORIES, extractGPSCoordinates } from '../types';
import { MapPin, MessageSquare, Info, X, Tag, Heart, Calendar, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SacramentoMapViewProps {
  items: ItemPost[];
  userProfile: UserProfile;
  selectedType?: 'all' | 'giveaway' | 'looking';
  selectedCategory?: string;
  selectedNeighborhood?: string;
  searchTerm?: string;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onItemDetail?: (item: ItemPost) => void;
}

// Neighborhood center coordinates as percentages (0-100) of our map sandbox
export const NEIGHBORHOOD_COORDS: Record<string, { x: number; y: number }> = {
  'Natomas': { x: 48, y: 16 },
  'Arden': { x: 74, y: 25 },
  'Citrus Heights': { x: 90, y: 10 },
  'Rancho Cordova': { x: 90, y: 45 },
  'East Sacramento': { x: 64, y: 38 },
  'Midtown': { x: 53, y: 40 },
  'Downtown': { x: 41, y: 40 },
  'West Sacramento': { x: 22, y: 40 },
  'Land Park': { x: 38, y: 56 },
  'Curtis Park': { x: 50, y: 55 },
  'Oak Park': { x: 63, y: 56 },
  'Tahoe Park': { x: 75, y: 56 },
  'Pocket-Greenhaven': { x: 24, y: 72 },
  'South Sacramento': { x: 55, y: 74 },
  'Elk Grove': { x: 58, y: 91 }
};

// Map each post category to a specific distinct color for blips
export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'Curb Alert': '#EF4444', // Red
    'Porch Pickup': '#F97316', // Orange
    'Free Pile / Box': '#F59E0B', // Amber
    'Furniture': '#3B82F6', // Blue
    'Kitchen & Dining': '#10B981', // Emerald
    'Appliances': '#14B8A6', // Teal
    'Clothing & Accessories': '#6366F1', // Indigo
    'Baby & Kids': '#EC4899', // Pink
    'Books & Education': '#8B5CF6', // Violet
    'Electronics & Media': '#06B6D4', // Cyan
    'Garden & Outdoors': '#22C55E', // Green
    'Tools & Hardware': '#71717A', // Zinc
    'Sports & Fitness': '#0EA5E9', // Sky
    'Toys & Games': '#D946EF', // Fuchsia
    'Food & Pantry': '#F43F5E', // Rose
    'Health & Beauty': '#F472B6', // Pink-400
    'Pet Supplies': '#78350F', // Warm Brown
    
    // ISO Category Mappings:
    'Borrow Request': '#EAB308', // Amber / Yellow
    'Household Needed': '#3B82F6', // Blue
    'Furniture Wanted': '#6366F1', // Indigo
    'Appliances Needed': '#14B8A6', // Teal
    'Groceries & Food Needed': '#F43F5E', // Rose
    'Baby & Kids ISO': '#EC4899', // Pink
    'Garden & Tools ISO': '#22C55E', // Green
    'Clothing Needed': '#A855F7', // Purple
    'Electronics / Media Wanted': '#06B6D4', // Cyan
    'Pet Supplies Needed': '#78350F', // Brown
    'Help / Labor Request': '#111827', // Black / Dark Grey
    'Other Seeking Support': '#6B7280', // Grey
    'Other / Custom': '#6B7280'
  };
  return colors[category] || '#FF6A39'; // Buy Nothing orange fallback
};

export default function SacramentoMapView({
  items,
  userProfile,
  selectedType,
  selectedCategory,
  selectedNeighborhood,
  searchTerm,
  onInitiateChat,
  onItemDetail
}: SacramentoMapViewProps) {
  const [selectedPost, setSelectedPost] = useState<ItemPost | null>(null);
  const [showColorGuide, setShowColorGuide] = useState(false);

  // Local overrides in case filters are not controlled by a parent grid
  const [localSearch, setLocalSearch] = useState('');
  const [localType, setLocalType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [localCategory, setLocalCategory] = useState('All Categories');
  const [localNeighborhood, setLocalNeighborhood] = useState('All Neighborhoods');

  const sTerm = searchTerm !== undefined ? searchTerm : localSearch;
  const sType = selectedType !== undefined ? selectedType : localType;
  const sCat = selectedCategory !== undefined ? selectedCategory : localCategory;
  const sNeigh = selectedNeighborhood !== undefined ? selectedNeighborhood : localNeighborhood;

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

  // Distribute points deterministically so multiple posts in the same neighbourhood don't stack directly
  const blipPositions = useMemo(() => {
    const neighborhoodCounts: Record<string, number> = {};
    
    return activeItems.map((item) => {
      // 1. Check if the post features precise custom coordinates parsed from description metadata
      const customCoords = extractGPSCoordinates(item.description);
      if (customCoords) {
        return {
          item,
          x: customCoords.x,
          y: customCoords.y,
          color: getCategoryColor(item.category)
        };
      }

      // 2. Otherwise drop inside standard neighborhood sectors utilizing layout distribution scatter
      const parentCoord = NEIGHBORHOOD_COORDS[item.neighborhood] || { x: 50, y: 50 };
      const currentCount = neighborhoodCounts[item.neighborhood] || 0;
      neighborhoodCounts[item.neighborhood] = currentCount + 1;

      // Deterministic angle and radius based on loop counter and post ID hash code
      let hash = 0;
      for (let i = 0; i < item.id.length; i++) {
        hash = (hash * 13 + item.id.charCodeAt(i)) % 360;
      }
      
      const angle = (hash + currentCount * 73) * (Math.PI / 180);
      // Give spacing spreading outwards with high count
      const radius = currentCount === 0 ? 0 : 3.2 + Math.min(currentCount * 1.5, 7.5); 
      
      // Target offset in percentage units
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      return {
        item,
        x: Math.max(8, Math.min(92, parentCoord.x + dx)),
        y: Math.max(8, Math.min(92, parentCoord.y + dy)),
        color: getCategoryColor(item.category)
      };
    });
  }, [activeItems]);

  return (
    <div id="sacramento_interactive_map_view" className="bg-white border border-zinc-200 p-4 font-sans flex flex-col space-y-4">
      
      {/* Header if self-contained (dedicated Mobile Map View) */}
      {selectedType === undefined && (
        <div className="flex flex-col space-y-1 pb-1.5 border-b border-zinc-150">
          <span className="text-[9px] font-black text-brand-orange uppercase tracking-widest font-mono flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-orange animate-ping"></span>
            Sacramento Sector Map Grid
          </span>
          <h2 className="text-sm font-black text-black uppercase tracking-tight">Interactive Community Coordinates</h2>
        </div>
      )}

      {/* Internal Filter Controls if running in standalone mode */}
      {selectedType === undefined && (
        <div className="bg-zinc-50 border border-zinc-200 p-3.5 space-y-3" id="map_internal_filters">
          <div className="flex flex-col xs:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search pins (e.g. table, books)..."
                className="w-full px-3 py-2 bg-white border border-zinc-200 text-xs text-black font-semibold rounded-none focus:outline-hidden focus:border-black"
                id="map_internal_search_input"
              />
            </div>

            {/* Type buttons */}
            <div className="flex bg-zinc-200 p-0.5 border border-zinc-200 gap-0.5 rounded-none shrink-0" id="map_internal_type_selector">
              <button
                onClick={() => { setLocalType('all'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                  localType === 'all' ? 'bg-black text-white shadow-xs' : 'text-zinc-650 hover:text-black font-bold'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setLocalType('giveaway'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                  localType === 'giveaway' ? 'bg-black text-white shadow-xs' : 'text-zinc-650 hover:text-black font-bold'
                }`}
              >
                Gives
              </button>
              <button
                onClick={() => { setLocalType('looking'); setLocalCategory('All Categories'); }}
                className={`px-3 py-1 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                  localType === 'looking' ? 'bg-black text-white shadow-xs' : 'text-zinc-650 hover:text-black font-bold'
                }`}
              >
                Asks
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5" id="map_internal_dropdowns">
            {/* Category selection */}
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1.5 border border-zinc-200">
              <Tag className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={localCategory}
                onChange={(e) => setLocalCategory(e.target.value)}
                className="w-full bg-transparent text-[11px] text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
                id="map_internal_category_select"
              >
                <option value="All Categories">All Categories</option>
                {localType === 'all' ? (
                  <>
                    <optgroup label="OFFERS / GIFTS" className="text-[9px] bg-zinc-100 uppercase">
                      {ITEM_CATEGORIES.map((c) => (
                        <option key={`map_giv_${c}`} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </optgroup>
                    <optgroup label="ISO / REQUESTS" className="text-[9px] bg-zinc-100 uppercase">
                      {ISO_CATEGORIES.map((c) => (
                        <option key={`map_iso_${c}`} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </optgroup>
                  </>
                ) : localType === 'giveaway' ? (
                  ITEM_CATEGORIES.map((c) => (
                    <option key={`map_giv_only_${c}`} value={c}>{c.toUpperCase()}</option>
                  ))
                ) : (
                  ISO_CATEGORIES.map((c) => (
                    <option key={`map_iso_only_${c}`} value={c}>{c.toUpperCase()}</option>
                  ))
                )}
              </select>
            </div>

            {/* Neighborhood selection */}
            <div className="flex items-center space-x-1.5 bg-white px-2 py-1.5 border border-zinc-200">
              <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
              <select
                value={localNeighborhood}
                onChange={(e) => setLocalNeighborhood(e.target.value)}
                className="w-full bg-transparent text-[11px] text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
                id="map_internal_neighborhood_select"
              >
                <option value="All Neighborhoods">All Sectors</option>
                {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>{n.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5">
        <div>
          <h3 className="text-[11px] font-black text-black uppercase tracking-widest flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-brand-orange animate-pulse"></span>
            Operational Map Center
          </h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5" id="active_pins_count_display">
            Sacramento District Grid • {activeItems.length} active listings
          </p>
        </div>
        <div className="flex items-center space-x-1.5 bg-zinc-50 border border-zinc-200 px-2 py-1 select-none">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider font-mono">NEIGHBORHOOD GPS</span>
        </div>
      </div>

      {/* Map Sandbox Visualizer */}
      <div className="relative w-full aspect-square md:aspect-[4/3] bg-[#FAF9F5] border border-zinc-200 overflow-hidden select-none" id="sacramento_district_grid_canvas">
        {/* River overlays to reflect Sacramento's true geographical signature */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Sacramento River */}
          <path
            d="M 40,0 Q 38,20 34,40 T 26,62 T 28,82 T 22,100"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="2"
            opacity="0.5"
          />
          {/* American River merging */}
          <path
            d="M 100,28 C 85,30 75,25 60,35 T 34,40"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="1.8"
            opacity="0.55"
          />
          
          {/* Main freeway guide indicators for visual reference */}
          {/* Interstate 80 (Northeast corridor) */}
          <path
            d="M 0,22 Q 40,24 80,18 T 100,5"
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="0.8"
            strokeDasharray="1.5,1.5"
          />
          {/* Highway 50 (East corridor) */}
          <path
            d="M 41,40 Q 65,42 100,45"
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="0.8"
            strokeDasharray="1.5,1.5"
          />
          {/* Interstate 5 (North-South corridor) */}
          <path
            d="M 47,0 L 41,40 L 38,56 L 24,72 L 55,74 L 58,100"
            fill="none"
            stroke="#E4E4E7"
            strokeWidth="0.8"
            strokeDasharray="1.5,1.5"
          />
        </svg>

        {/* Legend */}
        <div className="absolute top-2 left-2 bg-white/95 border border-zinc-200 p-2 z-10 space-y-1 shadow-xs max-w-[155px] scale-90 origin-top-left">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block font-mono">Legend</span>
          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-zinc-700">
            <span className="w-2 h-2 rounded-full border border-zinc-950 bg-black"></span>
            <span>GIVEAWAY LIST</span>
          </div>
          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-zinc-700">
            <span className="w-2 h-2 rounded-full border border-zinc-950 bg-white"></span>
            <span>WANTED REQ</span>
          </div>
          
          <button
            onClick={() => setShowColorGuide(true)}
            className="w-full mt-2 text-[8.5px] font-black uppercase tracking-widest bg-brand-orange hover:bg-brand-orange-hover text-white py-1.5 px-2 transition-colors rounded-none cursor-pointer text-center block"
            id="map_show_categories_legend_btn"
          >
            🎨 Map Colors
          </button>

          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-zinc-700 mt-1 pt-1 border-t border-zinc-150">
            <span className="w-2.5 h-1 bg-[#93C5FD] block"></span>
            <span className="uppercase text-[7.5px] text-zinc-450 font-mono">Sac River</span>
          </div>
        </div>

        {/* Category Color Guide Drawer Overlay */}
        <AnimatePresence>
          {showColorGuide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/75 z-40 flex flex-col p-4 overflow-hidden font-sans"
              id="map_category_color_guide_overlay"
            >
              <div className="bg-white border-2 border-black flex-1 flex flex-col p-4 overflow-hidden max-h-full">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-2 mb-3 shrink-0">
                  <div>
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest">Category Colors Index</h4>
                    <p className="text-[8.5px] text-zinc-400 font-bold uppercase tracking-wider block mt-0.5">
                      {selectedType === undefined ? 'Touch color to isolate on map' : 'Color map reference'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowColorGuide(false)}
                    className="p-1 text-zinc-500 hover:text-black cursor-pointer"
                    id="close_color_guide_btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  <div>
                    <h5 className="text-[9px] font-extrabold text-brand-orange uppercase tracking-wider mb-2 font-mono">Gives / Offers Colors</h5>
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
                            className={`flex items-center gap-2 py-1 px-1.5 border rounded-none cursor-pointer transition-all ${
                              isCurrentActive ? 'border-brand-orange bg-orange-50/50' : 'border-transparent hover:border-zinc-200'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: col }} />
                            <span className="truncate uppercase text-[8.5px] font-bold text-zinc-800">{cat}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-zinc-150 pt-3">
                    <h5 className="text-[9px] font-extrabold text-[#78350F] uppercase tracking-wider mb-2 font-mono">Asks / ISO Colors</h5>
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
                            className={`flex items-center gap-2 py-1 px-1.5 border rounded-none cursor-pointer transition-all ${
                              isCurrentActive ? 'border-[#78350F] bg-amber-50/35' : 'border-transparent hover:border-zinc-200'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: col }} />
                            <span className="truncate uppercase text-[8.5px] font-bold text-zinc-800">{cat}</span>
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
                    className="mt-3 w-full bg-black text-white py-1.5 text-[9px] font-black uppercase tracking-widest rounded-none hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                    id="map_clear_colors_filter_btn"
                  >
                    Clear Filter (Show All Map)
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Neighborhood Overlay Bubbles */}
        {SACRAMENTO_NEIGHBORHOODS.map((neighborhood) => {
          const coord = NEIGHBORHOOD_COORDS[neighborhood];
          if (!coord) return null;

          // Count active items in this neighborhood
          const nbCount = activeItems.filter(item => item.neighborhood === neighborhood).length;

          return (
            <div
              key={neighborhood}
              style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none group"
            >
              <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full border border-white" />
              <div className="bg-white/80 border border-zinc-200/50 px-1 py-0.5 mt-0.5 whitespace-nowrap backdrop-blur-xs">
                <span className="text-[7.5px] font-extrabold text-zinc-400 tracking-wider block font-sans uppercase">
                  {neighborhood} {nbCount > 0 && `(${nbCount})`}
                </span>
              </div>
            </div>
          );
        })}

        {/* Pins / Blips Layer */}
        {blipPositions.map(({ item, x, y, color }) => {
          const isSelected = selectedPost?.id === item.id;
          
          return (
            <motion.button
              key={item.id}
              id={`map_blip_${item.id}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => setSelectedPost(item)}
              whileHover={{ scale: 1.25, zIndex: 40 }}
              animate={{
                scale: isSelected ? 1.35 : 1,
                zIndex: isSelected ? 50 : 30
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer outline-none"
              title={`${item.title} (${item.neighborhood})`}
            >
              {/* Ripple Ring */}
              <span
                style={{ borderColor: color }}
                className={`absolute inset-0 rounded-full border opacity-50 block animate-ping`}
              />
              
              {/* Central Blip Core */}
              <div
                style={{ backgroundColor: color }}
                className={`w-3.5 h-3.5 rounded-full border-1.5 shadow-md flex items-center justify-center transition-all ${
                  item.type === 'giveaway' ? 'border-zinc-950' : 'border-white'
                } ${isSelected ? 'ring-2 ring-zinc-950 ring-offset-1' : ''}`}
              >
                {/* Visual marker inside pin */}
                <span className="block w-1.5 h-1.5 rounded-full bg-white opacity-90 scale-90" />
              </div>
            </motion.button>
          );
        })}

        {/* Fallback Empty Guide */}
        {activeItems.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-50/80 backdrop-blur-xs">
            <MapPin className="w-8 h-8 text-zinc-300 animate-bounce mb-2" />
            <h4 className="text-[10px] font-black text-black uppercase tracking-widest">No Active Pins Visualized</h4>
            <p className="text-[9.5px] text-zinc-400 font-bold uppercase tracking-wider max-w-xs mt-1 leading-normal">
              Adjust search filters or create a new post to drop coordinates on Sacramento!
            </p>
          </div>
        )}
      </div>

      {/* Selected Blip Mini Card Slide Panel */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            id="map_item_detail_card"
            className="border-2 border-black bg-[#FFFDF9] p-4 relative font-sans"
          >
            {/* Close buttons */}
            <button
              id="close_map_card_btn"
              onClick={() => setSelectedPost(null)}
              className="absolute top-3 right-3 text-zinc-400 hover:text-black transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-4">
              {/* Cargo Image preview */}
              {selectedPost.imageUrl ? (
                <div className="w-18 h-18 sm:w-24 sm:h-24 border border-zinc-200 shrink-0 bg-white">
                  <img
                    src={selectedPost.imageUrl}
                    alt={selectedPost.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-none"
                  />
                </div>
              ) : (
                <div className="w-18 h-18 sm:w-24 sm:h-24 bg-zinc-100 border border-zinc-200 shrink-0 flex flex-col items-center justify-center text-center">
                  <Tag className="w-5 h-5 text-zinc-400" />
                  <span className="text-[6.5px] text-zinc-400 font-bold tracking-widest mt-1 block">NO CARGO</span>
                </div>
              )}

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider ${
                      selectedPost.type === 'giveaway' ? 'bg-black text-white' : 'bg-white border border-black text-black'
                    }`}>
                      {selectedPost.type === 'giveaway' ? 'GIVEAWAY' : 'WANTED'}
                    </span>
                    <span className="text-[8.5px] font-black font-mono uppercase tracking-wider" style={{ color: getCategoryColor(selectedPost.category) }}>
                      {selectedPost.category}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-black text-black uppercase tracking-tight mt-1 line-clamp-1 break-words">
                    {selectedPost.title}
                  </h4>

                  <p className="text-[10.5px] text-zinc-550 mt-1 line-clamp-2 leading-tight break-words font-semibold font-sans">
                    {selectedPost.description}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-150 flex-wrap gap-2.5">
                  <div className="flex items-center space-x-1 text-[10px] font-extrabold text-black uppercase">
                    <MapPin className="w-3.5 h-3.5 text-brand-orange shrink-0" />
                    <span>{selectedPost.neighborhood}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      id="map_dispatch_btn"
                      onClick={() => onInitiateChat(selectedPost.userId, selectedPost.userDisplayName, selectedPost.userPhotoURL, selectedPost)}
                      className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[9.5px] font-black uppercase tracking-wider rounded-none inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Dispatch</span>
                    </button>
                    {onItemDetail && (
                      <button
                        id="map_view_card_btn"
                        onClick={() => onItemDetail(selectedPost)}
                        className="px-3 py-1.5 bg-black hover:bg-zinc-900 text-white text-[9.5px] font-black uppercase tracking-wider rounded-none inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
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
