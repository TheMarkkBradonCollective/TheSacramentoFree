import React from 'react';
import { useScrollInputOnFocus } from '../hooks/useKeyboardInset';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { List, MessageSquare, User, Plus, Map, CalendarDays } from 'lucide-react';
import EventsPanel from './EventsPanel';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import BrandLogo from './BrandLogo';
import { IN_APP } from '../siteContent';
import AwardsButton from './AwardsButton';
import { NotificationsHubButton } from '../contexts/NotificationsHubContext';
import CommunityStatsBar from './CommunityStatsBar';
import { type AnyTab, type AppTab } from '../lib/appTabs';
import { isStaffRole } from '../lib/roles';
import StaffSidebar from './staff/StaffSidebar';
import StaffUsersView from './staff/StaffUsersView';
import StaffPostsView from './staff/StaffPostsView';
import StaffTeamView from './staff/StaffTeamView';
import StaffOverviewView from './staff/StaffOverviewView';
import StaffModerationView from './staff/StaffModerationView';
import StaffMessagesView from './staff/StaffMessagesView';
import StaffMeetsView from './staff/StaffMeetsView';
import PageScrollFooter from './PageScrollFooter';

interface TabletViewProps {
  items: ItemPost[];
  events: CommunityEvent[];
  userProfile: UserProfile;
  activeTab: AnyTab;
  setActiveTab: (tab: AnyTab) => void;
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
  onOpenChatById?: (chatId: string) => void;
  onViewListingId?: (itemId: string) => void | Promise<void>;
}

const TABS = [
  { id: 'feed' as const, label: IN_APP.feedTabLabel, icon: List },
  { id: 'events' as const, label: IN_APP.eventsTabLabel, icon: CalendarDays },
  { id: 'map' as const, label: 'Map', icon: Map },
  { id: 'chats' as const, label: IN_APP.chatsTabLabel, icon: MessageSquare },
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
  onOpenChatById,
  onViewListingId,
}: TabletViewProps) {
  useScrollInputOnFocus();
  const isStaff = isStaffRole(userProfile.role);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const communityTab = isStaff
    ? (['feed', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
      ? (activeTab as AppTab)
      : 'feed'
    : (activeTab as AppTab);

  if (isStaff) {
    return (
      <div id="tablet_device_workspace" className="flex h-screen bg-app text-app overflow-hidden">
        <StaffSidebar userProfile={userProfile} activeTab={activeTab} onTabChange={setActiveTab} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((c) => !c)} />
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {activeTab === 'staff_overview' && <StaffOverviewView actor={userProfile} />}
          {activeTab === 'staff_users' && <StaffUsersView actor={userProfile} onViewProfile={onViewProfile} />}
          {activeTab === 'staff_posts' && <StaffPostsView actor={userProfile} onViewItem={onViewItem} />}
          {activeTab === 'staff_messages' && (
            <StaffMessagesView
              actor={userProfile}
              onViewProfile={onViewProfile}
              onOpenChat={onOpenChatById}
              onViewListing={onViewListingId}
            />
          )}
          {activeTab === 'staff_meets' && <StaffMeetsView actor={userProfile} onViewProfile={onViewProfile} />}
          {activeTab === 'staff_moderation' && <StaffModerationView actor={userProfile} onViewProfile={onViewProfile} />}
          {activeTab === 'staff_team' && <StaffTeamView actor={userProfile} onViewProfile={onViewProfile} />}
          {!['staff_overview', 'staff_users', 'staff_posts', 'staff_messages', 'staff_meets', 'staff_moderation', 'staff_team'].includes(activeTab) && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <header className="sbn-glass-nav px-4 py-2 border-b border-app flex items-center justify-between shrink-0">
                <BrandLogo showTitle subtitle={userProfile.neighborhood} />
                <div className="flex items-center gap-2">
                  {onOpenAwards ? <AwardsButton onClick={onOpenAwards} glow={awardsButtonGlow} /> : null}
                  <button type="button" onClick={onOpenNewPost} className="sbn-btn sbn-btn-primary sbn-btn-sm">+ Post</button>
                </div>
              </header>
              <main className="flex-1 min-h-0 overflow-hidden">
                <div className={`relative h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'map'}><SacramentoMapView items={items} events={events} userProfile={userProfile} onInitiateChat={onInitiateChat} onClaimSubmitted={onClaimSubmitted} onViewItem={onViewItem} onViewEvent={onViewEvent} onEditItem={onEditItem} mapVisible={communityTab === 'map'} itemsHydrated={itemsHydrated} eventsHydrated={!isEventsLoading} eventsEngagement={eventsEngagement} commentsLocked={!canAccessEvents} /></div>
                <div className={`relative h-full min-h-0 overflow-y-auto p-6 ${communityTab === 'feed' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'feed'}><div className="max-w-3xl mx-auto"><CommunityStatsBar items={items} variant="compact" /><ItemGrid items={items} userProfile={userProfile} engagement={engagement} onInitiateChat={onInitiateChat} onViewItem={onViewItem} onViewProfile={onViewProfile} onRefresh={onRefresh} isLoading={!itemsHydrated} /></div></div>
                <div className={`relative h-full min-h-0 overflow-y-auto p-6 ${communityTab === 'events' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'events'}><div className="max-w-3xl mx-auto"><EventsPanel events={events} userProfile={userProfile} engagement={eventsEngagement} onViewEvent={onViewEvent} onViewProfile={onViewProfile} onRefresh={onRefreshEvents} isLoading={isEventsLoading} /></div></div>
                <div className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'chats'}><ChatSystem userProfile={userProfile} initialSelectedChatId={initialSelectedChatId} onClearInitialChat={onClearInitialChat} initialSupportTicketId={initialSupportTicketId} onClearInitialSupportTicket={onClearInitialSupportTicket} initialChatSupportView={initialChatSupportView} onClearInitialChatSupportView={onClearInitialChatSupportView} initialChatFeedbackPanel={initialChatFeedbackPanel} onClearInitialChatFeedbackPanel={onClearInitialChatFeedbackPanel} pendingChatCompose={pendingChatCompose} onClearPendingChatCompose={onClearPendingChatCompose} items={items} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onItemsChanged={onRefresh} onOpenGoFundMe={onOpenGoFundMe} onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} onStartDirectMessage={() => setActiveTab('feed')} fullBleed className="h-full min-h-0" /></div>
                <div className={`h-full min-h-0 overflow-y-auto ${communityTab === 'profile' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'profile'}><div className="max-w-3xl mx-auto px-4 py-4"><UserProfileView userProfile={userProfile} userPosts={items.filter((i) => i.userId === userProfile.uid)} onViewPost={onViewItem} onRepostPost={onRepostPost} onDeletePost={onDeletePost} onUpdateProfile={onUpdateProfile} onProfilePhotoSaved={onRefresh} onDeleteAccount={onDeleteAccount} onLogout={onLogout} onViewProfile={onViewProfile} onOpenAwards={onOpenAwards} scrollToDirectorOverview={scrollToDirectorOverview} onClearScrollToDirectorOverview={onClearScrollToDirectorOverview} /></div></div>
              </main>
            </div>
          )}
        </div>
      </div>
    );
  }

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
                  <Plus className="w-4 h-4" /> {IN_APP.postButton}
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
              isLoading={!itemsHydrated}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-5" id="tablet_events_pane">
            <div className="sbn-page-header">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2>{IN_APP.eventsTitle}</h2>
                  <p>
                    {IN_APP.eventsDescription} · {events.length} events
                  </p>
                </div>
                {canAccessEvents && (
                <button type="button" onClick={onOpenNewEvent} className="sbn-btn sbn-btn-primary shrink-0">
                  <Plus className="w-4 h-4" /> {IN_APP.postEventButton}
                </button>
                )}
              </div>
            </div>
            <CommunityStatsBar items={items} variant="full" />
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

        {/* Keep the map mounted across tab switches so GPS, Leaflet state, and any
            active turn-by-turn navigation session survive — matches MobileView. */}
        <div className={`space-y-5 ${activeTab === 'map' ? '' : 'hidden'}`} id="tablet_map_pane">
          <div className="sbn-page-header">
            <h2>{IN_APP.mapTitle}</h2>
            <p>{IN_APP.mapDescription}</p>
          </div>
          <div className="sbn-card-elevated p-2 h-[520px]">
            <SacramentoMapView
              items={items}
              events={events}
              userProfile={userProfile}
              onInitiateChat={onInitiateChat}
              onClaimSubmitted={onClaimSubmitted}
              onViewItem={onViewItem}
              onViewEvent={onViewEvent}
              onEditItem={onEditItem}
              mapVisible={activeTab === 'map'}
              itemsHydrated={itemsHydrated}
              eventsHydrated={!isEventsLoading}
              eventsEngagement={eventsEngagement}
              commentsLocked={!canAccessEvents}
            />
          </div>
        </div>

        {activeTab === 'chats' && (
          <div
            id="tablet_chats_pane"
            className="flex flex-col min-h-0 h-[min(36rem,calc(100dvh-7rem))] md:h-[min(40rem,calc(100dvh-6.5rem))]"
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
          <div className="space-y-4" id="tablet_profile_pane">
            <div className="sbn-page-header">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
            <div className="sbn-card p-6">
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

        {activeTab !== 'map' && activeTab !== 'chats' && (
          <PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />
        )}
      </main>
    </div>
  );
}
