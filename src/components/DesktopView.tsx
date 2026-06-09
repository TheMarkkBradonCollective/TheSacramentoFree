import React from 'react';
import { Plus } from 'lucide-react';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import CommunityMenuView from './CommunityMenuView';
import Navbar from './Navbar';
import CommunityStatsBar from './CommunityStatsBar';
import EventsView from './EventsView';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import { AppTab } from '../lib/appTabs';
import PageScrollFooter from './PageScrollFooter';

interface DesktopViewProps {
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
  onOpenGoFundMe?: () => void;
}

export default function DesktopView({
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
  onOpenGoFundMe,
}: DesktopViewProps) {
  return (
    <div id="desktop_device_workspace" className="min-h-screen h-dvh flex flex-col mesh-bg text-app overflow-hidden">
      <Navbar
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={onOpenNewPost}
        onLogout={onLogout}
      />

      <main id="desktop_main" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
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
            <CommunityStatsBar items={items} variant="full" />
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
        )}

        {activeTab === 'events' && (
          <div className="space-y-6" id="desktop_events_view_root">
            <div className="sbn-page-header">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2>{IN_APP.eventsTitle}</h2>
                  <p>{IN_APP.eventsDescription}</p>
                </div>
                <button type="button" onClick={onOpenNewEvent} className="sbn-btn sbn-btn-primary shrink-0">
                  <Plus className="w-4 h-4" /> {IN_APP.postEventButton}
                </button>
              </div>
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
        )}

        {activeTab === 'chats' && (
          <div className="space-y-4" id="desktop_chats_view_root">
            <div className="sbn-page-header">
              <h2>{IN_APP.chatsTitle}</h2>
              <p>{IN_APP.chatsDescription}</p>
            </div>
            <div className="sbn-card-elevated overflow-hidden flex flex-col h-[min(32rem,calc(100dvh-13rem))] lg:h-[min(36rem,calc(100dvh-14rem))]">
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
                className="h-full min-h-0 border-0 rounded-none"
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
              <UserProfileView
                userProfile={userProfile}
                userPosts={items.filter((item) => item.userId === userProfile.uid)}
                onUpdateProfile={onUpdateProfile}
                onProfilePhotoSaved={onRefresh}
                onDeleteAccount={onDeleteAccount}
              />
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-4" id="desktop_menu_view_root">
            <div className="sbn-page-header">
              <h2>{IN_APP.menuTitle}</h2>
              <p>{IN_APP.menuDescription}</p>
            </div>
            <div className="sbn-card p-6 md:p-8">
              <CommunityMenuView userProfile={userProfile} onViewProfile={onViewProfile} />
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
              <SacramentoMapView
                items={items}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
                onClaimSubmitted={onClaimSubmitted}
                onViewItem={onViewItem}
                onEditItem={onEditItem}
              />
            </div>
          </div>
        )}

        {activeTab !== 'map' && <PageScrollFooter onOpenDetails={onOpenGoFundMe} />}
      </main>
    </div>
  );
}
