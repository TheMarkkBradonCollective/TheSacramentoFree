import React, { useState } from 'react';
import { ItemPost, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Map, List, MessageSquare, User, Plus, LogOut } from 'lucide-react';
import CommunityFooter from './CommunityFooter';
import { IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';

interface MobileViewProps {
  items: ItemPost[];
  userProfile: UserProfile;
  activeTab: 'feed' | 'chats' | 'profile' | 'map';
  setActiveTab: (tab: 'feed' | 'chats' | 'profile' | 'map') => void;
  onOpenNewPost: () => void;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onViewItem: (item: ItemPost) => void;
  onViewProfile: (userId: string) => void;
  onEditItem: (item: ItemPost) => void;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  onRefresh: () => void;
  engagement: ItemsEngagementApi;
}

const NAV_ITEMS = [
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'feed' as const, label: 'Feed', icon: List },
  { id: 'chats' as const, label: 'Chat', icon: MessageSquare },
  { id: 'profile' as const, label: 'You', icon: User },
];

export default function MobileView({
  items,
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onInitiateChat,
  onViewItem,
  onViewProfile,
  onEditItem,
  onLogout,
  onUpdateProfile,
  initialSelectedChatId,
  onClearInitialChat,
  onRefresh,
  engagement,
}: MobileViewProps) {
  const [selectedMobileCategory, setSelectedMobileCategory] = useState('All Categories');
  const [selectedMobileType, setSelectedMobileType] = useState<'all' | 'giveaway' | 'looking'>('all');

  return (
    <div id="mobile_device_workspace" className="flex flex-col h-[100dvh] overflow-hidden bg-app text-app">
      <header className="shrink-0 sbn-glass-nav px-4 py-3 flex items-center justify-between gap-2 z-30">
        <BrandLogo
          imgClassName="h-8 w-auto max-w-[120px] object-contain rounded-lg shrink-0"
          subtitle={userProfile.neighborhood}
          showTitle
        />
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-full text-muted hover:bg-inset hover:text-app"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative" id="mobile_viewport_card">
        {activeTab === 'map' && (
          <div className="absolute inset-0">
            <SacramentoMapView
              items={items}
              userProfile={userProfile}
              selectedType={selectedMobileType}
              selectedCategory={selectedMobileCategory}
              onInitiateChat={onInitiateChat}
              onViewItem={onViewItem}
              onEditItem={onEditItem}
              isFullScreenMobile
            />
            <div className="absolute top-3 left-3 right-3 z-20 flex gap-2 overflow-x-auto pb-1">
              {(['all', 'giveaway', 'looking'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedMobileType(t)}
                  className={`sbn-chip shrink-0 ${selectedMobileType === t ? 'sbn-chip-active' : ''}`}
                >
                  {t === 'all' ? 'All' : t === 'giveaway' ? 'Giving' : 'Looking'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onOpenNewPost}
              className="sbn-fab absolute bottom-4 right-4 z-20"
              aria-label="New post"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="absolute inset-0 overflow-y-auto p-4 pb-24" id="mobile_directory_drawer">
            <div className="sbn-page-header">
              <h2>{IN_APP.feedTitle}</h2>
              <p>
                {IN_APP.feedDescription} · {items.length} listings
              </p>
            </div>
            <ItemGrid
              items={items}
              userProfile={userProfile}
              engagement={engagement}
              onInitiateChat={onInitiateChat}
              onViewItem={onViewItem}
              onViewProfile={onViewProfile}
              onRefresh={onRefresh}
            />
            <CommunityFooter compact />
            <button
              type="button"
              onClick={onOpenNewPost}
              className="sbn-fab fixed bottom-20 right-4 z-20"
              aria-label="New post"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        )}

        {activeTab === 'chats' && (
          <div
            className="absolute inset-0 flex flex-col min-h-0 overflow-hidden px-2 pt-2 pb-[4.5rem]"
            id="mobile_messaging_dock"
          >
            <ChatSystem
              userProfile={userProfile}
              initialSelectedChatId={initialSelectedChatId}
              onClearInitialChat={onClearInitialChat}
              items={items}
              onViewProfile={onViewProfile}
              onItemsChanged={onRefresh}
              className="flex-1 min-h-0 shadow-app"
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="absolute inset-0 overflow-y-auto p-4 pb-24" id="mobile_profile_dock">
            <UserProfileView userProfile={userProfile} onUpdateProfile={onUpdateProfile} />
          </div>
        )}
      </div>

      <footer id="mobile_sticky_footer_nav" className="sbn-mobile-nav shrink-0 z-30">
        <div className="grid grid-cols-4 h-[4.25rem] px-2">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`mobile_nav_${id}`}
              onClick={() => setActiveTab(id)}
              className={`sbn-mobile-nav-item ${activeTab === id ? 'sbn-mobile-nav-item-active' : ''}`}
            >
              <Icon className="w-5 h-5" strokeWidth={activeTab === id ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
}
