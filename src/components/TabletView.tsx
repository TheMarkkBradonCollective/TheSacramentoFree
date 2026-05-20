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
    <div id="tablet_device_workspace" className="flex flex-col min-h-screen bg-zinc-50 font-sans text-black">
      
      {/* Tablet Header Navigator */}
      <header id="tablet_navbar" className="sticky top-0 z-40 bg-black text-white p-4 flex items-center justify-between border-b border-zinc-850">
        <div className="flex items-center space-x-3 select-none" id="tablet_brand">
          <div className="px-2 py-1.5 bg-brand-orange text-white flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-widest text-white uppercase leading-none font-display">
              SACRAMENTO <span className="text-brand-orange">BUY NOTHING</span>
            </h1>
            <span className="text-[7.5px] font-black text-zinc-400 tracking-widest uppercase block mt-0.5">
              Tablet Grid Terminal
            </span>
          </div>
        </div>

        {/* Dynamic Tab Controls */}
        <nav className="flex space-x-2" id="tablet_nav">
          <button
            id="tablet_tab_feed_btn"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center space-x-1 border ${
              activeTab === 'feed' || activeTab === 'map'
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Dual monitoring</span>
          </button>

          <button
            id="tablet_tab_chats_btn"
            onClick={() => setActiveTab('chats')}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center space-x-1 border ${
              activeTab === 'chats'
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Coordinations</span>
          </button>

          <button
            id="tablet_tab_profile_btn"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center space-x-1 border ${
              activeTab === 'profile'
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>account</span>
          </button>
        </nav>

        {/* Global actions */}
        <div className="flex items-center space-x-3" id="tablet_actions">
          <button
            id="tablet_header_dispatch"
            onClick={onOpenNewPost}
            className="px-3.5 py-1.5 bg-brand-sage hover:bg-brand-sage-hover text-white text-[10px] font-black uppercase tracking-wider rounded-none select-none transition-colors duration-150"
          >
            <Plus className="w-3 h-3 inline mr-1" /> Post Item
          </button>

          <button
            id="tablet_header_logout"
            onClick={onLogout}
            title="Sign Out"
            className="p-1.5 text-zinc-400 hover:text-brand-orange transition-colors cursor-pointer"
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
              <div className="border border-zinc-200 bg-white p-4">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-widest">Active operational directory</h3>
                <p className="text-xs font-bold text-zinc-700 mt-1 uppercase" id="tablet_sector_badge_title">
                  Greater Sacramento community ledger matches • {items.length} items logged.
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
                <div className="border border-zinc-200 bg-white p-4">
                  <h4 className="text-xs font-black uppercase text-zinc-400 tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-brand-orange inline-block animate-pulse rounded-full" />
                    District Map Coordinates monitoring
                  </h4>
                  <p className="text-[10px] text-zinc-500 font-extrabold uppercase mt-1 leading-normal font-mono">
                    Sacramento Sector view • click colored coordinates to view card detours
                  </p>
                </div>
                
                <div className="border border-zinc-200 p-2.5 bg-white shadow-xs">
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

        {/* Coordinations (Chats) System */}
        {activeTab === 'chats' && (
          <div className="bg-white border border-zinc-200 shadow-sm p-4" id="tablet_chats_pane">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
            />
          </div>
        )}

        {/* Member account card */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-zinc-200 shadow-sm p-4" id="tablet_profile_pane">
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
