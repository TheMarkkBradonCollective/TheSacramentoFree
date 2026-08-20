import React, { useState } from 'react';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import DashboardRail from './DashboardRail';
import EventsPanel from './EventsPanel';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import { type AnyTab, type AppTab, isStaffTab } from '../lib/appTabs';
import { roleTheme } from '../lib/roles';
import { hasStaffConsoleAccess, profileUiRole } from '../lib/staffInteractionMode';
import StaffUsersView from './staff/StaffUsersView';
import StaffPostsView from './staff/StaffPostsView';
import StaffTeamView from './staff/StaffTeamView';
import StaffOverviewView from './staff/StaffOverviewView';
import StaffViolationsView from './staff/StaffViolationsView';
import StaffAuditView from './staff/StaffAuditView';
import StaffWelcomeView from './staff/StaffWelcomeView';
import StaffMessagesView from './staff/StaffMessagesView';
import StaffMeetsView from './staff/StaffMeetsView';
import PageScrollFooter, { ScrollPage } from './PageScrollFooter';

interface DesktopViewProps {
  items: ItemPost[];
  events: CommunityEvent[];
  userProfile: UserProfile;
  activeTab: AnyTab;
  setActiveTab: (tab: AnyTab) => void;
  onOpenNewPost: () => void;
  onOpenNewEvent?: () => void;
  canAccessEvents?: boolean;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onStaffEventChat?: (event: CommunityEvent) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem: (item: ItemPost) => void;
  onNavigateItem?: (item: ItemPost) => void;
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
  eventsHydrated?: boolean;
  onViewEvent: (event: CommunityEvent) => void;
  onNavigateEvent?: (event: CommunityEvent) => void;
  engagement: ItemsEngagementApi;
  eventsEngagement: EventsEngagementApi;
  blockedUserIds?: Set<string>;
  onOpenGoFundMe?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onOpenDownload?: () => void;
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
  onOpenTicketById?: (ticketId: string) => void;
  onViewListingId?: (itemId: string) => void | Promise<void>;
  onViewEventId?: (eventId: string) => void;
  onStartDirectMessage?: () => void;
}

const TAB_TITLES: Record<AppTab, string> = {
  feed: IN_APP.feedTitle,
  events: IN_APP.eventsTitle,
  map: IN_APP.mapTitle,
  chats: IN_APP.chatsTabLabel,
  profile: IN_APP.profileTitle,
};

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
  onStaffListingChat,
  onStaffEventChat,
  onClaimSubmitted,
  onViewItem,
  onNavigateItem,
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
  eventsHydrated = true,
  onViewEvent,
  onNavigateEvent,
  engagement,
  eventsEngagement,
  blockedUserIds = new Set(),
  onOpenGoFundMe,
  onOpenPrivacy,
  onOpenTerms,
  onOpenDownload,
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
  onOpenTicketById,
  onViewListingId,
  onViewEventId,
  onStartDirectMessage,
}: DesktopViewProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => hasStaffConsoleAccess(userProfile));
  const [violationsFocusSessionId, setViolationsFocusSessionId] = useState<string | null>(null);
  const onStaffTab = isStaffTab(activeTab);
  const showStaffConsole = hasStaffConsoleAccess(userProfile);
  const communityTab: AppTab = (['feed', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
    ? (activeTab as AppTab)
    : 'feed';

  const topbarAction = null;

  const theme = roleTheme(profileUiRole(userProfile));

  return (
    <div
      id="desktop_device_workspace"
      className="flex h-screen bg-app text-app overflow-hidden"
      style={{ '--sbn-role-accent': theme.accent, '--sbn-role-soft': theme.soft } as React.CSSProperties}
    >
      <AppSidebar
        userProfile={userProfile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="expanded"
        collapsed={sidebarCollapsed}
        onToggleCollapse={showStaffConsole ? undefined : () => setSidebarCollapsed((c) => !c)}
        fullyHiddenWhenCollapsed={showStaffConsole}
        onCollapse={() => setSidebarCollapsed(true)}
        autoCollapseOnNavigate={showStaffConsole}
      />

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <AppTopbar
          userProfile={userProfile}
          eyebrow={onStaffTab ? 'Staff console' : 'Community'}
          title={onStaffTab ? undefined : TAB_TITLES[communityTab]}
          onOpenAwards={onOpenAwards ?? (() => {})}
          awardsButtonGlow={awardsButtonGlow}
          action={topbarAction}
          onToggleSidebar={showStaffConsole ? () => setSidebarCollapsed((c) => !c) : undefined}
        />

        {onStaffTab ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {activeTab === 'staff_overview' && <StaffOverviewView actor={userProfile} />}
            {activeTab === 'staff_users' && <StaffUsersView actor={userProfile} onViewProfile={onViewProfile} />}
            {activeTab === 'staff_posts' && <StaffPostsView actor={userProfile} onViewItem={onViewItem} onViewEvent={onViewEvent} />}
            {activeTab === 'staff_messages' && (
              <StaffMessagesView
                actor={userProfile}
                onViewProfile={onViewProfile}
                onOpenChat={onOpenChatById}
                onOpenTicket={onOpenTicketById}
                onViewListing={onViewListingId}
              />
            )}
            {activeTab === 'staff_meets' && (
              <StaffMeetsView
                actor={userProfile}
                onViewProfile={onViewProfile}
                onOpenViolations={(sessionId) => {
                  setViolationsFocusSessionId(sessionId);
                  setActiveTab('staff_violations');
                }}
              />
            )}
            {activeTab === 'staff_violations' && (
              <StaffViolationsView
                actor={userProfile}
                focusSessionId={violationsFocusSessionId}
                onClearFocusSession={() => setViolationsFocusSessionId(null)}
              />
            )}
            {activeTab === 'staff_audit' && <StaffAuditView actor={userProfile} />}
            {activeTab === 'staff_welcome' && <StaffWelcomeView actor={userProfile} />}
            {activeTab === 'staff_team' && <StaffTeamView actor={userProfile} onViewProfile={onViewProfile} />}
          </div>
        ) : (
          <main id="desktop_main" className="sbn-workspace-main">
            {communityTab === 'feed' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="desktop_feed_view_root"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
                <div className="sbn-dash-grid">
                  <div className="min-w-0 space-y-5">
                    <ItemGrid
                      items={items}
                      userProfile={userProfile}
                      engagement={engagement}
                      onInitiateChat={onInitiateChat}
                      onStaffListingChat={onStaffListingChat}
                      onViewItem={onViewItem}
                      onNavigateItem={onNavigateItem}
                      onViewProfile={onViewProfile}
                      onRefresh={onRefresh}
                      isLoading={!itemsHydrated}
                    />
                  </div>
                  <DashboardRail
                    items={items}
                    userProfile={userProfile}
                    canAccessEvents={canAccessEvents}
                    onOpenAwards={onOpenAwards}
                    onViewProfile={onViewProfile}
                  />
                </div>
              </ScrollPage>
            )}

            {communityTab === 'events' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="desktop_events_view_root"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
                <div className="sbn-dash-grid">
                  <div className="min-w-0 space-y-5">
                    <EventsPanel
                      events={events}
                      userProfile={userProfile}
                      engagement={eventsEngagement}
                      onViewEvent={onViewEvent}
                      onNavigateEvent={onNavigateEvent}
                      onStaffEventChat={onStaffEventChat}
                      onViewProfile={onViewProfile}
                      onRefresh={onRefreshEvents}
                      isLoading={isEventsLoading}
                    />
                  </div>
                  <DashboardRail
                    items={items}
                    userProfile={userProfile}
                    canAccessEvents={canAccessEvents}
                    onOpenAwards={onOpenAwards}
                    onViewProfile={onViewProfile}
                  />
                </div>
              </ScrollPage>
            )}

            {/* Keep the map mounted across tab switches so GPS, Leaflet state, and any
                active turn-by-turn navigation session survive — matches MobileView. */}
            <div
              className={`h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`}
              id="desktop_map_view_root"
            >
              <SacramentoMapView
                items={items}
                events={events}
                userProfile={userProfile}
                onInitiateChat={onInitiateChat}
                onClaimSubmitted={onClaimSubmitted}
                onViewItem={onViewItem}
                onViewEvent={onViewEvent}
                onEditItem={onEditItem}
                mapVisible={communityTab === 'map'}
                onOpenNewPost={onOpenNewPost}
                itemsHydrated={itemsHydrated}
                eventsHydrated={eventsHydrated}
                eventsEngagement={eventsEngagement}
                commentsLocked={!canAccessEvents}
              />
            </div>

            {communityTab === 'chats' && (
              <div id="desktop_chats_view_root" className="h-full min-h-0 p-4">
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
                  events={events}
                  blockedUserIds={blockedUserIds}
                  onViewProfile={onViewProfile}
                  onItemsChanged={onRefresh}
                  onOpenGoFundMe={onOpenGoFundMe}
                  onOpenPrivacy={onOpenPrivacy}
                  onOpenTerms={onOpenTerms}
                  onStartDirectMessage={onStartDirectMessage}
                  onViewRelatedListing={onViewListingId}
                  onViewRelatedEvent={onViewEventId}
                  className="h-full min-h-0 rounded-2xl border border-app overflow-hidden bg-surface"
                />
              </div>
            )}

            {communityTab === 'profile' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="desktop_profile_view_root"
                contentClassName="max-w-4xl mx-auto px-6 py-6"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
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
                      onOpenDownload={onOpenDownload}
                      scrollToDirectorOverview={scrollToDirectorOverview}
                      onClearScrollToDirectorOverview={onClearScrollToDirectorOverview}
                    />
                  </div>
              </ScrollPage>
            )}
          </main>
        )}
      </div>
    </div>
  );
}
