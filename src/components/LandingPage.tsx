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

export default function LandingPage({ onEmailSignIn, onEmailSignUp, onGuestLogin, errorMsg, isAuthLoading }: LandingPageProps) {
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
    <div id="landing_page_root" className="min-h-screen flex flex-col justify-between bg-white text-black font-sans selection:bg-brand-orange/20">
      
      {/* 1. Header/Navigation Bar - Minimalist Style (Stark borders & crisp lines) */}
      <nav className="border-b border-zinc-200 bg-white sticky top-0 z-45 px-4 sm:px-6 lg:px-8" id="landing_navbar">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-black text-white rounded-none flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-black tracking-widest text-black uppercase block leading-none font-display">
                BUY<span className="text-brand-orange">NOTHING</span>
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
            >
              GUEST ACCESS
            </button>
            <button
              onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
              id="landing_header_register_btn"
              className="px-4 py-2 text-[10px] font-black bg-black hover:bg-zinc-805 text-white rounded-none transition-colors cursor-pointer inline-flex items-center space-x-1.5 tracking-widest uppercase"
            >
              <span>ACCESS LEDGER</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Presentation (Stark Typography Layout) */}
      <section className="relative px-4 pt-16 pb-16 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto space-y-6" id="hero_section">
        <div className="inline-flex items-center space-x-2 bg-brand-sage-light border border-brand-sage/20 text-brand-sage-dark py-1.5 px-4 text-[10px] font-black tracking-widest uppercase font-mono">
          <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
          <span>ZERO-WASTE PILE — 100% COMMUNITY OWNED</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6.5xl font-black text-black tracking-tight leading-none uppercase font-display">
          Go zero-waste.<br />
          <span className="text-brand-orange">Give freely.</span>
        </h1>

        <p className="text-sm sm:text-base text-zinc-650 leading-relaxed max-w-2xl mx-auto font-medium">
          A premium, high-efficiency neighborhood ledger for Sacramento residents. Connect with vetted neighboring homes to match off unused items, excess home gear, or fresh garden crops. Zero cash, zero barters, absolute high-quality sharing.
        </p>

        {/* Dynamic Authentication Panel */}
        <div id="auth_credential_desk" className="max-w-md mx-auto bg-white border border-zinc-200 text-black shadow-lg rounded-none text-left overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 bg-zinc-50 font-mono">
            <button
              onClick={() => { setAuthTab('signin'); setLocalError(''); }}
              type="button"
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-all ${
                authTab === 'signin'
                  ? 'bg-white text-black border-r border-zinc-200 font-extrabold pb-3'
                  : 'text-zinc-500 hover:text-black border-r border-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab('signup'); setLocalError(''); }}
              type="button"
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center transition-all ${
                authTab === 'signup'
                  ? 'bg-white text-black font-extrabold pb-3'
                  : 'text-zinc-500 hover:text-black'
              }`}
            >
              Join Cooperative
            </button>
          </div>

          <div className="p-6 space-y-4">
            {localError && (
              <div className="p-4 bg-amber-50 text-amber-900 text-xs font-bold rounded-none border border-amber-300 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide block">DATABASE OFFLINE / BARRIER</span>
                    <span className="font-medium text-amber-800 mt-1 block leading-relaxed">
                      {(localError.toLowerCase().includes('failed to fetch') || localError.toLowerCase().includes('fetch'))
                        ? 'The cloud server couldn\'t be reached. This happens when browser privacy protection filters network queries, or if the public Supabase sandbox is asleep.'
                        : localError}
                    </span>
                  </div>
                </div>
                {(localError.toLowerCase().includes('failed to fetch') || localError.toLowerCase().includes('fetch')) && (
                  <div className="pt-2.5 border-t border-amber-200/60 flex flex-col gap-2">
                    <p className="text-[9px] uppercase font-black text-amber-700 font-mono tracking-widest leading-none">
                      ★ FALLBACK ACTIVATED: CONTINUE USING OFFLINE SANDBOX!
                    </p>
                    <button
                      type="button"
                      onClick={onGuestLogin}
                      className="w-full text-center py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-widest text-[9px] transition-colors shadow-sm cursor-pointer select-none"
                    >
                      Bypass & Enter as Sacramento Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('signup');
                        setLocalError('Type in your desired details! The sandbox will register your account locally in your browser storage automatically.');
                      }}
                      className="w-full text-center py-2.5 bg-white hover:bg-amber-100 text-amber-900 font-extrabold uppercase tracking-widest text-[9px] border border-amber-300 transition-colors cursor-pointer select-none"
                    >
                      Create Local Profile Offline
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {errorMsg && !localError && (
              <div className="p-4 bg-amber-50 text-amber-900 text-xs font-bold rounded-none border border-amber-300 space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 text-amber-750 mt-0.5" />
                  <div>
                    <span className="font-extrabold uppercase tracking-wide block">COOPERATIVE DISPATCH MESSAGE</span>
                    <span className="font-medium text-amber-800 mt-1 block leading-relaxed">
                      {(errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('fetch'))
                        ? 'System is current routing via offline-secure mode. Database state is linked to LocalStorage successfully.'
                        : errorMsg}
                    </span>
                  </div>
                </div>
                {(errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('fetch')) && (
                  <div className="pt-1.5 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={onGuestLogin}
                      className="w-full text-center py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold uppercase tracking-widest text-[9px] transition-colors cursor-pointer"
                    >
                      Instant Guest Entrance
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={authTab === 'signin' ? handleSignInSubmit : handleSignUpSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">ACCOUNT EMAIL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 text-xs font-medium text-black focus:bg-white focus:outline-none focus:border-black rounded-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">PASSWORD</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 alphanumeric characters"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 text-xs font-medium text-black focus:bg-white focus:outline-none focus:border-black rounded-none"
                  />
                </div>
              </div>

              {authTab === 'signup' && (
                <>
                  {/* Neighbor Name */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">NEIGHBOR IDENTIFIER NAME</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Amelia G."
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 text-xs font-semibold text-black focus:bg-white focus:outline-none focus:border-black rounded-none"
                      />
                    </div>
                  </div>

                  {/* Sector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-zinc-500 block">SACRAMENTO NEIGHBORHOOD SECTOR</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                        <MapPin className="w-3.5 h-3.5 text-brand-sage" />
                      </div>
                      <select
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 text-xs font-bold text-black focus:bg-white focus:outline-none focus:border-black rounded-none appearance-none"
                      >
                        {SACRAMENTO_NEIGHBORHOODS.map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-brand-sage block">BIOGRAPHY BRIEF (OPTIONAL)</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="e.g. Sharing garden surplus and tools!"
                      maxLength={180}
                      className="w-full p-2 bg-zinc-50 border border-zinc-200 text-xs font-medium text-black focus:bg-white focus:outline-none focus:border-black rounded-none resize-none h-16"
                    />
                  </div>
                </>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                disabled={localLoading || isAuthLoading}
                className="w-full py-3 bg-black hover:bg-zinc-800 text-white disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-none transition-colors cursor-pointer select-none"
              >
                {localLoading || isAuthLoading 
                  ? 'ESTABLISHING HANDSHAKE...' 
                  : authTab === 'signin' 
                    ? 'VERIFY NEIGHBOR ACCESS' 
                    : 'INDUCT AS SACRAMENTO NEIGHBOR'
                }
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-200"></div>
              <span className="flex-shrink mx-4 text-[8px] text-zinc-400 font-black uppercase tracking-widest font-mono">OR DIRECT BYPASS</span>
              <div className="flex-grow border-t border-zinc-200"></div>
            </div>

            <button
              onClick={onGuestLogin}
              type="button"
              className="w-full py-2.5 border border-dashed border-brand-orange text-brand-orange bg-white hover:bg-brand-orange-light text-[10px] font-black uppercase tracking-widest rounded-none transition-all cursor-pointer inline-flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>GUEST PORTAL PASS</span>
            </button>
          </div>
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
          <span className="text-[9px] font-black uppercase tracking-widest text-[#FF4500] font-mono">LIVE MATCHMAKER</span>
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
          {filteredItems.length === 0 ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16 bg-white border border-dashed border-zinc-200">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange block mb-1">LEDGER IS AWAITING POSTS</span>
              <p className="text-xs font-semibold text-zinc-500">No active dispatches matched standard filters. Join the community to establish yours!</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-6 rounded-none border border-zinc-200 hover:border-black shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-56 relative group"
                id={`mock_item_${item.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-widest border ${
                      item.type === 'giveaway' 
                        ? 'bg-brand-sage-light text-brand-sage-dark border-brand-sage/20' 
                        : 'bg-brand-orange-light text-brand-orange border-brand-orange/20'
                    }`}>
                      {item.type === 'giveaway' ? 'Gifting Offer' : 'Wanted Request'}
                    </span>
                    <span className="text-[9px] font-black text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 flex items-center space-x-1 uppercase tracking-wider">
                      <MapPin className="w-2.5 h-2.5 text-brand-sage" />
                      <span>{item.neighborhood}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-black leading-tight group-hover:text-brand-orange transition-colors uppercase tracking-tight">
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
            ))
          )}
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center space-x-1.5 text-xs font-black text-brand-orange hover:text-brand-orange-hover uppercase tracking-widest cursor-pointer transition-all"
          >
            <span>Start a dispatch or claim items — Join the network</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 5. How It Works Timeline (Stark minimal card blocks) */}
      <section className="px-4 py-16 max-w-5xl mx-auto w-full space-y-12" id="how_it_works_section">
        <div className="text-center space-y-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-[#FF4500] bg-brand-orange-light border border-brand-orange/10 px-3 py-1 font-mono">VERIFIED STANDARD PIPELINE</span>
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
            <div className="mx-auto w-11 h-11 bg-brand-orange text-white rounded-none flex items-center justify-center font-black text-sm">
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
                     <MapPin className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-brand-orange'}`} />
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
                <span className="block text-[8px] font-black uppercase tracking-widest text-[#FF4500] font-mono mb-1.5">frequent listings:</span>
                <p className="text-xs text-black font-bold leading-relaxed">{featuredNeighborhood.popular}</p>
              </div>
            </div>

            <button 
              onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
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
            <ShieldAlert className="w-4 h-4 text-brand-orange" />
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
          <div className="w-11 h-11 bg-brand-orange text-white rounded-none flex items-center justify-center mx-auto mb-4">
            <Heart className="w-5.5 h-5.5 fill-current" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white font-display">Begin sharing today</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed font-semibold">
            Integrate with neighborhood routers immediately. View correct addresses and dispatch item transfers within 10 seconds.
          </p>

          <button
            onClick={() => document.getElementById('auth_credential_desk')?.scrollIntoView({ behavior: 'smooth' })}
            className="mx-auto w-full max-w-xs py-4 px-6 rounded-none font-black text-xs uppercase tracking-widest bg-white hover:bg-zinc-100 active:bg-zinc-200 text-black shadow-lg inline-flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4 text-black" />
            <span>EXCHANGE WITH SECURE ACCOUNT</span>
          </button>

          <p className="text-[9px] text-[#FF4500] font-black uppercase tracking-widest font-mono">
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
