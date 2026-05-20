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

export default function LandingPage({ onGoogleLogin, errorMsg }: LandingPageProps) {
  const [activeItemTypeTab, setActiveItemTypeTab] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedNeighborhoodIndex, setSelectedNeighborhoodIndex] = useState(0);

  const filteredItems = SAMPLE_ITEMS.filter(item => {
    if (activeItemTypeTab === 'all') return true;
    return item.type === activeItemTypeTab;
  });

  const featuredNeighborhood = NEIGHBORHOODS_METADATA[selectedNeighborhoodIndex];

  return (
    <div id="landing_page_root" className="min-h-screen flex flex-col justify-between font-sans">
      
      {/* 1. Header/Navigation Bar */}
      <nav className="border-b border-white/20 bg-white/40 backdrop-blur-xs top-0 sticky z-40 px-4 sm:px-6 lg:px-8" id="landing_navbar">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg">
              <Gift className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-800 block leading-tight">Sacramento BuyNothing</span>
              <span className="text-[9px] font-bold text-emerald-700 tracking-widest uppercase font-mono">Zero-Waste Community</span>
            </div>
          </div>

          <button
            onClick={onGoogleLogin}
            className="px-4 py-2 text-xs font-bold bg-white/70 hover:bg-white text-slate-800 rounded-full border border-white/60 shadow-xs transition-all cursor-pointer inline-flex items-center space-x-1.5"
          >
            <span>Sign In</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* 2. Hero Presentation */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6" id="hero_section">
        <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-full py-1 px-3.5 text-[10.5px] font-bold tracking-wider uppercase font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Local Gifting Network — 100% Free</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-tight uppercase font-sans">
          Share Bountifully.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Give Freely.</span>
        </h1>

        <p className="text-sm md:text-base text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
          A lovely localized neighborhood exchange for Sacramento residents. Connect with neighbors directly to gift extra kitchenware, garden produce, and furniture, or request items you truly need—absolutely zero money, credit, or barters allowed.
        </p>

        {errorMsg && (
          <div className="mx-auto max-w-md p-3 bg-red-500/10 text-red-700 text-xs font-semibold rounded-xl border border-red-500/20" id="landing_error_overlay">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
          <button
            id="hero_cta_login_btn"
            onClick={onGoogleLogin}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer hover:shadow-emerald-600/15"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-4 h-4 bg-white rounded-xs p-0.5"
            />
            <span>Join with Google</span>
          </button>
          
          <a
            href="#how_it_works_section"
            className="text-xs font-bold text-slate-650 hover:text-slate-800 py-3 px-4 rounded-full hover:bg-white/30 transition-all uppercase tracking-wide"
          >
            Learn How It Works
          </a>
        </div>

        {/* 3. Community Stats Badge */}
        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto pt-8 text-center" id="stats_panel">
          <div className="p-4 glass rounded-2xl border border-white/50 shadow-sm">
            <span className="block text-xl font-black text-emerald-800 leading-tight">1,820+</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Pounds Diverted</span>
          </div>
          <div className="p-4 glass rounded-2xl border border-white/50 shadow-sm">
            <span className="block text-xl font-black text-emerald-800 leading-tight">640+</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Porch Pickups</span>
          </div>
          <div className="p-4 glass rounded-2xl border border-white/50 shadow-sm">
            <span className="block text-xl font-black text-emerald-800 leading-tight">100%</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">No Money/Fees</span>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Preview Filter (See what neighbors are gift/trading) */}
      <section className="px-4 py-12 max-w-7xl mx-auto w-full space-y-8 bg-white/20 backdrop-blur-xs rounded-3xl border border-white/40 my-8 shadow-sm" id="live_previews">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Recent Exchange Activity</h2>
          <p className="text-xs font-bold text-slate-500">Live snippets of items currently gifted by verified Sacramento neighbors</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex justify-center space-x-2" id="preview_filters">
          {(['all', 'giveaway', 'looking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveItemTypeTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
                activeItemTypeTab === tab 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-white/40 hover:bg-white/70 text-slate-700 border border-white/60'
              }`}
            >
              {tab === 'all' ? 'All Snippets' : tab === 'giveaway' ? '🌱 Giveaways' : '🔍 Requests'}
            </button>
          ))}
        </div>

        {/* Card slider / Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="preview_grid">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="glass p-5 rounded-3xl border border-white/60 shadow-md hover:shadow-xl transition-all hover:scale-[1.01] flex flex-col justify-between h-52 relative group overflow-hidden"
              id={`mock_item_${item.id}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                    item.type === 'giveaway' 
                      ? 'bg-emerald-500/15 text-emerald-800 border border-emerald-500/20' 
                      : 'bg-indigo-500/15 text-indigo-800 border border-indigo-500/20'
                  }`}>
                    {item.type === 'giveaway' ? 'Gifting' : 'In Search Of'}
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-600 bg-white/85 px-2 py-0.5 rounded-full shadow-3xs flex items-center space-x-1">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>{item.neighborhood}</span>
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-slate-650 mt-1.5 leading-relaxed line-clamp-3">
                  {item.description}
                </p>
              </div>

              <div className="border-t border-white/30 pt-3 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-mono font-bold text-slate-500">Shared by {item.user}</span>
                <span className="text-[9.5px] font-bold text-emerald-800 uppercase tracking-wide bg-emerald-500/10 px-1.5 rounded-sm">
                  {item.badge}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={onGoogleLogin}
            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer transition-all hover:translate-x-0.5"
          >
            <span>Have something to give or need a swap? Log in to create your listing</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. How It Works Timeline */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full space-y-12" id="how_it_works_section">
        <div className="text-center space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-500/10 px-2.5 py-1 rounded-full font-mono">Simple & Verified Flow</span>
          <h2 className="text-2xl font-black text-slate-905 tracking-tight uppercase">How Sacramento BuyNothing Works</h2>
          <p className="text-xs font-bold text-slate-550 max-w-sm mx-auto">Three elementary steps to build community trust and reduce local municipal waste.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative" id="steps_timeline">
          {/* Step 1 */}
          <div className="glass p-6 rounded-3xl border border-white/60 text-center space-y-4 shadow-sm relative">
            <div className="mx-auto w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-lg">
              1
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Post Offer or Request</h3>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Log in with your Google account, join your closest Sacramento neighborhood group, and post items you have to give away or items you are in search of.
            </p>
          </div>

          {/* Step 2 */}
          <div className="glass p-6 rounded-3xl border border-white/60 text-center space-y-4 shadow-sm">
            <div className="mx-auto w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-lg cursor-default">
              2
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Coordinate via Inbox</h3>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Chat directly with neighborhood applicants through the secure localized chat inbox. Exchange specifics, request photos, or schedule direct pickup.
            </p>
          </div>

          {/* Step 3 */}
          <div className="glass p-6 rounded-3xl border border-white/60 text-center space-y-4 shadow-sm">
            <div className="mx-auto w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-lg">
              3
            </div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Contactless Porch Pickup</h3>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Leave items safely on your porch, steps, or garden side for a contactless drop-free transfer of ownership. Say goodbye to clutter, waste, and expenses!
            </p>
          </div>
        </div>
      </section>

      {/* 6. Interactive Neighborhood District Hub Explorer */}
      <section className="px-4 py-12 max-w-5xl mx-auto w-full space-y-8" id="neighborhood_district_explorer">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Sacramento District Hubs</h2>
          <p className="text-xs font-bold text-slate-550">We group exchanges around iconic neighborhoods. Explore some below:</p>
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
                  className={`px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all shrink-0 cursor-pointer flex items-center justify-between w-full ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-lg' 
                      : 'bg-white/40 hover:bg-white/70 text-slate-800 border border-white/60'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <MapPin className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                    <span>{district.name}</span>
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 hidden md:block ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>

          {/* District Highlights details panel */}
          <div className="md:col-span-8 glass p-6 rounded-3xl border border-white/60 flex flex-col justify-between shadow-md" id="district_bio_card">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/35 pb-3">
                <h3 className="text-lg font-black text-slate-900 uppercase">
                  {featuredNeighborhood.name} Sector
                </h3>
                <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-800 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                  {featuredNeighborhood.activeCount}
                </span>
              </div>

              <p className="text-xs text-slate-705 leading-relaxed font-semibold italic">
                "{featuredNeighborhood.bio}"
              </p>

              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/15" id="popular_exchanges_badge">
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-800 font-mono mb-1">Frequently Traded:</span>
                <p className="text-xs text-slate-800 font-bold leading-relaxed">{featuredNeighborhood.popular}</p>
              </div>
            </div>

            <button 
              onClick={onGoogleLogin}
              className="mt-6 w-full py-2.5 px-4 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer text-center uppercase"
            >
              Sign up or sign in to join {featuredNeighborhood.name} sector
            </button>
          </div>
        </div>
      </section>

      {/* 7. Zero-Waste Philosophy / Community Bill of Rights */}
      <section className="px-4 py-8 max-w-4xl mx-auto w-full text-center" id="philosophy_rules">
        <div className="glass p-6 rounded-3xl border border-white/50 space-y-4">
          <div className="flex justify-center space-x-1">
            <ShieldAlert className="w-5 h-5 text-tomato-500 text-emerald-600" />
            <span className="text-xs font-bold text-slate-900 tracking-wider uppercase font-mono">Our Absolute Philosophy of Giving</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed max-w-2xl mx-auto font-medium">
            Sacramento BuyNothing maintains the purity of gift-based community building. This is <span className="font-bold underline text-emerald-700">not</span> a swap meet, a barter site, or a buying group. Everything listed here is 100% free with no strings, reciprocation, or follow up requested. All members must treat neighbors with extreme respect, and contactless swaps should be strictly public, safe, and honest.
          </p>
        </div>
      </section>

      {/* 8. Call To Action Footer Section */}
      <section className="bg-emerald-900 mt-12 py-16 px-4 text-center text-white/90 relative overflow-hidden" id="call_to_action">
        {/* Subtle circles */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-700/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-teal-705/10 rounded-full blur-2.5xl pointer-events-none" />

        <div className="max-w-xl mx-auto space-y-6">
          <div className="w-12 h-12 bg-white text-emerald-800 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <Heart className="w-6 h-6 animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">Join your neighbors today</h2>
          <p className="text-xs text-emerald-100 max-w-md mx-auto leading-relaxed font-semibold">
            By signing in, you immediately connect with your neighbors, view exact addresses for porches, and participate in reducing waste. Sign-in takes 10 seconds.
          </p>

          <button
            onClick={onGoogleLogin}
            className="mx-auto w-full max-w-xs py-4 px-6 rounded-full font-black text-xs uppercase tracking-wider bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-950 shadow-xl inline-flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Icon"
              className="w-4.5 h-4.5"
            />
            <span>Register or Sign In with Google</span>
          </button>

          <p className="text-[10px] text-emerald-200/70 font-bold uppercase tracking-wider font-mono">
            Sacramento County Verified Neighborhoods
          </p>
        </div>
      </section>

      {/* 9. Minimal humblest credit line */}
      <footer className="py-6 text-center text-[10px] text-slate-500 font-mono font-bold border-t border-white/20 bg-white/10" id="landing_minimal_footer">
        <span>© {new Date().getFullYear()} Sacramento BuyNothing Group. Entirely Free & Open-source zero-waste initiative.</span>
      </footer>

    </div>
  );
}
