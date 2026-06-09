import React, { useState } from 'react';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import CommunityMenuView from './CommunityMenuView';
import { Map, List, MessageSquare, User, Plus, LogOut, LifeBuoy, CalendarDays } from 'lucide-react';
import EventsView from './EventsView';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';
import CommunityStatsBar from './CommunityStatsBar';
import { AppTab } from '../lib/appTabs';

interface MobileViewProps {
  items: ItemPost[];
  events: CommunityEvent[];
  userProfile: UserProfile;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenNewPost: () => void;
  onOpenNewEvent: () => void;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem: (item: ItemPost) => void;
  onViewProfile: (userId: string) => void;
  onEditItem: (item: ItemPost) => void;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  pendingChatCompose?: PendingChatCompose | null;
  onClearPendingChatCompose?: () => void;
  onDeleteAccount?: () => void | Promise<void>;
  onRefresh: () => void;
  onRefreshEvents: () => void;
  isEventsLoading?: boolean;
  onViewEvent: (event: CommunityEvent) => void;
  engagement: ItemsEngagementApi;
  eventsEngagement: EventsEngagementApi;
  blockedUserIds?: Set<string>;
}

const NAV_ITEMS = [
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'feed' as const, label: 'Feed', icon: List },
  { id: 'events' as const, label: IN_APP.eventsTabLabel, icon: CalendarDays },
  { id: 'chats' as const, label: 'Chat', icon: MessageSquare },
  { id: 'menu' as const, label: IN_APP.menuTabLabel, icon: LifeBuoy },
  { id: 'profile' as const, label: IN_APP.accountTabLabel, icon: User },
];

export default function MobileView({
  items,
  events,
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onOpenNewEvent,
  onInitiateChat,
  onClaimSubmitted,
  onViewItem,
  onViewProfile,
  onEditItem,
  onLogout,
  onUpdateProfile,
  initialSelectedChatId,
  onClearInitialChat,
  pendingChatCompose = null,
  onClearPendingChatCompose,
  onDeleteAccount,
  onRefresh,
  onRefreshEvents,
  isEventsLoading = false,
  onViewEvent,
  engagement,
  eventsEngagement,
  blockedUserIds = new Set(),
}: MobileViewProps) {
  const [selectedMobileCategory, setSelectedMobileCategory] = useState('All Categories');
  const [selectedMobileType, setSelectedMobileType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [colorGuideOpen, setColorGuideOpen] = useState(false);

  return (
    <div id="mobile_device_workspace" className="sbn-mobile-shell flex flex-col bg-app text-app">
      <header className="sbn-mobile-header sbn-glass-nav">
        <div className="sbn-mobile-header-row">
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
        </div>
      </header>

      <main
        id="mobile_viewport_card"
        className="sbn-mobile-main"
      >
        {/* Keep map mounted so Leaflet keeps size; hide when another tab is active */}
        <div
          className={`relative h-full w-full min-h-0 ${activeTab === 'map' ? '' : 'hidden'}`}
          aria-hidden={activeTab !== 'map'}
        >
          <SacramentoMapView
            items={items}
            userProfile={userProfile}
            selectedType={selectedMobileType}
            selectedCategory={selectedMobileCategory}
            onInitiateChat={onInitiateChat}
            onClaimSubmitted={onClaimSubmitted}
            onViewItem={onViewItem}
            onEditItem={onEditItem}
            isFullScreenMobile
            mapVisible={activeTab === 'map'}
            colorGuideOpen={colorGuideOpen}
            onColorGuideOpenChange={setColorGuideOpen}
            onOpenNewPost={onOpenNewPost}
          />
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-1">
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
              onClick={() => setColorGuideOpen(true)}
              className="sbn-chip shrink-0"
              id="mobile_map_color_index_btn"
            >
              🎨 Index
            </button>
          </div>
        </div>

        <div
          className={`relative h-full w-full min-h-0 overflow-y-auto p-4 pb-8 ${activeTab === 'feed' ? '' : 'hidden'}`}
          id="mobile_directory_drawer"
          aria-hidden={activeTab !== 'feed'}
        >
          <div className="max-w-2xl mx-auto">
            <div className="sbn-page-header">
              <h2>{IN_APP.feedTitle}</h2>
              <p>
                {IN_APP.feedDescription} · {items.length} listings
              </p>
            </div>
            <CommunityStatsBar items={items} variant="compact" />
            <ItemGrid
              items={items}
              userProfile={userProfile}
              engagement={engagement}
              onInitiateChat={onInitiateChat}
              onViewItem={onViewItem}
              onViewProfile={onViewProfile}
              onRefresh={onRefresh}
            />
          </div>
          <button
            type="button"
            onClick={onOpenNewPost}
            className="sbn-fab fixed right-4 z-20"
            style={{ bottom: 'calc(var(--sbn-mobile-nav-h) + 1rem)' }}
            aria-label="New post"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div
          className={`relative h-full w-full min-h-0 overflow-y-auto p-4 pb-8 ${activeTab === 'events' ? '' : 'hidden'}`}
          id="mobile_events_dock"
          aria-hidden={activeTab !== 'events'}
        >
          <div className="max-w-2xl mx-auto">
            <div className="sbn-page-header">
              <h2>{IN_APP.eventsTitle}</h2>
              <p>{IN_APP.eventsDescription}</p>
            </div>
            <EventsView
              events={events}
              userProfile={userProfile}
              engagement={eventsEngagement}
              onViewEvent={onViewEvent}
              onViewProfile={onViewProfile}
              onRefresh={onRefreshEvents}
              isLoading={isEventsLoading}
            />
          </div>
          <button
            type="button"
            onClick={onOpenNewEvent}
            className="sbn-fab fixed right-4 z-20"
            style={{ bottom: 'calc(var(--sbn-mobile-nav-h) + 1rem)' }}
            aria-label="Post event"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div
          className={`h-full w-full min-h-0 flex flex-col overflow-hidden ${activeTab === 'chats' ? '' : 'hidden'}`}
          id="mobile_messaging_dock"
          aria-hidden={activeTab !== 'chats'}
        >
          <ChatSystem
            userProfile={userProfile}
            initialSelectedChatId={initialSelectedChatId}
            onClearInitialChat={onClearInitialChat}
            pendingChatCompose={pendingChatCompose}
            onClearPendingChatCompose={onClearPendingChatCompose}
            items={items}
            blockedUserIds={blockedUserIds}
            onViewProfile={onViewProfile}
            onItemsChanged={onRefresh}
            fullBleed
            className="h-full min-h-0"
          />
        </div>

        <div
          className={`h-full w-full min-h-0 overflow-y-auto bg-app ${activeTab === 'profile' ? '' : 'hidden'}`}
          id="mobile_profile_dock"
          aria-hidden={activeTab !== 'profile'}
        >
          <div className="max-w-2xl mx-auto">
            <div className="sbn-page-header px-4 pt-4 pb-2">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
            <UserProfileView
              userProfile={userProfile}
              userPosts={items.filter((item) => item.userId === userProfile.uid)}
              onUpdateProfile={onUpdateProfile}
              onProfilePhotoSaved={onRefresh}
              onDeleteAccount={onDeleteAccount}
              fullBleed
            />
          </div>
        </div>

        <div
          className={`h-full w-full min-h-0 overflow-y-auto bg-app ${activeTab === 'menu' ? '' : 'hidden'}`}
          id="mobile_menu_dock"
          aria-hidden={activeTab !== 'menu'}
        >
          <div className="max-w-2xl mx-auto">
            <div className="sbn-page-header px-4 pt-4 pb-2">
              <h2>{IN_APP.menuTitle}</h2>
              <p className="text-sm text-muted mt-1">{IN_APP.menuDescription}</p>
            </div>
            <CommunityMenuView
              userProfile={userProfile}
              onViewProfile={onViewProfile}
              fullBleed
            />
          </div>
        </div>
      </main>

      <footer id="mobile_sticky_footer_nav" className="sbn-mobile-nav">
        <div className="grid grid-cols-6 h-[4.25rem] px-0.5">
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
