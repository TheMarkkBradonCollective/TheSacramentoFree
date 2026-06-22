import React from 'react';
import { useScrollInputOnFocus } from '../hooks/useKeyboardInset';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { List, MessageSquare, User, Plus, LogOut, Map, CalendarDays } from 'lucide-react';
import EventsView from './EventsView';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import BrandLogo from './BrandLogo';
import { IN_APP } from '../siteContent';
import AwardsButton from './AwardsButton';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import CommunityStatsBar from './CommunityStatsBar';
import { AppTab } from '../lib/appTabs';
import PageScrollFooter from './PageScrollFooter';

interface TabletViewProps {
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

const TABS = [
  { id: 'feed' as const, label: IN_APP.feedTabLabel, icon: List },
  { id: 'events' as const, label: IN_APP.eventsTabLabel, icon: CalendarDays },
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'chats' as const, label: 'Messages', icon: MessageSquare },
  { id: 'profile' as const, label: IN_APP.accountTabLabel, icon: User },
];

export default function TabletView({
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
}: TabletViewProps) {
  useScrollInputOnFocus();

  return (
    <div id="tablet_device_workspace" className="flex flex-col min-h-screen h-dvh mesh-bg text-app overflow-hidden">
      <header id="tablet_navbar" className="sticky top-0 z-40 sbn-glass-nav">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
        <BrandLogo subtitle={userProfile.neighborhood} showTitle />

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
          <NotificationsHubButton />
          {onOpenAwards ? <AwardsButton onClick={onOpenAwards} glow={awardsButtonGlow} /> : null}
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
        </div>
      </header>

      <main id="tablet_content_container" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-5xl w-full mx-auto p-5">
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
          <div className="space-y-5" id="tablet_events_pane">
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
                onClaimSubmitted={onClaimSubmitted}
                onViewItem={onViewItem}
                onEditItem={onEditItem}
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
            <div className="sbn-card-elevated overflow-hidden flex flex-col h-[min(28rem,calc(100dvh-12rem))] md:h-[min(32rem,calc(100dvh-13rem))]">
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
                className="h-full min-h-0 border-0 rounded-none"
              />
            </div>
            <PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-4" id="tablet_profile_pane">
            <div className="sbn-page-header">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
            <div className="sbn-card p-6">
              <UserProfileView
                userProfile={userProfile}
                userPosts={items.filter((item) => item.userId === userProfile.uid)}
                onViewPost={onViewItem}
                onDeletePost={onDeletePost}
                onUpdateProfile={onUpdateProfile}
                onProfilePhotoSaved={onRefresh}
                onDeleteAccount={onDeleteAccount}
                onViewProfile={onViewProfile}
                onOpenAwards={onOpenAwards}
                scrollToDirectorOverview={scrollToDirectorOverview}
                onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
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
