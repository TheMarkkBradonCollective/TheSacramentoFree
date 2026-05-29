import React from 'react';
import { Plus } from 'lucide-react';
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
  onRefresh,
}: DesktopViewProps) {
  return (
    <div id="desktop_device_workspace" className="min-h-screen flex flex-col mesh-bg text-app">
      <Navbar
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={onOpenNewPost}
        onLogout={onLogout}
      />

      <main id="desktop_main" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'feed' && (
          <div className="space-y-6" id="desktop_feed_view_root">
            <div className="sbn-page-header">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2>{IN_APP.feedTitle}</h2>
                  <p>
                    {IN_APP.feedDescription} · <span className="text-accent font-semibold">{userProfile.neighborhood}</span>
                  </p>
                </div>
                <button type="button" onClick={onOpenNewPost} className="sbn-btn sbn-btn-primary shrink-0">
                  <Plus className="w-4 h-4" /> Post
                </button>
              </div>
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

        {activeTab === 'chats' && (
          <div className="space-y-4" id="desktop_chats_view_root">
            <div className="sbn-page-header">
              <h2>{IN_APP.chatsTitle}</h2>
              <p>{IN_APP.chatsDescription}</p>
            </div>
            <div className="sbn-card-elevated overflow-hidden p-1">
              <ChatSystem
                userProfile={userProfile}
                initialSelectedChatId={initialSelectedChatId}
                onClearInitialChat={onClearInitialChat}
                items={items}
              />
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4" id="desktop_profile_view_root">
            <div className="sbn-page-header">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
            <div className="sbn-card p-6 md:p-8">
              <UserProfileView userProfile={userProfile} onUpdateProfile={onUpdateProfile} />
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-6" id="desktop_map_view_root">
            <div className="sbn-page-header">
              <h2>{IN_APP.mapTitle}</h2>
              <p>{IN_APP.mapDescription}</p>
            </div>
            <div className="sbn-card-elevated overflow-hidden p-2">
              <SacramentoMapView items={items} userProfile={userProfile} onInitiateChat={onInitiateChat} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
