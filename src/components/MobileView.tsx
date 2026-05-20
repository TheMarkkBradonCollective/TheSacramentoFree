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
    <div id="mobile_device_workspace" className="flex flex-col h-screen overflow-hidden bg-[#0B0C0D] font-sans text-white relative">
      
      {/* Floating Header Banner */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between bg-[#1A1A1B] text-white px-4 py-3 shadow-lg border border-[#343536] rounded-2xl" id="mobile_floating_header">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF4500] animate-ping" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF4500]">SAC CIRCLE</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-white truncate max-w-[140px]" id="mobile_neighborhood_header">
          {userProfile.neighborhood.toUpperCase()} CIRCLE
        </div>
        <button
          onClick={onLogout}
          className="text-zinc-400 hover:text-white p-1 transition-colors cursor-pointer"
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
              isFullScreenMobile={true}
            />

            {/* Float Pill filter list Layered on Top (Uber Map style) */}
            <div className="absolute top-20 left-4 right-4 z-20 flex gap-2 overflow-x-auto pb-2 scrollbar-none" id="mobile_map_quick_pills">
              <button
                id="pill_all_types"
                onClick={() => setSelectedMobileType('all')}
                className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide shrink-0 transition-all border ${
                  selectedMobileType === 'all' ? 'bg-[#FF4500] text-white border-[#FF4500]' : 'bg-[#1A1A1B] text-zinc-300 border-[#343536] shadow-sm'
                }`}
              >
                All Circle Gifts
              </button>
              <button
                id="pill_gives_only"
                onClick={() => setSelectedMobileType('giveaway')}
                className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide shrink-0 transition-all border ${
                  selectedMobileType === 'giveaway' ? 'bg-[#FF4500] text-white border-[#FF4500]' : 'bg-[#1A1A1B] text-zinc-300 border-[#343536] shadow-sm'
                }`}
              >
                Gives 🎁
              </button>
              <button
                id="pill_asks_only"
                onClick={() => setSelectedMobileType('looking')}
                className={`py-1.5 px-3 rounded-full text-[10px] font-bold tracking-wide shrink-0 transition-all border ${
                  selectedMobileType === 'looking' ? 'bg-[#FF4500] text-white border-[#FF4500]' : 'bg-[#1A1A1B] text-zinc-300 border-[#343536] shadow-sm'
                }`}
              >
                Asks 🔍
              </button>
            </div>

            {/* Quick action circles floated on map (Uber Map Style) */}
            <div className="absolute bottom-6 right-4 z-20 flex flex-col space-y-3" id="mobile_floated_dial_controls">
              {/* New Post Action */}
              <button
                onClick={onOpenNewPost}
                className="w-14 h-14 bg-[#FF4500] hover:bg-[#E03D00] text-white shadow-2xl flex items-center justify-center rounded-full border-2 border-[#1A1A1B] focus:outline-hidden transition-transform active:scale-95 cursor-pointer"
                id="mobile_floated_post_action"
                title="Share or Request"
              >
                <Plus className="w-7 h-7" />
              </button>
            </div>
          </div>
        )}

        {/* Directory/Feed Section */}
        {activeTab === 'feed' && (
          <div className="absolute inset-0 overflow-y-auto bg-[#0B0C0D] p-4 pt-20" id="mobile_directory_drawer">
            <div className="mb-4 bg-[#1A1A1B] border border-[#343536] p-4 rounded-2xl shadow-xs">
              <h2 className="text-sm font-bold text-white font-display text-left">Gifts Floating Nearby</h2>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium leading-normal text-left">
                {items.length} warm offers found in our community circle.
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
          <div className="absolute inset-0 bg-[#0B0C0D] pt-20" id="mobile_messaging_dock font-sans">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
              items={items}
            />
          </div>
        )}

        {/* User Profile Segment */}
        {activeTab === 'profile' && (
          <div className="absolute inset-0 bg-[#0B0C0D] overflow-y-auto p-4 pt-20" id="mobile_profile_dock">
            <UserProfileView
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        )}
      </div>

      {/* Immersive Bottom Nav Rail (Uber/Mobile layout) */}
      <footer id="mobile_sticky_footer_nav" className="bg-[#1A1A1B] border-t border-[#343536] text-white shadow-2xl pb-safe z-30 font-sans">
        <div className="grid grid-cols-4 h-16 w-full text-center">
          
          {/* Map Portal */}
          <button
            id="mobile_nav_map"
            onClick={() => setActiveTab('map')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'map' ? 'text-[#FF4500] border-t-2 border-[#FF4500] bg-black/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide">Explore Map</span>
          </button>

          {/* Directory Portal */}
          <button
            id="mobile_nav_feed"
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'feed' ? 'text-[#FF4500] border-t-2 border-[#FF4500] bg-black/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide">Share Pile</span>
          </button>

          {/* Coordination Panel */}
          <button
            id="mobile_nav_chats"
            onClick={() => setActiveTab('chats')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'chats' ? 'text-[#FF4500] border-t-2 border-[#FF4500] bg-black/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              <div className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#FF4500] animate-pulse" />
            </div>
            <span className="text-[9px] font-bold tracking-wide">Cozy Chats</span>
          </button>

          {/* User Account Panel */}
          <button
            id="mobile_nav_profile"
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center space-y-1 h-full select-none transition-all ${
              activeTab === 'profile' ? 'text-[#FF4500] border-t-2 border-[#FF4500] bg-black/20' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold tracking-wide">My Profile</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
