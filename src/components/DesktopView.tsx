import React from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import Navbar from './Navbar';

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
  onClearInitialChat
}: DesktopViewProps) {
  return (
    <div id="desktop_device_workspace" className="min-h-screen flex flex-col bg-zinc-50 text-black antialiased font-sans">
      
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
            <div className="flex justify-between items-center bg-white border border-zinc-200 p-5 shadow-xs">
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#FF4500]">COMMUNITY EXCHANGE DIRECTORY</h2>
                <p className="text-xs text-zinc-550 mt-1 font-semibold leading-relaxed">
                  Active operational records within the <span className="font-extrabold text-brand-orange uppercase">{userProfile.neighborhood} Sector</span> and Greater Sacramento District.
                </p>
              </div>
              <div className="px-3.5 py-1.5 bg-[#F9F9F6] border border-zinc-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">STATION ONLINE</span>
              </div>
            </div>

            {/* Listings Directory list view */}
            <ItemGrid
              items={items}
              userProfile={userProfile}
              onInitiateChat={onInitiateChat}
              onRefresh={() => {}}
            />
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="bg-white border border-zinc-200 p-4 shadow-sm" id="desktop_chats_view_root">
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white border border-zinc-200 p-6 shadow-sm" id="desktop_profile_view_root">
            <UserProfileView
              userProfile={userProfile}
              onUpdateProfile={onUpdateProfile}
            />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6" id="desktop_map_view_root">
            <div className="bg-white border border-zinc-200 p-5 shadow-xs">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">SACRAMENTO NEIGHBORHOOD COORDINATES MAP</h2>
              <p className="text-xs text-zinc-550 mt-1 font-semibold leading-relaxed">
                Active geographic sectors and community coordinates across Sacramento. Colors represent matching item dispatch classifications.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 p-4 shadow-xs">
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
