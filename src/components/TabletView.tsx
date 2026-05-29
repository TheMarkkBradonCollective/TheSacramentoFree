import React from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Compass, List, MessageSquare, User, Plus, LogOut, Layers } from 'lucide-react';
import CommunityFooter from './CommunityFooter';
import { IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';

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
  onRefresh: () => void;
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
  onClearInitialChat,
  onRefresh
}: TabletViewProps) {
  return (
    <div id="tablet_device_workspace" className="flex flex-col min-h-screen bg-app font-sans text-app">
      
      {/* Tablet Header Navigator */}
      <header id="tablet_navbar" className="sticky top-0 z-40 bg-surface border-b border-app text-app p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3 select-none" id="tablet_brand">
          <div className="p-2 bg-[#FF4500] text-white rounded-xl flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-bold tracking-tight text-app font-display leading-none">
              Sacramento <span className="text-[#FF4500] font-bold">Buy Nothing</span>
            </h1>
            <span className="text-[10px] font-medium text-muted tracking-normal block mt-0.5">
              {IN_APP.brandSubtitle}
            </span>
          </div>
        </div>

        {/* Dynamic Tab Controls */}
        <nav className="flex space-x-2" id="tablet_nav">
          <button
            id="tablet_tab_feed_btn"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'feed'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-inset border-app text-[#D4D4D8] hover:text-app'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Share Pile</span>
          </button>

          <button
            id="tablet_tab_map_btn"
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'map'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-inset border-app text-[#D4D4D8] hover:text-app'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-[#FF4500]" />
            <span>Explore Map</span>
          </button>

          <button
            id="tablet_tab_chats_btn"
            onClick={() => setActiveTab('chats')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center space-x-1.5 cursor-pointer border ${
              activeTab === 'chats'
                ? 'bg-[#FF4500] text-white border-[#FF4500]'
                : 'bg-inset border-app text-[#D4D4D8] hover:text-app'
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
                : 'bg-inset border-app text-[#D4D4D8] hover:text-app'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>
        </nav>

        {/* Global actions */}
        <div className="flex items-center space-x-3" id="tablet_actions">
          <ThemeToggle />
          <button
            id="tablet_header_post"
            onClick={onOpenNewPost}
            className="px-4 py-2 bg-[#FF4500] hover:bg-[#E03D00] text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{IN_APP.shareOrRequest}</span>
          </button>

          <button
            id="tablet_header_logout"
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-muted hover:text-app hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main id="tablet_content_container" className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-5">
        
        {/* Browse Feed */}
        {activeTab === 'feed' && (
          <div className="space-y-4" id="tablet_feed_pane">
            <div className="border border-app bg-surface rounded-2xl p-4">
              <h3 className="text-sm font-bold text-app tracking-tight font-display text-left">{IN_APP.feedTitle}</h3>
              <p className="text-xs text-muted mt-1 font-semibold text-left">
                {IN_APP.feedDescription} · {items.length} active listings.
              </p>
            </div>
            <ItemGrid
              items={items}
              userProfile={userProfile}
              onInitiateChat={onInitiateChat}
              onRefresh={onRefresh}
            />
            <CommunityFooter />
          </div>
        )}

        {/* Explore Map View */}
        {activeTab === 'map' && (
          <div className="space-y-4" id="tablet_map_pane">
            <div className="border border-app bg-surface rounded-2xl p-4">
              <h4 className="text-sm font-bold text-app tracking-tight font-display flex items-center gap-1.5 leading-none">
                <span className="w-2.5 h-2.5 bg-[#FF4500] inline-block animate-pulse rounded-full" />
                {IN_APP.mapTitle}
              </h4>
              <p className="text-xs text-muted mt-2 leading-normal font-medium text-left">
                {IN_APP.mapDescription}
              </p>
            </div>
            <div className="border border-app p-3.5 bg-surface rounded-2xl shadow-xs h-[550px]">
              <SacramentoMapView
                items={items}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
              />
            </div>
          </div>
        )}

        {/* Cozy Chats System */}
        {activeTab === 'chats' && (
          <div className="bg-surface border border-app rounded-2xl shadow-sm p-4 font-sans" id="tablet_chats_pane">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
              items={items}
            />
          </div>
        )}

        {/* Member account card */}
        {activeTab === 'profile' && (
          <div className="bg-surface border border-app rounded-2xl shadow-sm p-4" id="tablet_profile_pane">
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
