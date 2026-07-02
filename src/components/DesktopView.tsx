import React from 'react';
import { Plus } from 'lucide-react';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import Navbar from './Navbar';
import CommunityStatsBar from './CommunityStatsBar';
import EventsPanel from './EventsPanel';
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
  canAccessEvents?: boolean;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem: (item: ItemPost) => void;
  onRepostPost?: (item: ItemPost) => void;
  onDeletePost?: (item: ItemPost) => void;
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
  itemsHydrated?: boolean;
  onViewEvent: (event: CommunityEvent) => void;
  engagement: ItemsEngagementApi;
  eventsEngagement: EventsEngagementApi;
  blockedUserIds?: Set<string>;
  onOpenGoFundMe?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenAwards?: () => void;
  awardsButtonGlow?: boolean;
  initialChatFeedbackPanel?: 'reviews' | 'report' | 'staffReports' | null;
  onClearInitialChatFeedbackPanel?: () => void;
  initialSupportTicketId?: string | null;
  onClearInitialSupportTicket?: () => void;
  initialChatSupportView?: 'list' | 'new' | null;
  onClearInitialChatSupportView?: () => void;
  scrollToDirectorOverview?: boolean;
  onClearScrollToDirectorOverview?: () => void;
}

export default function DesktopView({
  items,
  events,
  userProfile,
  activeTab,
  setActiveTab,
  onOpenNewPost,
  onOpenNewEvent,
  canAccessEvents = true,
  onInitiateChat,
  onClaimSubmitted,
  onViewItem,
  onRepostPost,
  onDeletePost,
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
  itemsHydrated = true,
  onViewEvent,
  engagement,
  eventsEngagement,
  blockedUserIds = new Set(),
  onOpenGoFundMe,
  onOpenPrivacy,
  onOpenTerms,
  onOpenAwards,
  awardsButtonGlow = false,
  initialChatFeedbackPanel = null,
  onClearInitialChatFeedbackPanel,
  initialSupportTicketId = null,
  onClearInitialSupportTicket,
  initialChatSupportView = null,
  onClearInitialChatSupportView,
  scrollToDirectorOverview,
  onClearScrollToDirectorOverview,
}: DesktopViewProps) {
  return (
    <div id="desktop_device_workspace" className="min-h-screen h-dvh flex flex-col mesh-bg text-app overflow-hidden">
      <Navbar
        userProfile={userProfile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={onOpenNewPost}
        onOpenAwards={onOpenAwards ?? (() => {})}
        awardsButtonGlow={awardsButtonGlow}
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
                {canAccessEvents && (
                <button type="button" onClick={onOpenNewEvent} className="sbn-btn sbn-btn-primary shrink-0">
                  <Plus className="w-4 h-4" /> {IN_APP.postEventButton}
                </button>
                )}
              </div>
            </div>
            <EventsPanel
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
          <div
            id="desktop_chats_view_root"
            className="flex flex-col min-h-0 h-[min(42rem,calc(100dvh-6rem))] lg:h-[min(44rem,calc(100dvh-5.5rem))]"
          >
            <ChatSystem
                userProfile={userProfile}
                initialSelectedChatId={initialSelectedChatId}
                onClearInitialChat={onClearInitialChat}
                initialSupportTicketId={initialSupportTicketId}
                onClearInitialSupportTicket={onClearInitialSupportTicket}
                initialChatSupportView={initialChatSupportView}
                onClearInitialChatSupportView={onClearInitialChatSupportView}
                initialChatFeedbackPanel={initialChatFeedbackPanel}
                onClearInitialChatFeedbackPanel={onClearInitialChatFeedbackPanel}
                pendingChatCompose={pendingChatCompose}
                onClearPendingChatCompose={onClearPendingChatCompose}
                items={items}
                blockedUserIds={blockedUserIds}
                onViewProfile={onViewProfile}
                onItemsChanged={onRefresh}
                onOpenGoFundMe={onOpenGoFundMe}
                onOpenPrivacy={onOpenPrivacy}
                onOpenTerms={onOpenTerms}
                onStartDirectMessage={() => setActiveTab('feed')}
                className="h-full min-h-0 flex-1 rounded-2xl border border-app overflow-hidden bg-surface"
              />
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
                onViewPost={onViewItem}
                onRepostPost={onRepostPost}
                onDeletePost={onDeletePost}
                onUpdateProfile={onUpdateProfile}
                onProfilePhotoSaved={onRefresh}
                onDeleteAccount={onDeleteAccount}
                onLogout={onLogout}
                onViewProfile={onViewProfile}
                onOpenAwards={onOpenAwards}
                scrollToDirectorOverview={scrollToDirectorOverview}
                onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
              />
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
                events={events}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
                onClaimSubmitted={onClaimSubmitted}
                onViewItem={onViewItem}
                onViewEvent={onViewEvent}
                onEditItem={onEditItem}
                itemsHydrated={itemsHydrated}
                eventsEngagement={eventsEngagement}
                commentsLocked={!canAccessEvents}
              />
            </div>
          </div>
        )}

        {activeTab !== 'map' && activeTab !== 'chats' && (
          <PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />
        )}
      </main>
    </div>
  );
}
