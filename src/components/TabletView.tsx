import React from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { List, MessageSquare, User, Plus, LogOut, Map, Gift } from 'lucide-react';
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
  onViewItem: (item: ItemPost) => void;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  onRefresh: () => void;
}

const TABS = [
  { id: 'feed' as const, label: 'Feed', icon: List },
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'chats' as const, label: 'Messages', icon: MessageSquare },
  { id: 'profile' as const, label: 'Profile', icon: User },
];

export default function TabletView({
  items,
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onInitiateChat,
  onViewItem,
  onLogout,
  onUpdateProfile,
  initialSelectedChatId,
  onClearInitialChat,
  onRefresh,
}: TabletViewProps) {
  return (
    <div id="tablet_device_workspace" className="flex flex-col min-h-screen mesh-bg text-app">
      <header id="tablet_navbar" className="sticky top-0 z-40 sbn-glass-nav px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-accent text-on-accent rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-app">Sac Buy Nothing</p>
            <p className="text-[11px] text-muted">{userProfile.neighborhood}</p>
          </div>
        </div>

        <nav className="flex gap-1" id="tablet_nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`tablet_tab_${id}_btn`}
              onClick={() => setActiveTab(id)}
              className={`sbn-nav-tab inline-flex items-center gap-1.5 ${activeTab === id ? 'sbn-nav-tab-active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2" id="tablet_actions">
          <ThemeToggle />
          <button type="button" id="tablet_header_post" onClick={onOpenNewPost} className="sbn-btn sbn-btn-primary sbn-btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">{IN_APP.postButton}</span>
          </button>
          <button
            type="button"
            id="tablet_header_logout"
            onClick={onLogout}
            className="p-2 rounded-full text-muted hover:bg-inset hover:text-app"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main id="tablet_content_container" className="flex-1 max-w-5xl w-full mx-auto p-5">
        {activeTab === 'feed' && (
          <div className="space-y-5" id="tablet_feed_pane">
            <div className="sbn-page-header">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2>{IN_APP.feedTitle}</h2>
                  <p>
                    {IN_APP.feedDescription} · {items.length} listings
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
              onViewItem={onViewItem}
              onRefresh={onRefresh}
            />
            <CommunityFooter />
          </div>
        )}

        {activeTab === 'map' && (
          <div className="space-y-5" id="tablet_map_pane">
            <div className="sbn-page-header">
              <h2>{IN_APP.mapTitle}</h2>
              <p>{IN_APP.mapDescription}</p>
            </div>
            <div className="sbn-card-elevated p-2 h-[520px]">
              <SacramentoMapView
                items={items}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
                onViewItem={onViewItem}
              />
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="space-y-4" id="tablet_chats_pane">
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
          <div className="space-y-4" id="tablet_profile_pane">
            <div className="sbn-page-header">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
            <div className="sbn-card p-6">
              <UserProfileView userProfile={userProfile} onUpdateProfile={onUpdateProfile} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
