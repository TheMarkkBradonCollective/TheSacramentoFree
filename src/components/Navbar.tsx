import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, MessageSquare, Plus, User, MapPin, Gift, Search as SearchIcon } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeTab: 'feed' | 'chats' | 'profile';
  setActiveTab: (tab: 'feed' | 'chats' | 'profile') => void;
  onOpenNewPost: () => void;
  onLogout: () => void;
}

export default function Navbar({
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onLogout,
}: NavbarProps) {
  return (
    <header id="main_navbar" className="sticky top-4 z-40 mx-4 sm:mx-6 lg:mx-8 mt-4 glass rounded-3xl shadow-lg border border-white/40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('feed')} 
            className="flex items-center space-x-2.5 cursor-pointer select-none"
            id="brand_logo_container"
          >
            <div className="p-2 bg-emerald-500/20 rounded-2xl text-emerald-700 transition-colors hover:bg-emerald-500/30">
              <Gift className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800 tracking-tight leading-none">
                Sacramento
              </h1>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase block mt-0.5 font-mono">
                Buy Nothing
              </span>
            </div>
          </div>

          {/* Navigation Controls */}
          {userProfile && (
            <nav className="flex items-center space-x-1 sm:space-x-2" id="nav_links_container">
              {/* Find Items / Feed */}
              <button
                id="tab_feed_btn"
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-white/50 text-emerald-850 hover:bg-white/60 shadow-xs border border-white/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/25'
                }`}
              >
                Browse Items
              </button>

              {/* Messaging tab */}
              <button
                id="tab_chats_btn"
                onClick={() => setActiveTab('chats')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'chats'
                    ? 'bg-white/50 text-emerald-850 hover:bg-white/60 shadow-xs border border-white/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/25'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Messages</span>
              </button>

              {/* User Profile Tab */}
              <button
                id="tab_profile_btn"
                onClick={() => setActiveTab('profile')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-white/50 text-emerald-850 hover:bg-white/60 shadow-xs border border-white/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/25'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">My Profile</span>
              </button>
            </nav>
          )}

          {/* User actions */}
          <div className="flex items-center space-x-2.5" id="navbar_actions_container">
            {userProfile ? (
              <>
                {/* Neighborhood Badge */}
                <div 
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-white/40 backdrop-blur-xs border border-white/50 rounded-full text-[11px] font-bold text-slate-700"
                  id="neighborhood_display_badge"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{userProfile.neighborhood}</span>
                </div>

                {/* Create Custom Post Button */}
                <button
                  id="navbar_create_post_btn"
                  onClick={onOpenNewPost}
                  className="inline-flex items-center space-x-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-full shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Post Item</span>
                </button>

                {/* Log Out */}
                <button
                  id="navbar_logout_btn"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-white/40 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-widest">Sacramento Community</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
