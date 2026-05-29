import React from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import Navbar from './Navbar';
import CommunityFooter from './CommunityFooter';
import { IN_APP } from '../siteContent';

interface DesktopViewProps {
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

export default function DesktopView({
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
}: DesktopViewProps) {
  return (
    <div id="desktop_device_workspace" className="min-h-screen flex flex-col bg-app text-app antialiased font-sans">
      
      {/* Primary Header Navbar */}
      <Navbar
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={onOpenNewPost}
        onLogout={onLogout}
      />

      {/* Main Content Workspace Layout */}
      <main id="desktop_main" className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8 space-y-6">
        
        {activeTab === 'feed' && (
          <div className="space-y-6" id="desktop_feed_view_root">
            <div className="flex justify-between items-center bg-surface border border-app p-5 rounded-2xl shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-app tracking-tight font-display text-left">{IN_APP.feedTitle}</h2>
                <p className="text-xs text-muted mt-1 font-semibold leading-relaxed text-left">
                  {IN_APP.feedDescription} · <span className="font-bold text-accent uppercase font-mono">{userProfile.neighborhood}</span>
                </p>
              </div>
              <div className="px-3 py-1.5 bg-[#FF4500]/10 border border-[#FF4500]/15 rounded-full">
                <span className="text-[10px] font-bold text-accent font-sans">🏡 ACTIVE CIRCLE</span>
              </div>
            </div>

            {/* Listings Directory list view */}
            <ItemGrid
              items={items}
              userProfile={userProfile}
              onInitiateChat={onInitiateChat}
              onRefresh={onRefresh}
            />
            <CommunityFooter />
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="bg-surface border border-app p-4 rounded-2xl shadow-sm" id="desktop_chats_view_root">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
              items={items}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-surface border border-app p-6 rounded-2xl shadow-sm" id="desktop_profile_view_root">
            <UserProfileView
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6" id="desktop_map_view_root">
            <div className="bg-surface border border-app p-5 rounded-2xl shadow-xs">
              <h2 className="text-sm font-bold text-app tracking-tight font-display text-left">{IN_APP.mapTitle}</h2>
              <p className="text-xs text-muted mt-1 font-semibold leading-relaxed text-left">
                {IN_APP.mapDescription}
              </p>
            </div>

            <div className="bg-surface border border-app p-4 rounded-2xl shadow-xs">
              <SacramentoMapView
                items={items}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
