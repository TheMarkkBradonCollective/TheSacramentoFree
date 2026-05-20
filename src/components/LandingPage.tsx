import React, { useState } from 'react';
import { 
  Gift, 
  Heart, 
  MessageSquare, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Recycle, 
  Box, 
  Compass, 
  ChevronRight, 
  Users, 
  HelpCircle, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';

interface LandingPageProps {
  onGoogleLogin: () => void;
  onGuestLogin: () => void;
  errorMsg?: string;
}

const SAMPLE_ITEMS = [
  {
    id: 's1',
    title: 'Meyer Lemon Garden Cuttings',
    category: 'Garden & Fresh Food',
    type: 'giveaway',
    neighborhood: 'East Sacramento',
    description: 'Pruned this morning from our mature organic sweet lemon tree. Great for tea or cooking! Come pick up on front porch steps.',
    user: 'Amelia G.',
    badge: 'Organic Harvest'
  },
  {
    id: 's2',
    title: 'Heavy Solid Wood Bookcase',
    category: 'Furniture',
    type: 'giveaway',
    neighborhood: 'Land Park',
    description: 'Sturdy standard pine-wood bookshelf. A few minor cosmetic surface scuffs but holds heavy books easily. Pick up must be contactless.',
    user: 'Marcus R.',
    badge: 'Sturdy Pine'
  },
  {
    id: 's3',
    title: 'ISO: Stroller in working condition',
    category: 'Kids & Baby',
    type: 'looking',
    neighborhood: 'Midtown',
    description: 'Looking for a clean, compact toddler stroller for morning walks. Will happily pickup anywhere in Sacramento!',
    user: 'Chloe T.',
    badge: 'In Search Of'
  },
  {
    id: 's4',
    title: 'Vitamix 5200 Blender & Pitcher',
    category: 'Kitchenware',
    type: 'giveaway',
    neighborhood: 'Natomas',
    description: 'Extremely strong commercial-grade motor! Runs like absolute powerhouse. Upgraded to a compact model and parting with this gem.',
    user: 'David K.',
    badge: 'Premium Gift'
  },
  {
    id: 's5',
    title: 'ISO: Pastels or Colored Paint Cans',
    category: 'Home & DIY',
    type: 'looking',
    neighborhood: 'Pocket',
    description: 'Any leftover indoor paints in green, blue, yellow or pastel shades for a backyard fence art project. Small quantities completely okay!',
    user: 'Elena S.',
    badge: 'Creative Reuse'
  }
];

const NEIGHBORHOODS_METADATA = [
  {
    name: 'Midtown',
    bio: 'Urban tree-lined avenues, micro-apartments, and dense neighborhoods. The perfect district for fast, walkable porch pickups, bike tool sharing, and potted houseplant cuttings.',
    popular: 'Indoor Plants, Kitchenware, Books, Compact Furniture',
    activeCount: '240 community members'
  },
  {
    name: 'East Sacramento',
    bio: 'Famed for beautiful gardens, heritage houses, and family-friendly park interactions. Highly active for garden surplus, premium tools, infant supplies, and outdoor activities.',
    popular: 'Fresh Fruits/Veg, Tool Swaps, Baby Clothes, Garden Seeds',
    activeCount: '185 community members'
  },
  {
    name: 'Land Park',
    bio: 'Historic core residential zone flanking the zoo and massive community parks. Famous for passing down toys, vintage hardcovers, baking supplies, and sports upgrades.',
    popular: 'Sourdough Starters, Board Games, Kids Toys, Hardcover Fiction',
    activeCount: '150 community members'
  },
  {
    name: 'Natomas',
    bio: 'A sprawling modern cluster of growing neighborhoods. Excellent activity for tech accessories, extra sports gears, home organization bins, and baby crib accessories.',
    popular: 'Computer Accessories, Clean Baby Gear, Exercise Outfits, Shelving Units',
    activeCount: '190 community members'
  },
  {
    name: 'Pocket',
    bio: 'Peaceful riverbend neighborhood with a deep sense of recycling and nature care. Local exchange highlights elder assistance tools, fishing gear, and citrus collections.',
    popular: 'Citrus Bounties, Mobility Tools, Fishing Hardware, Craft Materials',
    activeCount: '120 community members'
  }
];

export default function LandingPage({ onGoogleLogin, onGuestLogin, errorMsg }: LandingPageProps) {
  const [activeItemTypeTab, setActiveItemTypeTab] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedNeighborhoodIndex, setSelectedNeighborhoodIndex] = useState(0);

  const filteredItems = SAMPLE_ITEMS.filter(item => {
    if (activeItemTypeTab === 'all') return true;
    return item.type === activeItemTypeTab;
  });

  const featuredNeighborhood = NEIGHBORHOODS_METADATA[selectedNeighborhoodIndex];

  return (
    <div id="landing_page_root" className="min-h-screen flex flex-col justify-between bg-white text-black font-sans selection:bg-[#276EF1]/20">
      
      {/* 1. Header/Navigation Bar - Minimalist Style (Stark borders & crisp lines) */}
      <nav className="border-b border-zinc-200 bg-white sticky top-0 z-45 px-4 sm:px-6 lg:px-8" id="landing_navbar">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-black text-white rounded-none flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-widest text-black uppercase block leading-none font-display">
                BUY<span className="text-[#276EF1]">NOTHING</span>
              </span>
              <span className="text-[8.5px] font-black text-zinc-500 tracking-widest uppercase font-mono block mt-0.5">
                SACRAMENTO FREE EXCHANGE
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onGuestLogin}
              id="landing_header_guest_login_btn"
              className="px-3 py-2 text-[10px] font-black border border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-none transition-colors cursor-pointer select-none tracking-widest uppercase"
              title="Workaround Google Sign-in popup issues inside iframe"
            >
              GUEST ACCESS
            </button>
            <button
              onClick={onGoogleLogin}
              id="landing_header_google_login_btn"
              className="px-4 py-2 text-[10px] font-black bg-black hover:bg-zinc-800 text-white rounded-none transition-colors cursor-pointer inline-flex items-center space-x-1.5 tracking-widest uppercase"
            >
              <span>GOOGLE LOGIN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Presentation (Stark Typography Layout) */}
      <section className="relative px-4 pt-16 pb-16 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6" id="hero_section">
        <div className="inline-flex items-center space-x-2 bg-zinc-100 border border-zinc-200 text-black py-1.5 px-4 text-[10px] font-black tracking-widest uppercase font-mono">
          <Sparkles className="w-3.5 h-3.5 text-[#276EF1]" />
          <span>ZERO-WASTE PILE — 100% COMMUNITY OWNED</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6.5xl font-black text-black tracking-tight leading-none uppercase font-display">
          Go zero-waste.<br />
          <span className="text-[#276EF1]">Give freely.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-650 leading-relaxed max-w-2xl mx-auto font-medium">
          A premium, high-efficiency neighborhood ledger for Sacramento residents. Connect with vetted neighboring homes to match off unused items, excess home gear, or fresh garden crops. Zero cash, zero barters, absolute high-quality sharing.
        </p>

        {errorMsg && (
          <div className="mx-auto max-w-lg p-4 bg-red-50 text-red-700 text-xs text-left font-bold rounded-none border border-red-200 space-y-1.5" id="landing_error_overlay">
            <p className="flex items-center gap-1.5 uppercase font-mono text-[10px] tracking-wider text-red-800">
              <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              AUTHENTICATION DETOUR REQUIRED
            </p>
            <p>{errorMsg}</p>
            <p className="text-[10px] text-zinc-650 font-semibold leading-relaxed">
              💡 <strong>IFrame Sandbox Tip:</strong> Standard social login popups can be blocked by browsers inside secure sandboxed previews. Simply click the <strong>Quick Guest Portal Pass</strong> below to join immediately with a verified neighbor identifier!
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3.5 pt-4 max-w-xl mx-auto">
          <button
            id="hero_cta_login_btn"
            onClick={onGoogleLogin}
            className="flex-1 px-6 py-4 bg-black hover:bg-zinc-900 text-white rounded-none text-[10.5px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors cursor-pointer select-none"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-4 h-4 bg-white rounded-none p-0.5 shrink-0"
            />
            <span>CONTINUE WITH GOOGLE</span>
          </button>

          <button
            id="hero_cta_guest_login_btn"
            onClick={onGuestLogin}
            className="flex-1 px-6 py-4 border-2 border-dashed border-[#276EF1] bg-white hover:bg-blue-50/50 text-[#276EF1] rounded-none text-[10.5px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all cursor-pointer select-none shadow-3xs"
          >
            <Sparkles className="w-4 h-4 text-[#276EF1] animate-pulse shrink-0" />
            <span>QUICK GUEST PORTAL PASS</span>
          </button>
        </div>

        {/* 3. Community Stats Badge - Clean Layout */}
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-10 text-center" id="stats_panel">
          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-none">
            <span className="block text-2xl font-black text-black leading-none font-display">1,820 LBS</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mt-1.5 font-mono">Diverted Trash</span>
          </div>
          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-none">
            <span className="block text-2xl font-black text-black leading-none font-display">640 ROOMS</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mt-1.5 font-mono">Porch Pickups</span>
          </div>
          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-none">
            <span className="block text-2xl font-black text-black leading-none font-display">0.00 USD</span>
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold block mt-1.5 font-mono">Cost Forever</span>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Preview Filter (Grid Look) */}
      <section className="px-4 py-12 max-w-7xl mx-auto w-full space-y-8 bg-zinc-50 border border-zinc-200 rounded-none my-8 shadow-xs" id="live_previews">
        <div className="text-center space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#276EF1] font-mono">LIVE MATCHMAKER</span>
          <h2 className="text-2xl font-black text-black tracking-tight uppercase font-display">Live Exchange Ledger</h2>
          <p className="text-xs font-semibold text-zinc-500">Instant views of verified equipment, items, and crops shared globally</p>
        </div>

        {/* Filter Toggle in Stark Selectors */}
        <div className="flex justify-center space-x-1" id="preview_filters">
          {(['all', 'giveaway', 'looking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveItemTypeTab(tab)}
              className={`px-5 py-2.5 text-xs font-black tracking-widest uppercase transition-all cursor-pointer rounded-none border ${
                activeItemTypeTab === tab 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200'
              }`}
            >
              {tab === 'all' ? 'All Listings' : tab === 'giveaway' ? 'Giveaways' : 'Wanted Requests'}
            </button>
          ))}
        </div>

        {/* Card slider / Grid list - Clean grid style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="preview_grid">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-none border border-zinc-200 hover:border-black shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-56 relative group"
              id={`mock_item_${item.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest border ${
                    item.type === 'giveaway' 
                      ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20' 
                      : 'bg-indigo-500/10 text-indigo-800 border-indigo-500/20'
                  }`}>
                    {item.type === 'giveaway' ? 'Gifting Offer' : 'Wanted Request'}
                  </span>
                  <span className="text-[9px] font-black text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 flex items-center space-x-1 uppercase tracking-wider">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{item.neighborhood}</span>
                  </span>
                </div>

                <h3 className="text-sm font-black text-black leading-tight group-hover:text-[#276EF1] transition-colors uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="border-t border-zinc-100 pt-3.5 flex items-center justify-between mt-auto">
                <span className="text-[9.5px] font-mono font-medium text-zinc-400">Ledger by {item.user}</span>
                <span className="text-[9px] font-black text-black uppercase tracking-widest bg-zinc-100 px-1.5 py-0.5 border border-zinc-200">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={onGoogleLogin}
            className="inline-flex items-center space-x-1.5 text-xs font-black text-[#276EF1] hover:text-[#1953ca] uppercase tracking-widest cursor-pointer transition-all"
          >
            <span>Start an dispatch or claim items — Join the network</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. How It Works Timeline (Stark minimal card blocks) */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full space-y-12" id="how_it_works_section">
        <div className="text-center space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#276EF1] bg-blue-50 border border-blue-100 px-3 py-1 font-mono">VERIFIED STANDARD PIPELINE</span>
          <h2 className="text-2xl font-black text-black tracking-tight uppercase font-display">System Architecture</h2>
          <p className="text-xs font-semibold text-zinc-500 max-w-sm mx-auto">Three elementary stages keeping resource cycles fluid with zero friction.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="steps_timeline">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 text-center space-y-4 shadow-3xs hover:border-zinc-400 transition-colors">
            <div className="mx-auto w-11 h-11 bg-black text-white rounded-none flex items-center justify-center font-black text-sm">
              01
            </div>
            <h3 className="text-xs font-black text-black uppercase tracking-widest">DISPATCH ENTRY</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-semibold">
              Log in securely, lock into your closest Sacramento borough, and submit items directly to the decentralized local database.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 text-center space-y-4 shadow-3xs hover:border-zinc-400 transition-colors">
            <div className="mx-auto w-11 h-11 bg-black text-white rounded-none flex items-center justify-center font-black text-sm">
              02
            </div>
            <h3 className="text-xs font-black text-black uppercase tracking-widest">COORDINATE MATCH</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-semibold">
              Instantly chat through the unified web communicator. Share exact pickup windows and pass along contactless porch instructions.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 text-center space-y-4 shadow-3xs hover:border-zinc-400 transition-colors">
            <div className="mx-auto w-11 h-11 bg-[#276EF1] text-white rounded-none flex items-center justify-center font-black text-sm">
              03
            </div>
            <h3 className="text-xs font-black text-black uppercase tracking-widest">PROPULSION CLAIM</h3>
            <p className="text-xs text-zinc-550 leading-relaxed font-semibold">
              Safely collect from the designated pickup threshold. Enjoy your zero-cost items and extend materials lifespan safely.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Interactive Neighborhood District Hub Explorer */}
      <section className="px-4 py-12 max-w-5xl mx-auto w-full space-y-8" id="neighborhood_district_explorer">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-black tracking-tight uppercase font-display">COMMUNITY SECTORS</h2>
          <p className="text-xs font-semibold text-zinc-500">Direct regional routing across Sacramento core sections</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch" id="explorer_layout">
          {/* Neighborhood Selection Rail */}
          <div className="md:col-span-4 flex md:flex-col overflow-x-auto md:overflow-x-visible gap-2 p-1" id="selection_rail">
            {NEIGHBORHOODS_METADATA.map((district, idx) => {
              const isSelected = selectedNeighborhoodIndex === idx;
              return (
                <button
                  key={district.name}
                  onClick={() => setSelectedNeighborhoodIndex(idx)}
                  className={`px-4 py-3.5 rounded-none text-xs font-black text-left transition-all shrink-0 cursor-pointer flex items-center justify-between w-full border ${
                    isSelected 
                      ? 'bg-black text-white border-black shadow-sm' 
                      : 'bg-white hover:bg-zinc-50 text-zinc-800 border-zinc-200'
                  }`}
                >
                  <span className="flex items-center space-x-2.5 uppercase tracking-wider">
                    <MapPin className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#276EF1]'}`} />
                    <span>{district.name}</span>
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 hidden md:block ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                </button>
              );
            })}
          </div>

          {/* District Highlights details panel */}
          <div className="md:col-span-8 bg-zinc-50 p-6 rounded-none border border-zinc-200 flex flex-col justify-between" id="district_bio_card">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <h3 className="text-base font-black text-black uppercase tracking-wide font-display">
                  {featuredNeighborhood.name} sector
                </h3>
                <span className="text-[9px] font-mono tracking-widest uppercase font-black text-black bg-white border border-zinc-200 px-2.5 py-1">
                  {featuredNeighborhood.activeCount}
                </span>
              </div>

              <p className="text-xs text-zinc-650 leading-relaxed font-semibold italic">
                "{featuredNeighborhood.bio}"
              </p>

              <div className="p-4 bg-white border border-zinc-200" id="popular_exchanges_badge">
                <span className="block text-[8px] font-black uppercase tracking-widest text-[#276EF1] font-mono mb-1.5">frequent listings:</span>
                <p className="text-xs text-black font-bold leading-relaxed">{featuredNeighborhood.popular}</p>
              </div>
            </div>

            <button 
              onClick={onGoogleLogin}
              className="mt-6 w-full py-3 bg-white hover:bg-zinc-50 border border-black text-black text-xs font-black uppercase tracking-widest rounded-none transition-colors cursor-pointer text-center"
            >
              LOG IN TO JOIN {featuredNeighborhood.name.toUpperCase()} SECTOR
            </button>
          </div>
        </div>
      </section>

      {/* 7. Zero-Waste Philosophy / Community Bill of Rights */}
      <section className="px-4 py-8 max-w-4xl mx-auto w-full text-center" id="philosophy_rules">
        <div className="bg-white p-6 rounded-none border border-zinc-200 space-y-3.5">
          <div className="flex justify-center items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#276EF1]" />
            <span className="text-xs font-black tracking-widest uppercase font-mono text-black">ABSOLUTE PUBLIC INTEREST TRUST</span>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl mx-auto font-medium">
            This platform protects the perfect circular exchange of goods without credit. We enforce a zero commercialized standard: NO sales, NO swaps, NO barters, and NO solicitations. Users must respect their community sectors, communicate transparently, and follow safety protocols to maintain general logistics harmony.
          </p>
        </div>
      </section>

      {/* 8. Call To Action Footer Section */}
      <section className="bg-black text-white mt-12 py-16 px-4 text-center relative overflow-hidden" id="call_to_action">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="w-11 h-11 bg-[#276EF1] text-white rounded-none flex items-center justify-center mx-auto mb-4">
            <Heart className="w-5.5 h-5.5 fill-current" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-display">Begin sharing today</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed font-semibold">
            Integrate with neighborhood routers immediately. View correct addresses and dispatch item transfers within 10 seconds.
          </p>

          <button
            onClick={onGoogleLogin}
            className="mx-auto w-full max-w-xs py-4 px-6 rounded-none font-black text-xs uppercase tracking-widest bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black shadow-lg inline-flex items-center justify-center space-x-3 transition-colors cursor-pointer"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Icon"
              className="w-4.5 h-4.5"
            />
            <span>AUTHENTICATE WITH GOOGLE</span>
          </button>

          <p className="text-[9px] text-[#276EF1] font-black uppercase tracking-widest font-mono">
            SACRAMENTO COUNTY VERIFIED LOGISTIC STREAMS
          </p>
        </div>
      </section>

      {/* 9. Minimal humblest credit line */}
      <footer className="py-6 text-center text-[9.5px] text-zinc-400 font-mono font-black border-t border-zinc-200 bg-zinc-50" id="landing_minimal_footer">
        <span>© {new Date().getFullYear()} SACRAMENTO BUY NOTHING LOCAL OPERATIONAL HUB. REDUCING MUNICIPAL WASTE FLOW.</span>
      </footer>

    </div>
  );
}
