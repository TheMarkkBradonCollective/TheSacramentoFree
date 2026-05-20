import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  User,
  Lock,
  Mail,
  Info,
  AlertCircle
} from 'lucide-react';
import { SACRAMENTO_NEIGHBORHOODS } from '../types';
import { getSupabaseItems } from '../supabase';

interface LandingPageProps {
  onEmailSignIn: (email: string, password: string) => Promise<boolean>;
  onEmailSignUp: (email: string, password: string, displayName: string, neighborhood: string, bio: string) => Promise<boolean>;
  onGuestLogin: () => void;
  errorMsg?: string;
  isAuthLoading?: boolean;
}

const NEIGHBORHOODS_METADATA = [
  {
    name: 'Midtown',
    bio: 'Urban tree-lined avenues, micro-apartments, and dense neighborhoods. The perfect district for fast, walkable porch pickups, bike tool sharing, and potted houseplant cuttings.',
    popular: 'Indoor Plants, Kitchenware, Books, Compact Furniture',
    activeCount: '240 members'
  },
  {
    name: 'Downtown',
    bio: 'Sacramento historic commercial center and capital core. Ideal for quick handoffs, office supply rehoming, commuting swaps, and apartment decor exchanges.',
    popular: 'Electronics, Books, Travel Gear, Office Storage',
    activeCount: '150 members'
  },
  {
    name: 'East Sacramento',
    bio: 'Famed for beautiful gardens, heritage houses, and family-friendly park interactions. Highly active for garden surplus, premium tools, infant supplies, and outdoor activities.',
    popular: 'Fresh Fruits/Veg, Tool Swaps, Baby Clothes, Garden Seeds',
    activeCount: '185 members'
  },
  {
    name: 'Land Park',
    bio: 'Historic core residential zone flanking the zoo and massive community parks. Famous for passing down toys, vintage hardcovers, baking supplies, and sports upgrades.',
    popular: 'Sourdough Starters, Board Games, Kids Toys, Hardcover Fiction',
    activeCount: '170 members'
  },
  {
    name: 'Oak Park',
    bio: 'A highly collaborative historic community with robust community gardens and creative reuse initiatives. Excellent spot for diy craft materials and youth sports equipment.',
    popular: 'Pastel Paints, Sewing Tools, Children Shoes, Fresh Cuttings',
    activeCount: '145 members'
  },
  {
    name: 'Natomas',
    bio: 'A sprawling modern cluster of growing neighborhoods. Excellent activity for tech accessories, extra sports gears, home organization bins, and baby crib accessories.',
    popular: 'Computer Accessories, Clean Baby Gear, Exercise Outfits, Shelving Units',
    activeCount: '190 members'
  },
  {
    name: 'Elk Grove',
    bio: 'Spacious suburban residential sector with active home cooperatives. High-density sharing of large household goods, backyard tools, and play structures.',
    popular: 'Pruning Shears, Patio Chairs, Lawn Equipment, Baby Walkers',
    activeCount: '210 members'
  },
  {
    name: 'Arden',
    bio: 'Central residential sector with a wide range of home garden active members. Famous for rehoming kitchen gear, power equipment, and holiday decorations.',
    popular: 'Kitchen Blenders, Hand Tools, Holiday Supplies, Storage Chests',
    activeCount: '160 members'
  },
  {
    name: 'Citrus Heights',
    bio: 'Active perimeter community focused on reducing municipal waste and recycling. High turnover of wooden cabinetry, outdoor tools, and fitness gear.',
    popular: 'Wooden Shelves, Dumbbell Weights, Leaf Blowers, Board Games',
    activeCount: '130 members'
  },
  {
    name: 'Rancho Cordova',
    bio: 'Collaborative family-first communities flanking the American River. Incredible resource for river gear, camping spares, and children outfits.',
    popular: 'Inflatable Kayaks, Sleep Bags, St strollers, Board Books',
    activeCount: '135 members'
  },
  {
    name: 'West Sacramento',
    bio: 'Just across the river, active in river district exchanges. Energetic sharing of gardening logs, fresh citrus harvests, and tool shed spares.',
    popular: 'Oranges, Wood Pallets, Folding Tables, Drills',
    activeCount: '115 members'
  },
  {
    name: 'South Sacramento',
    bio: 'Diverse, highly welcoming neighborhoods focused on immediate mutual aid. Excellent place for food pantries, home electronics, and childrens apparel.',
    popular: 'Unopened Canine Food, Warm Jackets, Rice Cookers, Play Materials',
    activeCount: '180 members'
  }
];

export default function LandingPage({ onEmailSignIn, onEmailSignUp, onGuestLogin, errorMsg, isAuthLoading }: LandingPageProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const [activeItemTypeTab, setActiveItemTypeTab] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedNeighborhoodIndex, setSelectedNeighborhoodIndex] = useState(0);

  // Email and Password Form state
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [neighborhood, setNeighborhood] = useState('Midtown');
  const [bio, setBio] = useState('');
  
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [liveItems, setLiveItems] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchLive = async () => {
      try {
        const result = await getSupabaseItems();
        if (isMounted) {
          const mapped = result.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            type: item.type,
            neighborhood: item.neighborhood,
            description: item.description,
            user: item.userDisplayName || 'Local Neighbor',
            badge: item.category || 'Active Member'
          }));
          setLiveItems(mapped);
        }
      } catch (err) {
        console.warn('Failed to load live landing page items:', err);
      }
    };
    fetchLive();
    return () => { isMounted = false; };
  }, []);

  const filteredItems = liveItems.filter(item => {
    if (activeItemTypeTab === 'all') return true;
    return item.type === activeItemTypeTab;
  });

  const featuredNeighborhood = NEIGHBORHOODS_METADATA[selectedNeighborhoodIndex];

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both your email and password.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const res = await onEmailSignIn(email.trim(), password);
      if (!res) {
        setLocalError('Invalid credentials. Check your email or join as a new neighbor.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Signature handshake error.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      setLocalError('Please fill out all required fields.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters in length.');
      return;
    }
    setLocalLoading(true);
    setLocalError('');
    try {
      const res = await onEmailSignUp(email.trim(), password, displayName.trim(), neighborhood, bio.trim());
      if (!res) {
        setLocalError('Neighbor registration detour failed.');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Neighbor registration failed.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div id="landing_page_root" className="min-h-screen flex flex-col justify-between bg-[#0B1416] text-[#FAF9FA] font-sans selection:bg-[#FF4500]/20">
      
      {/* 1. Header/Navigation Bar - Reddit Orange and Black Style */}
      <nav className="border-b border-[#343536] bg-[#1A1A1B] sticky top-0 z-45 px-4 sm:px-6 lg:px-8 shadow-sm" id="landing_navbar">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 select-none">
            {!logoFailed ? (
              <img 
                src="/Logo.jpeg" 
                alt="Sacramento Buy Nothing Logo" 
                className="h-9 w-auto object-contain cursor-pointer max-w-[220px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <div className="p-2.5 bg-[#FF4500] text-white rounded-xl flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-base font-bold tracking-tight text-white block leading-none font-display">
                    Sacramento <span className="text-[#FF4500] font-bold">Buy Nothing</span>
                  </span>
                  <span className="text-[10px] font-medium text-zinc-400 tracking-normal block mt-1">
                    Our cooperative neighborhood circle
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={onGuestLogin}
              id="landing_header_guest_login_btn"
              className="px-4 py-2 text-xs font-bold border-2 border-[#343536] text-[#FAF9FA] hover:bg-[#2D2D2E] rounded-xl transition-all cursor-pointer select-none"
            >
              Take a Peek
            </button>
            <button
              onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
              id="landing_header_register_btn"
              className="px-4 py-2 text-xs font-bold bg-[#FF4500] hover:bg-[#E03D00] text-white rounded-xl transition-all cursor-pointer inline-flex items-center space-x-1.5"
            >
              <span>Join Circle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
      
      {/* 2. Hero Presentation (Reddit Orange and Black Layout) */}
      <section className="relative px-4 pt-12 pb-12 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6" id="hero_section">
        <div className="inline-flex items-center space-x-1.5 bg-[#1A1A1B] border border-[#343536] text-[#FF4500] py-1.5 px-4 text-xs font-bold rounded-full">
          <Heart className="w-3.5 h-3.5 text-[#FF4500] fill-current" />
          <span>Sunflower Circle — Run entirely by volunteers and neighbors</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-[3.25rem] font-bold text-white tracking-tight leading-tight font-display">
          Give from the heart.<br />
          <span className="text-[#FF4500]">Share without money.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl mx-auto font-medium">
          Welcome to Sacramento's friendly community gift circle! Here, Midtown apartments, East Sac gardens, and South Sac families share beautiful home goods, garden crops, and help without any money, bartering, or strings attached.
        </p>

        {/* Dynamic Authentication Panel */}
        <div id="auth_credential_desk" className="max-w-md mx-auto bg-[#1A1A1B] border border-[#343536] text-white shadow-xl rounded-2xl text-left overflow-hidden mt-6">
          {/* Tabs */}
          <div className="flex border-b border-[#343536] bg-[#0B1416]">
            <button
              onClick={() => { setAuthTab('signin'); setLocalError(''); }}
              type="button"
              className={`flex-1 py-3 text-xs font-bold text-center transition-all ${
                authTab === 'signin'
                  ? 'bg-[#1A1A1B] text-[#FF4500] border-r border-[#343536] font-bold'
                  : 'text-zinc-450 hover:text-white border-r border-[#343536] bg-[#0B1416]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setLocalError(''); }}
              type="button"
              className={`flex-1 py-3 text-xs font-bold text-center transition-all ${
                authTab === 'signup'
                  ? 'bg-[#1A1A1B] text-[#FF4500] font-bold'
                  : 'text-zinc-455 hover:text-white bg-[#0B1416]'
              }`}
            >
              Join Our Circle
            </button>
          </div>

          <div className="p-6 space-y-4">
            {localError && (
              <div className="p-4 bg-[#241A0F] text-[#FF9F43] text-xs font-bold rounded-xl border border-[#FF9F43]/30 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#FF9F43] mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#FF4500]">Welcome to Sandbox Mode!</span>
                    <span className="font-medium text-amber-200 mt-1 block leading-relaxed">
                      {(localError.toLowerCase().includes('failed to fetch') || localError.toLowerCase().includes('fetch'))
                        ? 'Your browser is currently running our neighborhood portal offline. Perfect for testing!'
                        : localError}
                    </span>
                  </div>
                </div>
                {(localError.toLowerCase().includes('failed to fetch') || localError.toLowerCase().includes('fetch')) && (
                  <div className="pt-2.5 border-t border-[#FF9F43]/25 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-[#FF9F43] leading-none">
                      🌻 CHOOSE A WARM SNEAK-PEEK:
                    </p>
                    <button
                      type="button"
                      onClick={onGuestLogin}
                      className="w-full text-center py-2.5 bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer select-none"
                    >
                      Step inside as a Sacramento Neighbor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('signup');
                        setLocalError('Type in your desired details! The portal will join you in your browser storage automatically.');
                      }}
                      className="w-full text-center py-2.5 bg-[#1A1A1B] hover:bg-[#2D2D2E] text-white font-bold rounded-xl text-xs border border-[#343536] transition-colors cursor-pointer select-none"
                    >
                      Create friendly profile offline
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {errorMsg && !localError && (
              <div className="p-4 bg-[#241A0F] text-[#FF9F43] text-xs font-bold rounded-xl border border-[#FF9F43]/30 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-[#FF9F43] mt-0.5" />
                  <div>
                    <span className="font-bold block text-[#FF4500]">Community circle announcement:</span>
                    <span className="font-medium text-amber-205 mt-1 block leading-relaxed">
                      {(errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('fetch'))
                        ? 'We are operating in offline mode. Gifting progress is safely saved local to your browser.'
                        : errorMsg}
                    </span>
                  </div>
                </div>
                {(errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('fetch')) && (
                  <div className="pt-1.5 border-t border-[#FF9F43]/25">
                    <button
                      type="button"
                      onClick={onGuestLogin}
                      className="w-full text-center py-2 bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Instant Peek
                    </button>
                  </div>
                )}
              </div>
                                   )}
            <form onSubmit={authTab === 'signin' ? handleSignInSubmit : handleSignUpSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 block">EMAIL ADDRESS</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@domain.com"
                    className="w-full pl-9 pr-3 py-2 bg-[#0F0F0F] border border-[#343536] text-xs font-medium text-white focus:bg-black focus:outline-none focus:border-[#FF4500] rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-400 block">PASSWORD</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-[#0F0F0F] border border-[#343536] text-xs font-medium text-white focus:bg-black focus:outline-none focus:border-[#FF4500] rounded-xl"
                  />
                </div>
              </div>

              {authTab === 'signup' && (
                <>
                  {/* Neighbor Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 block">YOUR NAME / NICKNAME</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Grandma Rosie"
                        className="w-full pl-9 pr-3 py-2 bg-[#0F0F0F] border border-[#343536] text-xs font-medium text-white focus:bg-black focus:outline-none focus:border-[#FF4500] rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Sector */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 block">SACRAMENTO NEIGHBORHOOD</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
                      </div>
                      <select
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#0F0F0F] border border-[#343536] text-xs font-bold text-white focus:bg-black focus:outline-none focus:border-[#FF4500] rounded-xl appearance-none"
                      >
                        {SACRAMENTO_NEIGHBORHOODS.map(n => (
                          <option key={n} value={n} className="bg-[#1A1A1B] text-white">{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-400 block">ABOUT YOU (OPTIONAL BRIEF BIO)</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="e.g. Just moved to Oak Park! Excited to share seeds, clothes, and help rehome books."
                      maxLength={180}
                      className="w-full p-2 bg-[#0F0F0F] border border-[#343536] text-xs font-medium text-white focus:bg-black focus:outline-none focus:border-[#FF4500] rounded-xl resize-none h-16"
                    />
                  </div>
                </>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={localLoading || isAuthLoading}
                className="w-full py-3 bg-[#FF4500] hover:bg-[#E03D00] text-white disabled:opacity-50 text-xs font-bold uppercase tracking-wide rounded-xl transition-all cursor-pointer select-none"
              >
                {localLoading || isAuthLoading 
                  ? 'Stepping into our circle...' 
                  : authTab === 'signin' 
                    ? 'Step Inside' 
                    : 'Join our Sacramento sharing circle'
                }
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#343536]"></div>
              <span className="flex-shrink mx-4 text-[9px] text-zinc-450 font-bold uppercase tracking-wider font-mono">OR DIRECT BYPASS</span>
              <div className="flex-grow border-t border-[#343536]"></div>
            </div>

            <button
              onClick={onGuestLogin}
              type="button"
              className="w-full py-2.5 border border-[#343536] text-[#FF4500] bg-[#1A1A1B] hover:bg-[#252526] hover:text-[#FF4500] hover:border-[#FF4500] text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF4500]" />
              <span>Wander as our guest</span>
            </button>
          </div>
        </div>

        {/* 3. Community Stats Badge - Reddit dark cards */}
        <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-8 text-center" id="stats_panel">
          <div className="p-5 bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xs">
            <span className="block text-2xl font-bold text-[#FF4500] leading-none font-display">1,820 LBS</span>
            <span className="text-[10px] tracking-wide text-zinc-400 font-bold uppercase block mt-1.5">Diverted Trash ♻️</span>
          </div>
          <div className="p-5 bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xs">
            <span className="block text-2xl font-bold text-[#FF4500] leading-none font-display">640 TIMES</span>
            <span className="text-[10px] tracking-wide text-zinc-400 font-bold uppercase block mt-1.5">Gifts Swapped ♡</span>
          </div>
          <div className="p-5 bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-xs">
            <span className="block text-2xl font-bold text-[#FF4500] leading-none font-display">0.00 USD</span>
            <span className="text-[10px] tracking-wide text-zinc-400 font-bold uppercase block mt-1.5">Cost Forever 🌱</span>
          </div>
        </div>
      </section>

      {/* 4. Interactive Live Preview Filter */}
      <section className="px-4 py-12 max-w-7xl mx-auto w-full space-y-8 bg-[#1A1A1B] border border-[#343536] rounded-2xl my-8 shadow-sm" id="live_previews">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-3.5 py-1.5 rounded-full uppercase">🌻 Neighbor's Shared Basket</span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">Gifts Floating in Sacramento</h2>
          <p className="text-sm font-semibold text-zinc-450 italic leading-relaxed">Here are some of the active household items, crop surplus, and wanted requests added by locals</p>
        </div>

        {/* Filter Toggle in Rounded Selectors */}
        <div className="flex justify-center space-x-2" id="preview_filters">
          {(['all', 'giveaway', 'looking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveItemTypeTab(tab)}
              className={`px-5 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-xl border ${
                activeItemTypeTab === tab 
                  ? 'bg-[#FF4500] text-white border-[#FF4500] shadow-sm' 
                  : 'bg-[#0B1416] hover:bg-[#202021] text-zinc-300 border-[#343536]'
              }`}
            >
              {tab === 'all' ? 'All Gifts' : tab === 'giveaway' ? 'Gifting Offers' : 'Wanted Requests'}
            </button>
          ))}
        </div>

        {/* Card slider / Grid list - Cozy grid card boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="preview_grid">
          {filteredItems.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 bg-[#0B1416] border border-dashed border-[#343536] rounded-2xl">
              <span className="text-xs font-bold uppercase text-[#FF4500] block mb-1">Our shared basket is currently empty!</span>
              <p className="text-xs text-zinc-550">Wait for neighbors to add lovely gifts, or step forward and post yours!</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-[#1E1F21] p-6 rounded-2xl border border-[#343536] hover:border-[#FF4500] shadow-xs hover:shadow-lg transition-all flex flex-col justify-between h-56 relative group cursor-pointer"
                id={`mock_item_${item.id}`}
                onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                      item.type === 'giveaway' 
                        ? 'bg-[#FF4500]/10 text-[#FF4500]' 
                        : 'bg-[#343536] text-zinc-300'
                    }`}>
                      {item.type === 'giveaway' ? '🎁 Gift Offer' : '🌿 Wanted Item'}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-300 bg-[#0B1416] border border-[#343536] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                      <MapPin className="w-2.5 h-2.5 text-[#FF4500]" />
                      <span>{item.neighborhood}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-tight group-hover:text-[#FF4500] transition-colors font-display">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="border-t border-[#343536] pt-3.5 flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-zinc-500 italic">Offered by {item.user}</span>
                  <span className="text-[10px] font-bold text-[#FF4500] bg-[#FF4500]/10 px-2 py-0.5 rounded-full border border-[#FF4500]/10">
                    {item.badge}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#FF4500] hover:text-[#E03D00] cursor-pointer transition-all uppercase"
          >
            <span>Start sharing items or ask neighbors for what you need — Join us</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. How It Works Timeline */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full space-y-12" id="how_it_works_section">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-3 py-1.5 rounded-full uppercase">THREE SIMPLE STEPS</span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">How It Works</h2>
          <p className="text-xs font-semibold text-zinc-400 max-w-sm mx-auto">Three simple stages to spread happiness in our city circles.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="steps_timeline">
          {/* Step 1 */}
          <div className="bg-[#1A1A1B] p-6 rounded-2xl border border-[#343536] text-center space-y-4 shadow-sm hover:border-[#FF4500] transition-colors">
            <div className="mx-auto w-12 h-12 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-bold text-base">
              1
            </div>
            <h3 className="text-sm font-bold text-white">SHARE YOUR GIFT</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
              Post things you don't need, extra garden tomatoes, or ask for something you're in search of.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#1A1A1B] p-6 rounded-2xl border border-[#343536] text-center space-y-4 shadow-sm hover:border-[#FF4500] transition-colors">
            <div className="mx-auto w-12 h-12 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-bold text-base">
              2
            </div>
            <h3 className="text-sm font-bold text-white">FRIENDLY CHAT</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
              Wander into our private neighbor chats. Discuss item details and schedule a comfortable handoff.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-[#1A1A1B] p-6 rounded-2xl border border-[#343536] text-center space-y-4 shadow-sm hover:border-[#FF4500] transition-colors">
            <div className="mx-auto w-12 h-12 bg-[#FF4500] text-white rounded-full flex items-center justify-center font-bold text-base">
              3
            </div>
            <h3 className="text-sm font-bold text-white">PORCH PICK-UP JOY</h3>
            <p className="text-xs text-zinc-300 leading-relaxed font-semibold">
              Collect your items from the neighborhood porch step. Smile, feel the community love, and save landfill waste!
            </p>
          </div>
        </div>
      </section>

      {/* 6. Interactive Neighborhood District Hub Explorer */}
      <section className="px-4 py-12 max-w-5xl mx-auto w-full space-y-8" id="neighborhood_district_explorer">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">OUR ENERGETIC BOROUGHS</h2>
          <p className="text-xs font-semibold text-zinc-400">Every corner of the Tree City has garden and home gifts in loop</p>
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
                   className={`px-4 py-3 rounded-xl text-xs font-bold text-left transition-all shrink-0 cursor-pointer flex items-center justify-between w-full border ${
                     isSelected 
                       ? 'bg-[#FF4500] text-white border-[#FF4500] shadow-md' 
                       : 'bg-[#1A1A1B] hover:bg-[#252526] text-zinc-300 border-[#343536]'
                   }`}
                 >
                   <span className="flex items-center space-x-2.5">
                     <MapPin className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#FF4500]'}`} />
                     <span>{district.name}</span>
                   </span>
                   <ChevronRight className={`w-3.5 h-3.5 hidden md:block ${isSelected ? 'text-white' : 'text-zinc-400'}`} />
                 </button>
               );
            })}
          </div>

          {/* District Highlights details panel */}
          <div className="md:col-span-8 bg-[#1A1A1B] p-6 rounded-2xl border border-[#343536] flex flex-col justify-between shadow-md" id="district_bio_card">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#343536] pb-3">
                <h3 className="text-lg font-bold text-white font-display">
                  {featuredNeighborhood.name} Area
                </h3>
                <span className="text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 border border-[#FF4500]/20 px-3 py-1 rounded-full">
                  {featuredNeighborhood.activeCount}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-semibold italic">
                "{featuredNeighborhood.bio}"
              </p>

              <div className="p-4 bg-[#0F0F0F] border border-[#343536] rounded-xl" id="popular_exchanges_badge">
                <span className="block text-[10px] font-bold uppercase text-[#FF4500] mb-1.5">most frequent treasures swapped:</span>
                <p className="text-xs text-white font-semibold leading-relaxed">{featuredNeighborhood.popular}</p>
              </div>
            </div>

            <button 
              onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-6 w-full py-3 bg-[#FF4500] hover:bg-[#E03D00] border-0 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              LOG IN AND JOIN {featuredNeighborhood.name.toUpperCase()} CIRCLE
            </button>
          </div>
        </div>
      </section>

      {/* 7. Friendly Philosophy & Community Rules */}
      <section className="px-4 py-12 max-w-5xl mx-auto w-full space-y-8" id="philosophy_rules_community">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-3 py-1.5 rounded-full uppercase">OUR SIMPLE RULES</span>
          <h2 className="text-2xl font-bold text-white tracking-tight font-display">Gifting & Neighborhood Rules</h2>
          <p className="text-xs font-semibold text-zinc-400 max-w-md mx-auto">We operate purely on trust, kindness, and waste-free sharing.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="allowed_forbidden_rules">
          {/* Allowed Section */}
          <div className="bg-[#1A1A1B] border-t-4 border-t-[#FF4500] border border-[#343536] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-[#343536]">
              <span className="w-6 h-6 bg-green-500/10 text-green-400 rounded-full font-bold text-xs flex items-center justify-center">✓</span>
              <h3 className="text-sm font-bold text-white">LOVINGLY WELCOME</h3>
            </div>
            <ul className="space-y-3.5 text-xs text-zinc-300">
              <li className="flex items-start space-x-2">
                <span className="text-green-400 font-bold mt-0.5">✓</span>
                <span><strong>Free Gifting:</strong> Sharing pretty furniture, baby gear, tools, toys, and surplus pantry items for real.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 font-bold mt-0.5">✓</span>
                <span><strong>Lending a Hand:</strong> Lending a ladder, helping clear a garden bed, or sharing tutoring help for kids.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-green-400 font-bold mt-0.5">✓</span>
                <span><strong>Polite Requests:</strong> Respectfully asking neighbors for specific emergency needs or project swaps.</span>
              </li>
            </ul>
          </div>

          {/* Forbidden Section */}
          <div className="bg-[#1A1A1B] border-t-4 border-t-[#FF4500] border border-[#343536] rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center space-x-2.5 pb-2 border-b border-[#343536]">
              <span className="w-6 h-6 bg-[#FF4500]/10 text-[#FF4500] rounded-full font-bold text-xs flex items-center justify-center">✕</span>
              <h3 className="text-sm font-bold text-[#FF4500]">STRICTLY DEBARRED</h3>
            </div>
            <ul className="space-y-3.5 text-xs text-zinc-300">
              <li className="flex items-start space-x-2">
                <span className="text-[#FF4500] font-bold mt-0.5">✕</span>
                <span><strong>No Sales or Charging Cash:</strong> Absolutely everything in this app must be one hundred percent free.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#FF4500] font-bold mt-0.5">✕</span>
                <span><strong>No Commercial Trades or Scams:</strong> No branding promotions, business advertisements, or exchange barters.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-[#FF4500] font-bold mt-0.5">✕</span>
                <span><strong>No Profiting:</strong> Please never take a donated gift to resell in commercial stores or Facebook listings!</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 7.5. Common Items Shared Grid */}
      <section className="px-4 py-12 bg-[#0F0F0F] border-t border-b border-[#343536]" id="common_items_section">
        <div className="max-w-5xl mx-auto space-y-8 font-sans">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#FF4500] bg-[#FF4500]/10 px-3.5 py-1 rounded-full uppercase">KINDNESS INVENTORY</span>
            <h2 className="text-2xl font-bold text-white tracking-tight font-display">Common Goods Swapped in Our Garden</h2>
            <p className="text-xs font-semibold text-zinc-400 max-w-sm mx-auto">A little sample of standard items passed beautifully around the city</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="items_index_grid">
            {[
              { desc: 'Furniture & Desks', count: 'Midtown & Elk Grove' },
              { desc: 'Power Tools & Hardware', count: 'East Sac & Natomas' },
              { desc: 'Cooking & Kitchenware', count: 'Downtown & Pocket' },
              { desc: 'Baby Gears & Strollers', count: 'Rancho Cordova & Land Park' },
              { desc: 'Lawn & Garden Seeds', count: 'West Sac & East Sac' },
              { desc: 'Creative Art Supplies', count: 'Oak Park & Midtown' },
              { desc: 'Books, Guides & Games', count: 'Land Park & Curtis Park' },
              { desc: 'Electronics & Adaptors', count: 'Natomas & Arden' },
              { desc: 'Cardboards & Moving Bins', count: 'South Sac & Arden' },
              { desc: 'Pet Supplies & Crates', count: 'Downtown & Citrus Heights' },
              { desc: 'Clean Apparel & Jackets', count: 'South Sac & Oak Park' },
              { desc: 'Hobby Gear & Instruments', count: 'Arden & Midtown' }
            ].map((item, idx) => (
              <div key={idx} className="bg-[#1A1A1B] border border-[#343536] p-4 rounded-xl hover:border-[#FF4500] transition-all flex flex-col justify-between shadow-xs">
                <span className="block text-xs font-semibold text-white">{item.desc}</span>
                <span className="block text-[9px] font-mono text-zinc-450 mt-2 uppercase tracking-wide font-medium">ACTIVE: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7.6. Why Sustainability Matters (Statistics & Ecological Context) */}
      <section className="px-4 py-12 max-w-4xl mx-auto w-full text-center space-y-6 animate-fade-in" id="sustainability_matters">
        <div className="inline-flex items-center space-x-2 bg-[#FF4500]/10 border border-[#FF4500]/20 text-[#FF4500] py-1.5 px-4 text-xs font-bold rounded-full">
          <Recycle className="w-3.5 h-3.5 text-[#FF4500]" />
          <span>ECOLOGICAL LOVE</span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight font-display">Why We Choose Giving</h2>
        <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl mx-auto font-medium">
          Every single item shared or passed directly keeps lovely resources out of Sacramento municipal landfills, reduces industrial manufacturing waste, and sparks magical local connections. Kindness-led neighborhood loops create highly supportive networks.
        </p>
      </section>

      {/* 8. Call To Action Footer Section */}
      <section className="bg-[#030303] border-t border-[#343536] text-white py-16 px-4 text-center relative overflow-hidden shadow-inner uppercase" id="call_to_action">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="w-12 h-12 bg-[#1A1A1B] text-[#FF4500] rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border border-[#343536]">
            <Heart className="w-6 h-6 text-[#FF4500] fill-current" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">Step into our garden circles</h2>
          <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed font-semibold">
            Instantly match up with vetted neighboring homes, start chats, and swap items in a supportive environment.
          </p>

          <button
            onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
            className="mx-auto w-full max-w-xs py-3.5 px-6 rounded-xl font-bold text-xs bg-[#FF4500] hover:bg-[#E03D00] text-white shadow-lg inline-flex items-center justify-center space-x-2 transition-all cursor-pointer transform hover:scale-102"
          >
            <Lock className="w-4 h-4 text-white" />
            <span>ENTRANCE PORTAL</span>
          </button>

          <p className="text-[10px] text-zinc-550 tracking-wide font-semibold block mt-4 font-sans">
            Sacramento County Neighbors' Circle ♡
          </p>
        </div>
      </section>

      {/* 9. Minimal humblest credit line */}
      <footer className="py-6 text-center text-xs text-zinc-500 border-t border-[#343536] bg-[#030303]" id="landing_minimal_footer">
        <span>© {new Date().getFullYear()} Sacramento Buy Nothing Neighborhood Association. Run by volunteers of your city.</span>
      </footer>

    </div>
  );
}
