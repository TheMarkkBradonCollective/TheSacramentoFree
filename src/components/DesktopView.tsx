import React, { Suspense } from 'react';
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
import { type AnyTab, type AppTab, isStaffTab } from '../lib/appTabs';
import { isStaffRole } from '../lib/roles';
import StaffSidebar from './staff/StaffSidebar';
import { OverlaySuspenseFallback } from './SuspenseFallback';
import {
  StaffUsersView,
  StaffPostsView,
  StaffTeamView,
  StaffOverviewView,
  StaffViolationsView,
  StaffAuditView,
  StaffWelcomeView,
  StaffMessagesView,
  StaffMeetsView,
} from './staff/lazyStaffViews';
import PageScrollFooter from './PageScrollFooter';

interface DesktopViewProps {
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
  onOpenTicketById?: (ticketId: string) => void;
  onViewListingId?: (itemId: string) => void | Promise<void>;
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
  onOpenChatById,
  onOpenTicketById,
  onViewListingId,
}: DesktopViewProps) {
  const isStaff = isStaffRole(userProfile.role);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const communityTab = isStaff
    ? (['feed', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
      ? (activeTab as AppTab)
      : 'feed'
    : (activeTab as AppTab);

  if (isStaff) {
    return (
      <div id="desktop_device_workspace" className="flex h-screen bg-app text-app overflow-hidden">
        <StaffSidebar userProfile={userProfile} activeTab={activeTab} onTabChange={setActiveTab} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((c) => !c)} onCollapse={() => setSidebarCollapsed(true)} autoCollapseOnNavigate />
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {isStaffTab(activeTab) && (
            <Suspense fallback={<OverlaySuspenseFallback />}>
              {activeTab === 'staff_overview' && <StaffOverviewView actor={userProfile} />}
              {activeTab === 'staff_users' && <StaffUsersView actor={userProfile} onViewProfile={onViewProfile} />}
              {activeTab === 'staff_posts' && <StaffPostsView actor={userProfile} onViewItem={onViewItem} />}
              {activeTab === 'staff_messages' && (
                <StaffMessagesView
                  actor={userProfile}
                  onViewProfile={onViewProfile}
                  onOpenChat={onOpenChatById}
                  onOpenTicket={onOpenTicketById}
                  onViewListing={onViewListingId}
                />
              )}
              {activeTab === 'staff_meets' && <StaffMeetsView actor={userProfile} onViewProfile={onViewProfile} />}
              {activeTab === 'staff_violations' && <StaffViolationsView actor={userProfile} />}
              {activeTab === 'staff_audit' && <StaffAuditView actor={userProfile} />}
              {activeTab === 'staff_welcome' && <StaffWelcomeView actor={userProfile} />}
              {activeTab === 'staff_team' && <StaffTeamView actor={userProfile} onViewProfile={onViewProfile} />}
            </Suspense>
          )}
          {!isStaffTab(activeTab) && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <Navbar userProfile={userProfile} activeTab={communityTab} setActiveTab={(t) => setActiveTab(t)} onOpenNewPost={onOpenNewPost} onOpenAwards={onOpenAwards ?? (() => {})} awardsButtonGlow={awardsButtonGlow} />
              <main className="flex-1 min-h-0 overflow-hidden">
                <div className={`relative h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'map'}><SacramentoMapView items={items} events={events} userProfile={userProfile} onInitiateChat={onInitiateChat} onClaimSubmitted={onClaimSubmitted} onViewItem={onViewItem} onViewEvent={onViewEvent} onEditItem={onEditItem} mapVisible={communityTab === 'map'} itemsHydrated={itemsHydrated} eventsHydrated={!isEventsLoading} eventsEngagement={eventsEngagement} commentsLocked={!canAccessEvents} /></div>
                <div className={`relative h-full min-h-0 overflow-y-auto p-6 ${communityTab === 'feed' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'feed'}><div className="max-w-4xl mx-auto"><CommunityStatsBar items={items} variant="compact" /><ItemGrid items={items} userProfile={userProfile} engagement={engagement} onInitiateChat={onInitiateChat} onViewItem={onViewItem} onViewProfile={onViewProfile} onRefresh={onRefresh} isLoading={!itemsHydrated} /></div></div>
                <div className={`relative h-full min-h-0 overflow-y-auto p-6 ${communityTab === 'events' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'events'}><div className="max-w-4xl mx-auto"><EventsPanel events={events} userProfile={userProfile} engagement={eventsEngagement} onViewEvent={onViewEvent} onViewProfile={onViewProfile} onRefresh={onRefreshEvents} isLoading={isEventsLoading} /></div></div>
                <div className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'chats'}><ChatSystem userProfile={userProfile} initialSelectedChatId={initialSelectedChatId} onClearInitialChat={onClearInitialChat} initialSupportTicketId={initialSupportTicketId} onClearInitialSupportTicket={onClearInitialSupportTicket} initialChatSupportView={initialChatSupportView} onClearInitialChatSupportView={onClearInitialChatSupportView} initialChatFeedbackPanel={initialChatFeedbackPanel} onClearInitialChatFeedbackPanel={onClearInitialChatFeedbackPanel} pendingChatCompose={pendingChatCompose} onClearPendingChatCompose={onClearPendingChatCompose} items={items} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onItemsChanged={onRefresh} onOpenGoFundMe={onOpenGoFundMe} onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} onStartDirectMessage={() => setActiveTab('feed')} fullBleed className="h-full min-h-0" /></div>
                <div className={`h-full min-h-0 overflow-y-auto ${communityTab === 'profile' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'profile'}><div className="max-w-4xl mx-auto px-4 py-4"><UserProfileView userProfile={userProfile} userPosts={items.filter((i) => i.userId === userProfile.uid)} onViewPost={onViewItem} onRepostPost={onRepostPost} onDeletePost={onDeletePost} onUpdateProfile={onUpdateProfile} onProfilePhotoSaved={onRefresh} onDeleteAccount={onDeleteAccount} onLogout={onLogout} onViewProfile={onViewProfile} onOpenAwards={onOpenAwards} scrollToDirectorOverview={scrollToDirectorOverview} onClearScrollToDirectorOverview={onClearScrollToDirectorOverview} /><PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} /></div></div>
              </main>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="desktop_device_workspace" className="min-h-screen h-dvh flex flex-col mesh-bg text-app overflow-hidden">
      <Navbar
        userProfile={userProfile}
        activeTab={communityTab}
        setActiveTab={setActiveTab}
        onOpenNewPost={onOpenNewPost}
        onOpenAwards={onOpenAwards ?? (() => {})}
        awardsButtonGlow={awardsButtonGlow}
      />

      <main id="desktop_main" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {communityTab === 'feed' && (
          <div className="space-y-6" id="desktop_feed_view_root">
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

        {communityTab === 'events' && (
          <div className="space-y-6" id="desktop_events_view_root">
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

        {communityTab === 'chats' && (
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

        {communityTab === 'profile' && (
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

        {/* Keep the map mounted across tab switches so GPS, Leaflet state, and any
            active turn-by-turn navigation session survive — matches MobileView. */}
        <div className={`space-y-6 ${communityTab === 'map' ? '' : 'hidden'}`} id="desktop_map_view_root">
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
              mapVisible={communityTab === 'map'}
              itemsHydrated={itemsHydrated}
              eventsHydrated={!isEventsLoading}
              eventsEngagement={eventsEngagement}
              commentsLocked={!canAccessEvents}
            />
          </div>
        </div>

        {communityTab !== 'map' && communityTab !== 'chats' && (
          <PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />
        )}
      </main>
    </div>
  );
}
