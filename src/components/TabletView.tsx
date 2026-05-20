import React from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Compass, List, MessageSquare, User, Plus, LogOut, Layers } from 'lucide-react';

interface TabletViewProps {
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

export default function TabletView({
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
}: TabletViewProps) {
  return (
    <div id="tablet_device_workspace" className="flex flex-col min-h-screen bg-[#0B0C0D] font-sans text-white">
      
      {/* Tablet Header Navigator */}
      <header id="tablet_navbar" className="sticky top-0 z-40 bg-[#1A1A1B] border-b border-[#343536] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3 select-none" id="tablet_brand">
          <div className="p-2 bg-[#FF4500] text-white rounded-xl flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-bold tracking-tight text-white font-display leading-none">
              Sacramento <span className="text-[#FF4500] font-bold">Buy Nothing</span>
            </h1>
            <span className="text-[10px] font-medium text-zinc-400 tracking-normal block mt-0.5">
              Our community sharing circle
            </span>
          </div>
        </div>

        {/* Dynamic Tab Controls */}
        <nav className="flex space-x-2" id="tablet_nav">
          <button
            id="tablet_tab_feed_btn"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'feed' || activeTab === 'map'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-[#0F0F0F] border-[#343536] text-[#D4D4D8] hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Browse & Map</span>
          </button>

          <button
            id="tablet_tab_chats_btn"
            onClick={() => setActiveTab('chats')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'chats'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-[#0F0F0F] border-[#343536] text-[#D4D4D8] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Cozy Chats</span>
          </button>

          <button
            id="tablet_tab_profile_btn"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'profile'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-[#0F0F0F] border-[#343536] text-[#D4D4D8] hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Global actions */}
        <div className="flex items-center space-x-3" id="tablet_actions">
          <button
            id="tablet_header_dispatch"
            onClick={onOpenNewPost}
            className="px-4 py-2 bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Share Item</span>
          </button>

          <button
            id="tablet_header_logout"
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-zinc-400 hover:text-white hover:bg-[#252526] rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main id="tablet_content_container" className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-5">
        
        {/* Dual Pane Browse Feed / Active Map side-on split (Perfect tablet blend of Desktop/Mobile) */}
        {(activeTab === 'feed' || activeTab === 'map') && (
          <div className="grid grid-cols-12 gap-5" id="tablet_dual_pane_split">
            {/* Left Column: Listings Directory checklist (occupies 7 columns) */}
            <section className="col-span-12 xl:col-span-7 space-y-4" id="tablet_left_split_pane">
              <div className="border border-[#343536] bg-[#1A1A1B] rounded-2xl p-4">
                <h3 className="text-sm font-bold text-white tracking-tight font-display text-left">Gifts Shared with Love</h3>
                <p className="text-xs text-zinc-400 mt-1 font-semibold text-left" id="tablet_sector_badge_title">
                  Gifts & needed items around Greater Sacramento • {items.length} total items found.
                </p>
              </div>
              <ItemGrid
                items={items}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
                onRefresh={() => {}}
              />
            </section>

            {/* Right Column: Sticky active map overlay (occupies 5 columns) */}
            <aside className="col-span-12 xl:col-span-5 relative" id="tablet_right_split_pane">
              <div className="sticky top-24 space-y-4">
                <div className="border border-[#343536] bg-[#1A1A1B] rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white tracking-tight font-display flex items-center gap-1.5 leading-none">
                    <span className="w-2.5 h-2.5 bg-[#FF4500] inline-block animate-pulse rounded-full" />
                    Our Neighborhood Map
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-normal font-medium text-left">
                    Sacramento Community • Click any marker to see descriptions & send hello!
                  </p>
                </div>
                
                <div className="border border-[#343536] p-3.5 bg-[#1A1A1B] rounded-2xl shadow-xs">
                  <SacramentoMapView
                    items={items}
                    userProfile={userProfile}
                    onInitiateChat={onInitiateChat}
                  />
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Cozy Chats System */}
        {activeTab === 'chats' && (
          <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-sm p-4 font-sans" id="tablet_chats_pane">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
            />
          </div>
        )}

        {/* Member account card */}
        {activeTab === 'profile' && (
          <div className="bg-[#1A1A1B] border border-[#343536] rounded-2xl shadow-sm p-4" id="tablet_profile_pane">
            <UserProfileView
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        )}
      </main>
    </div>
  );
}
