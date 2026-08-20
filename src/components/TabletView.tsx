import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useScrollInputOnFocus } from '../hooks/useKeyboardInset';
import { Plus } from 'lucide-react';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import EventsPanel from './EventsPanel';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import CommunityStatsBar from './CommunityStatsBar';
import { type AnyTab, type AppTab, isStaffTab } from '../lib/appTabs';
import { isStaffRole, roleTheme } from '../lib/roles';
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
  onStaffListingChat?: (item: ItemPost) => void;
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
}

const TAB_TITLES: Record<AppTab, string> = {
  feed: IN_APP.feedTitle,
  events: IN_APP.eventsTitle,
  map: IN_APP.mapTitle,
  chats: IN_APP.chatsTabLabel,
  profile: IN_APP.profileTitle,
};

/**
 * Tablet's signature shape: a permanent icon-only nav rail (never expands, never
 * collapses — that's the desktop/mobile job) plus a single comfortably-wide
 * content column. No dashboard rail here — that's what keeps it visually
 * distinct from the desktop workspace instead of just being a narrower copy.
 */
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
  onStaffListingChat,
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
}: TabletViewProps) {
  useScrollInputOnFocus();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => isStaffRole(userProfile.role));
  const [violationsFocusSessionId, setViolationsFocusSessionId] = useState<string | null>(null);
  const onStaffTab = isStaffTab(activeTab);
  const isStaff = isStaffRole(userProfile.role);
  const communityTab: AppTab = (['feed', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
    ? (activeTab as AppTab)
    : 'feed';

  const topbarAction = !onStaffTab ? (
    communityTab === 'feed' ? (
      <button type="button" onClick={onOpenNewPost} className="sbn-btn sbn-btn-primary sbn-btn-sm" id="topbar_new_post_btn">
        <Plus className="w-4 h-4" />
      </button>
    ) : communityTab === 'events' && canAccessEvents ? (
      <button type="button" onClick={onOpenNewEvent} className="sbn-btn sbn-btn-primary sbn-btn-sm" id="topbar_new_event_btn">
        <Plus className="w-4 h-4" />
      </button>
    ) : null
  ) : null;

  const theme = roleTheme(userProfile.role);

  return (
    <div
      id="tablet_device_workspace"
      className="flex h-screen bg-app text-app overflow-hidden"
      style={{ '--sbn-role-accent': theme.accent, '--sbn-role-soft': theme.soft } as CSSProperties}
    >
      <AppSidebar
        userProfile={userProfile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant={isStaff ? 'expanded' : 'rail'}
        collapsed={isStaff ? sidebarCollapsed : false}
        fullyHiddenWhenCollapsed={isStaff}
        onCollapse={() => setSidebarCollapsed(true)}
        autoCollapseOnNavigate={isStaff}
      />

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <AppTopbar
          userProfile={userProfile}
          eyebrow={onStaffTab ? 'Staff console' : 'Community'}
          title={onStaffTab ? undefined : TAB_TITLES[communityTab]}
          onOpenAwards={onOpenAwards ?? (() => {})}
          awardsButtonGlow={awardsButtonGlow}
          action={topbarAction}
          onToggleSidebar={isStaff ? () => setSidebarCollapsed((c) => !c) : undefined}
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
          <main id="tablet_main" className="sbn-workspace-main">
            {communityTab === 'feed' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="tablet_feed_pane"
                contentClassName="sbn-tablet-content space-y-4"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
                  <CommunityStatsBar items={items} variant="compact" />
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
              </ScrollPage>
            )}

            {communityTab === 'events' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="tablet_events_pane"
                contentClassName="sbn-tablet-content space-y-4"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
                  <CommunityStatsBar items={items} variant="compact" />
                  <EventsPanel
                    events={events}
                    userProfile={userProfile}
                    engagement={eventsEngagement}
                    onViewEvent={onViewEvent}
                    onNavigateEvent={onNavigateEvent}
                    onViewProfile={onViewProfile}
                    onRefresh={onRefreshEvents}
                    isLoading={isEventsLoading}
                  />
              </ScrollPage>
            )}

            {/* Keep the map mounted across tab switches — matches Desktop/Mobile. */}
            <div className={`h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`} id="tablet_map_pane">
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
                itemsHydrated={itemsHydrated}
                eventsHydrated={eventsHydrated}
                eventsEngagement={eventsEngagement}
                commentsLocked={!canAccessEvents}
              />
            </div>

            {communityTab === 'chats' && (
              <div id="tablet_chats_pane" className="h-full min-h-0 p-4">
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
                  onViewRelatedListing={onViewListingId}
                  onViewRelatedEvent={onViewEventId}
                  className="h-full min-h-0 rounded-2xl border border-app overflow-hidden bg-surface"
                />
              </div>
            )}

            {communityTab === 'profile' && (
              <ScrollPage
                className="sbn-workspace-scroll"
                id="tablet_profile_pane"
                contentClassName="sbn-tablet-content"
                footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
              >
                  <div className="sbn-card p-5">
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
