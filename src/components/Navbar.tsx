import React, { useState } from 'react';
import { LogOut, MessageSquare, Plus, User, MapPin, Gift } from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  userProfile: UserProfile | null;
  activeTab: 'feed' | 'chats' | 'profile' | 'map';
  setActiveTab: (tab: 'feed' | 'chats' | 'profile' | 'map') => void;
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
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header id="main_navbar" className="sticky top-0 z-40 bg-[#0B0C0D] text-white border-b border-[#343536] transition-all font-sans shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand - Soft Community Look */}
          <div 
            onClick={() => setActiveTab('feed')} 
            className="flex items-center space-x-3 cursor-pointer select-none"
            id="brand_logo_container"
          >
            {!logoFailed ? (
              <img 
                src="/Logo.png" 
                alt="Sacramento Buy Nothing Logo" 
                className="h-9 w-auto object-contain cursor-pointer max-w-[220px]"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <div className="px-2.5 py-2.5 bg-[#FF4500] text-white rounded-xl flex items-center justify-center shadow-sm">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white leading-none font-display">
                    Sacramento <span className="text-[#FF4500] font-light">Buy Nothing</span>
                  </h1>
                  <span className="text-[10px] font-medium text-zinc-400 tracking-normal block mt-0.5">
                    Our community sharing circle ♡
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Navigation Controls */}
          {userProfile && (
            <nav className="flex items-center h-full space-x-1 sm:space-x-4" id="nav_links_container">
              {/* Find Items / Feed */}
              <button
                id="tab_feed_btn"
                onClick={() => setActiveTab('feed')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center ${
                  activeTab === 'feed'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Gift Feed</span>
                {activeTab === 'feed' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FF4500] rounded-t-full" />
                )}
              </button>

              {/* Map View tab */}
              <button
                id="tab_map_btn"
                onClick={() => setActiveTab('map')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'map'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4 text-[#FF4500] shrink-0" />
                <span>Our Shared Map</span>
                {activeTab === 'map' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FF4500] rounded-t-full" />
                )}
              </button>

              {/* Messaging tab */}
              <button
                id="tab_chats_btn"
                onClick={() => setActiveTab('chats')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'chats'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#FF4500]" />
                <span>Neighbor Chats</span>
                {activeTab === 'chats' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FF4500] rounded-t-full" />
                )}
              </button>

              {/* User Profile Tab */}
              <button
                id="tab_profile_btn"
                onClick={() => setActiveTab('profile')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'profile'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4 text-white" />
                <span>My Profile</span>
                {activeTab === 'profile' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#FF4500] rounded-t-full" />
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
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1A1B] border border-[#343536] rounded-full text-[10px] font-bold text-[#FF4500] uppercase tracking-wider"
                  id="neighborhood_display_badge"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#FF4500]" />
                  <span>{userProfile.neighborhood}</span>
                </div>

                 {/* Create Custom Post Button */}
                <button
                  id="navbar_create_post_btn"
                  onClick={onOpenNewPost}
                  className="inline-flex items-center space-x-1.5 py-2 px-4 bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold tracking-wide rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Share or Request</span>
                </button>

                {/* Log Out */}
                <button
                  id="navbar_logout_btn"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-zinc-450 hover:text-white hover:bg-[#252526] rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-[10px] font-black tracking-widest text-[#FF4500] uppercase font-mono">SACRAMENTO BUY NOTHING</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
