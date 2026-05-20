import React, { useState } from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Map, List, MessageSquare, User, Plus, Navigation2, Compass, Tag, LogOut } from 'lucide-react';

interface MobileViewProps {
  items: ItemPost[];
  userProfile: UserProfile;
  activeTab: 'feed' | 'chats' | 'profile' | 'map';
  setActiveTab: (tab: 'feed' | 'chats' | 'profile' | 'map') => void;
  onOpenNewPost: () => void;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
}

export default function MobileView({
  items,
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onInitiateChat,
  onLogout,
  onUpdateProfile,
  initialSelectedChatId,
  onClearInitialChat
}: MobileViewProps) {
  // Mobile-specific layout sub-view controllers
  const [selectedMobileCategory, setSelectedMobileCategory] = useState('All Categories');
  const [selectedMobileType, setSelectedMobileType] = useState<'all' | 'giveaway' | 'looking'>('all');

  return (
    <div id="mobile_device_workspace" className="flex flex-col h-screen overflow-hidden bg-zinc-50 font-sans text-black relative">
      
      {/* Floating Header Banner */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between bg-black text-white px-4 py-3 shadow-lg border border-zinc-805" id="mobile_floating_header">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest font-mono text-brand-orange">SBN LIVE CELL</span>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-[#FFF] truncate max-w-[140px]" id="mobile_neighborhood_header">
          {userProfile.neighborhood.toUpperCase()} SECTOR
        </div>
        <button
          onClick={onLogout}
          className="text-zinc-400 hover:text-brand-orange p-1 transition-colors cursor-pointer"
          id="mobile_logout_floating_btn"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Context Workspace Container */}
      <div className="flex-1 w-full relative h-full overflow-hidden" id="mobile_viewport_card">
        {activeTab === 'map' && (
          <div className="absolute inset-0 w-full h-full z-0 overflow-hidden" id="ubermap_viewport_container">
            {/* Immersive Map Background */}
            <SacramentoMapView
              items={items}
              userProfile={userProfile}
              selectedType={selectedMobileType}
              selectedCategory={selectedMobileCategory}
              onInitiateChat={onInitiateChat}
            />

            {/* Float Pill filter list Layered on Top (Uber Map style) */}
            <div className="absolute top-20 left-4 right-4 z-20 flex gap-2 overflow-x-auto pb-2 scrollbar-none" id="mobile_map_quick_pills">
              <button
                id="pill_all_types"
                onClick={() => setSelectedMobileType('all')}
                className={`py-1.5 px-3.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-opacity border ${
                  selectedMobileType === 'all' ? 'bg-black text-white border-black' : 'bg-white text-zinc-800 border-zinc-200'
                }`}
              >
                All Sector Listings
              </button>
              <button
                id="pill_gives_only"
                onClick={() => setSelectedMobileType('giveaway')}
                className={`py-1.5 px-3.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-opacity border ${
                  selectedMobileType === 'giveaway' ? 'bg-[#FF5500] text-white border-[#FF5500]' : 'bg-white text-zinc-850 border-zinc-200'
                }`}
              >
                Gives 🎁
              </button>
              <button
                id="pill_asks_only"
                onClick={() => setSelectedMobileType('looking')}
                className={`py-1.5 px-3.5 text-[9px] font-black uppercase tracking-wider shrink-0 transition-opacity border ${
                  selectedMobileType === 'looking' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-850 border-zinc-200'
                }`}
              >
                Asks 🔍
              </button>
            </div>

            {/* Quick action circles floated on map (Uber Map Style) */}
            <div className="absolute bottom-6 right-4 z-20 flex flex-col space-y-3" id="mobile_floated_dial_controls">
              {/* Dispatch Action */}
              <button
                onClick={onOpenNewPost}
                className="w-12 h-12 bg-zinc-900 hover:bg-black text-white shadow-2xl flex items-center justify-center border-2 border-white focus:outline-hidden transition-transform active:scale-95 cursor-pointer"
                id="mobile_floated_post_action"
                title="Dispatch New Cargo Listing"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Directory/Feed Section */}
        {activeTab === 'feed' && (
          <div className="absolute inset-0 overflow-y-auto bg-white p-4 pt-20" id="mobile_directory_drawer">
            <div className="mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Sacramento Exchange Listings</h2>
              <p className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wide mt-0.5 font-mono">
                {items.length} community records located
              </p>
            </div>
            <ItemGrid
              items={items}
              userProfile={userProfile}
              onInitiateChat={onInitiateChat}
              onRefresh={() => {}}
            />
          </div>
        )}

        {/* Chats Segment */}
        {activeTab === 'chats' && (
          <div className="absolute inset-0 bg-white pt-20" id="mobile_messaging_dock">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
            />
          </div>
        )}

        {/* User Profile Segment */}
        {activeTab === 'profile' && (
          <div className="absolute inset-0 bg-white overflow-y-auto p-4 pt-20" id="mobile_profile_dock">
            <UserProfileView
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        )}
      </div>

      {/* Immersive Bottom Nav Rail (Uber/Mobile layout) */}
      <footer id="mobile_sticky_footer_nav" className="bg-[#000000] border-t border-zinc-900 text-white shadow-2xl pb-safe z-30">
        <div className="grid grid-cols-4 h-16 w-full text-center">
          
          {/* Map Portal */}
          <button
            id="mobile_nav_map"
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'map' ? 'text-brand-orange border-t-2 border-brand-orange bg-zinc-950/40' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Map Grid</span>
          </button>

          {/* Directory Portal */}
          <button
            id="mobile_nav_feed"
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'feed' ? 'text-brand-orange border-t-2 border-brand-orange bg-zinc-950/40' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Inventory</span>
          </button>

          {/* Coordination Panel */}
          <button
            id="mobile_nav_chats"
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'chats' ? 'text-brand-orange border-t-2 border-brand-orange bg-zinc-950/40' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <div className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Dispatches</span>
          </button>

          {/* User Account Panel */}
          <button
            id="mobile_nav_profile"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'profile' ? 'text-brand-orange border-t-2 border-brand-orange bg-zinc-950/40' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Account</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
