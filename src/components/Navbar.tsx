import React, { useState } from 'react';
import { LogOut, MessageSquare, Plus, User, MapPin, Gift } from 'lucide-react';
import { UserProfile } from '../types';
import { SITE, IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';

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
    <header id="main_navbar" className="sticky top-0 z-40 bg-app text-app border-b border-app transition-all font-sans shadow-md">
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
                src="https://nezmabanjoqdzikliysd.supabase.co/storage/v1/object/public/SacramentoBuyNothing/876852c0-541a-11f1-9143-af3d50fee019.webp" 
                alt="Sacramento Buy Nothing Logo" 
                className="h-10 w-auto object-contain cursor-pointer max-w-[240px] rounded"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <div className="px-2.5 py-2.5 bg-accent text-on-accent rounded-xl flex items-center justify-center shadow-sm">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-tight text-app leading-none font-display">
                    Sacramento <span className="text-accent font-light">Buy Nothing</span>
                  </h1>
                  <span className="text-[10px] font-medium text-muted tracking-normal block mt-0.5">
                    {IN_APP.brandSubtitle}
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
                    ? 'text-app'
                    : 'text-muted hover:text-app'
                }`}
              >
                <span>Community Feed</span>
                {activeTab === 'feed' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-full" />
                )}
              </button>

              {/* Map View tab */}
              <button
                id="tab_map_btn"
                onClick={() => setActiveTab('map')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'map'
                    ? 'text-app'
                    : 'text-muted hover:text-app'
                }`}
              >
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <span>Neighborhood Map</span>
                {activeTab === 'map' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-full" />
                )}
              </button>

              {/* Messaging tab */}
              <button
                id="tab_chats_btn"
                onClick={() => setActiveTab('chats')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'chats'
                    ? 'text-app'
                    : 'text-muted hover:text-app'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-accent" />
                <span>Messages</span>
                {activeTab === 'chats' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-full" />
                )}
              </button>

              {/* User Profile Tab */}
              <button
                id="tab_profile_btn"
                onClick={() => setActiveTab('profile')}
                className={`h-16 px-3 py-1.5 text-xs sm:text-xs font-bold transition-all relative inline-flex items-center space-x-1.5 ${
                  activeTab === 'profile'
                    ? 'text-app'
                    : 'text-muted hover:text-app'
                }`}
              >
                <User className="w-4 h-4 text-app" />
                <span>My Profile</span>
                {activeTab === 'profile' && (
                  <span className="absolute bottom-0 left-0 w-full h-[3px] bg-accent rounded-t-full" />
                )}
              </button>
            </nav>
          )}

          {/* User actions */}
          <div className="flex items-center space-x-2.5" id="navbar_actions_container">
            <ThemeToggle />
            {userProfile ? (
              <>
                {/* Neighborhood Badge */}
                <div 
                  className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-surface border border-app rounded-full text-[10px] font-bold text-accent uppercase tracking-wider"
                  id="neighborhood_display_badge"
                >
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  <span>{userProfile.neighborhood}</span>
                </div>

                 {/* Create Custom Post Button */}
                <button
                  id="navbar_create_post_btn"
                  onClick={onOpenNewPost}
                  className="inline-flex items-center space-x-1.5 py-2 px-4 bg-accent hover:bg-accent-hover text-on-accent text-xs font-bold tracking-wide rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{IN_APP.shareOrRequest}</span>
                </button>

                {/* Log Out */}
                <button
                  id="navbar_logout_btn"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-muted hover:text-app hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="text-[10px] font-black tracking-widest text-accent uppercase font-mono">{SITE.name.toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
