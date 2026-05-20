import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, MessageSquare, Plus, User, MapPin, Gift } from 'lucide-react';
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
    <header id="main_navbar" className="sticky top-0 z-40 bg-[#000000] text-white border-b border-zinc-800 transition-all font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand - Uber Minimalist Look */}
          <div 
            onClick={() => setActiveTab('feed')} 
            className="flex items-center space-x-3 cursor-pointer select-none"
            id="brand_logo_container"
          >
            <div className="px-2.5 py-2.5 bg-[#276EF1] text-white rounded-none flex items-center justify-center">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-white uppercase leading-none font-display">
                UBER<span className="text-[#276EF1] font-bold">SHARE</span>
              </h1>
              <span className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase block mt-0.5">
                SACRAMENTO FREE CELL
              </span>
            </div>
          </div>

          {/* Navigation Controls in Uber Base Style (Stark borders & underlines) */}
          {userProfile && (
            <nav className="flex items-center h-full space-x-1 sm:space-x-4" id="nav_links_container">
              {/* Find Items / Feed */}
              <button
                id="tab_feed_btn"
                onClick={() => setActiveTab('feed')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-black uppercase tracking-wider transition-all relative inline-flex items-center ${
                  activeTab === 'feed'
                    ? 'text-[#276EF1]'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <span>Browse listings</span>
                {activeTab === 'feed' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#276EF1]" />
                )}
              </button>

              {/* Messaging tab */}
              <button
                id="tab_chats_btn"
                onClick={() => setActiveTab('chats')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-black uppercase tracking-wider transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'chats'
                    ? 'text-[#276EF1]'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Messages</span>
                {activeTab === 'chats' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#276EF1]" />
                )}
              </button>

              {/* User Profile Tab */}
              <button
                id="tab_profile_btn"
                onClick={() => setActiveTab('profile')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-black uppercase tracking-wider transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'profile'
                    ? 'text-[#276EF1]'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
                {activeTab === 'profile' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#276EF1]" />
                )}
              </button>
            </nav>
          )}

          {/* User actions */}
          <div className="flex items-center space-x-2.5" id="navbar_actions_container">
            {userProfile ? (
              <>
                {/* Neighborhood Badge */}
                <div 
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-none text-[10px] font-bold text-zinc-300 uppercase tracking-wider"
                  id="neighborhood_display_badge"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#276EF1]" />
                  <span>{userProfile.neighborhood}</span>
                </div>

                {/* Create Custom Post Button - Solid Uber White */}
                <button
                  id="navbar_create_post_btn"
                  onClick={onOpenNewPost}
                  className="inline-flex items-center space-x-1.5 py-2 px-4.5 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider rounded-none transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Item</span>
                </button>

                {/* Log Out */}
                <button
                  id="navbar_logout_btn"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-900 rounded-none transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-[10px] font-black tracking-widest text-[#276EF1] uppercase font-mono">UBER SHARE</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
