import React, { useState } from 'react';
import { useKeyboardInset, useScrollInputOnFocus } from '../hooks/useKeyboardInset';
import { CommunityEvent, FeedPost, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Map, List, MessageSquare, CalendarDays, Newspaper } from 'lucide-react';
import EventsPanel from './EventsPanel';
import FeedView from './FeedView';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import { MAP_CONTENT_FILTERS, getMapContentFilterLabel, type MapContentFilter } from '../lib/postType';
import BrandLogo from './BrandLogo';
import TopbarActions from './TopbarActions';
import { type AnyTab, type AppTab, isStaffTab } from '../lib/appTabs';
import PageScrollFooter, { ScrollPage } from './PageScrollFooter';
import { roleTheme } from '../lib/roles';
import { hasStaffConsoleAccess, profileUiRole } from '../lib/staffInteractionMode';
import { workspaceShellClassName } from '../lib/workspaceShell';
import { isNativeApp } from '../lib/nativePlatform';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import StaffUsersView from './staff/StaffUsersView';
import StaffPostsView from './staff/StaffPostsView';
import StaffTeamView from './staff/StaffTeamView';
import StaffOverviewView from './staff/StaffOverviewView';
import StaffViolationsView from './staff/StaffViolationsView';
import StaffAuditView from './staff/StaffAuditView';
import StaffWelcomeView from './staff/StaffWelcomeView';
import StaffMessagesView from './staff/StaffMessagesView';
import StaffMeetsView from './staff/StaffMeetsView';

interface MobileViewProps {
  items: ItemPost[];
  events: CommunityEvent[];
  userProfile: UserProfile;
  activeTab: AnyTab;
  setActiveTab: (tab: AnyTab) => void;
  onOpenNewPost: () => void;
  onOpenNewStuff: () => void;
  onOpenNewEvent?: () => void;
  canAccessEvents?: boolean;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onStaffListingChat?: (item: ItemPost) => void;
  onStaffEventChat?: (event: CommunityEvent) => void;
  onClaimSubmitted?: (chatId: string) => void;
  onViewItem: (item: ItemPost) => void;
  onViewFeedPost?: (post: FeedPost) => void;
  onNavigateItem?: (item: ItemPost) => void;
  onRepostPost?: (item: ItemPost) => void;
  onDeletePost?: (item: ItemPost) => void;
  onViewProfile: (userId: string) => void;
  onEditItem: (item: ItemPost) => void;
  onLogout: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  initialFocusMessageRequests?: boolean;
  onClearInitialFocusMessageRequests?: () => void;
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

const MOBILE_NAV_LEFT = [
  { id: 'feed' as const, label: IN_APP.feedTabLabel, icon: Newspaper },
  { id: 'stuff' as const, label: IN_APP.stuffTabLabel, icon: List },
] as const;

const MOBILE_NAV_MAP = { id: 'map' as const, label: 'Map', icon: Map };

const MOBILE_NAV_RIGHT = [
  { id: 'events' as const, label: IN_APP.eventsTabLabel, icon: CalendarDays },
  { id: 'chats' as const, label: IN_APP.chatsTabLabel, icon: MessageSquare },
] as const;

export default function MobileView({
  items,
  events,
  userProfile,
  activeTab,
  setActiveTab: setActiveTabRaw,
  onOpenNewPost,
  onOpenNewStuff,
  onOpenNewEvent,
  canAccessEvents = true,
  onInitiateChat,
  onStaffListingChat,
  onStaffEventChat,
  onClaimSubmitted,
  onViewItem,
  onViewFeedPost,
  onNavigateItem,
  onRepostPost,
  onDeletePost,
  onViewProfile,
  onEditItem,
  onLogout,
  onUpdateProfile,
  initialSelectedChatId,
  onClearInitialChat,
  initialFocusMessageRequests = false,
  onClearInitialFocusMessageRequests,
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
}: MobileViewProps) {
  const [selectedMobileCategory, setSelectedMobileCategory] = useState('All Categories');
  const [selectedMobileType, setSelectedMobileType] = useState<MapContentFilter>('all');
  const [colorGuideOpen, setColorGuideOpen] = useState(false);
  const [mapImmersiveNav, setMapImmersiveNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [violationsFocusSessionId, setViolationsFocusSessionId] = useState<string | null>(null);

  useKeyboardInset();
  useScrollInputOnFocus();

  const showStaffConsole = hasStaffConsoleAccess(userProfile);
  const isNative = isNativeApp();
  const theme = roleTheme(profileUiRole(userProfile));
  // For staff, the type is AnyTab; for regular users, it's AppTab.
  // We cast activeTab back to AppTab for views that only accept AppTab.
  const setActiveTab = setActiveTabRaw;
  const communityTab = showStaffConsole
    ? (['feed', 'stuff', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
      ? (activeTab as AppTab)
      : 'map'
    : (activeTab as AppTab);

  const openAccount = () => setActiveTab('profile');

  if (showStaffConsole) {
    const onStaffTab = isStaffTab(activeTab);
    const staffEyebrow = onStaffTab ? 'Staff console' : 'Community';
    const staffTitle = onStaffTab
      ? undefined
      : communityTab === 'feed'
        ? IN_APP.communityFeedTitle
        : communityTab === 'stuff'
          ? IN_APP.feedTitle
          : communityTab === 'events'
            ? IN_APP.eventsTitle
            : communityTab === 'map'
              ? IN_APP.mapTitle
              : communityTab === 'chats'
                ? IN_APP.chatsTabLabel
                : IN_APP.profileTitle;

    return (
      <div
        id="mobile_device_workspace"
        className={workspaceShellClassName()}
        style={{ '--sbn-role-accent': theme.accent, '--sbn-role-soft': theme.soft } as React.CSSProperties}
      >
        {!sidebarCollapsed && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 sbn-sidebar-backdrop animate-in fade-in duration-200"
            aria-label="Close navigation menu"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        <AppSidebar
          userProfile={userProfile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="expanded"
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(true)}
          autoCollapseOnNavigate
          fullyHiddenWhenCollapsed
          overlay
        />
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          <AppTopbar
            userProfile={userProfile}
            eyebrow={staffEyebrow}
            title={staffTitle}
            drawerOpen={!sidebarCollapsed}
            compactActions
            onOpenAccount={openAccount}
            onOpenAwards={onOpenAwards}
            awardsButtonGlow={awardsButtonGlow}
            accountActive={activeTab === 'profile'}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          />

          {/* Staff panel views */}
          {onStaffTab && (
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
          )}

          {/* Community tab content within the sidebar layout */}
          {!onStaffTab && (
            <main className="flex-1 min-h-0 overflow-hidden">
                {/* Reuse all existing community tab views */}
                <div className={`relative h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'map'}>
                  <SacramentoMapView items={items} events={events} userProfile={userProfile} selectedType={selectedMobileType} selectedCategory={selectedMobileCategory} onInitiateChat={onInitiateChat} onClaimSubmitted={onClaimSubmitted} onViewItem={onViewItem} onViewEvent={onViewEvent} onEditItem={onEditItem} isFullScreenMobile mapVisible={communityTab === 'map'} colorGuideOpen={colorGuideOpen} onColorGuideOpenChange={setColorGuideOpen} onOpenNewPost={onOpenNewPost} onImmersiveModeChange={setMapImmersiveNav} itemsHydrated={itemsHydrated} eventsHydrated={eventsHydrated} eventsEngagement={eventsEngagement} commentsLocked={!canAccessEvents} />
                </div>
                <ScrollPage
                  className={communityTab === 'feed' ? '' : 'hidden'}
                  aria-hidden={communityTab !== 'feed'}
                  contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
                  pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <FeedView userProfile={userProfile} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onViewFeedPost={onViewFeedPost} />
                </ScrollPage>
                <ScrollPage
                  className={communityTab === 'stuff' ? '' : 'hidden'}
                  aria-hidden={communityTab !== 'stuff'}
                  contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
                  pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <ItemGrid items={items} userProfile={userProfile} engagement={engagement} onInitiateChat={onInitiateChat} onStaffListingChat={onStaffListingChat} onViewItem={onViewItem} onNavigateItem={onNavigateItem} onViewProfile={onViewProfile} onRefresh={onRefresh} isLoading={!itemsHydrated} onOpenNewPost={onOpenNewStuff} />
                </ScrollPage>
                <ScrollPage
                  className={communityTab === 'events' ? '' : 'hidden'}
                  aria-hidden={communityTab !== 'events'}
                  contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
                  pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <EventsPanel events={events} userProfile={userProfile} engagement={eventsEngagement} onViewEvent={onViewEvent} onNavigateEvent={onNavigateEvent} onStaffEventChat={onStaffEventChat} onViewProfile={onViewProfile} onRefresh={onRefreshEvents} isLoading={isEventsLoading} onOpenNewEvent={onOpenNewEvent} canAccessEvents={canAccessEvents} />
                </ScrollPage>
                <div className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'chats'}>
                  <ChatSystem userProfile={userProfile} initialSelectedChatId={initialSelectedChatId} onClearInitialChat={onClearInitialChat} initialFocusMessageRequests={initialFocusMessageRequests} onClearInitialFocusMessageRequests={onClearInitialFocusMessageRequests} initialSupportTicketId={initialSupportTicketId} onClearInitialSupportTicket={onClearInitialSupportTicket} initialChatSupportView={initialChatSupportView} onClearInitialChatSupportView={onClearInitialChatSupportView} initialChatFeedbackPanel={initialChatFeedbackPanel} onClearInitialChatFeedbackPanel={onClearInitialChatFeedbackPanel} pendingChatCompose={pendingChatCompose} onClearPendingChatCompose={onClearPendingChatCompose} items={items} events={events} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onItemsChanged={onRefresh} onOpenGoFundMe={onOpenGoFundMe} onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} onStartDirectMessage={onStartDirectMessage} onViewRelatedListing={onViewListingId} onViewRelatedEvent={onViewEventId} fullBleed className="h-full min-h-0" />
                </div>
                <ScrollPage
                  className={`bg-app ${communityTab === 'profile' ? '' : 'hidden'}`}
                  aria-hidden={communityTab !== 'profile'}
                  contentClassName="max-w-2xl mx-auto min-w-0 w-full overflow-x-hidden"
                  pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <UserProfileView userProfile={userProfile} userPosts={items.filter((item) => item.userId === userProfile.uid)} onViewPost={onViewItem} onRepostPost={onRepostPost} onDeletePost={onDeletePost} onUpdateProfile={onUpdateProfile} onProfilePhotoSaved={onRefresh} onDeleteAccount={onDeleteAccount} onLogout={onLogout} onViewProfile={onViewProfile} onOpenAwards={onOpenAwards} onOpenDownload={onOpenDownload} scrollToDirectorOverview={scrollToDirectorOverview} onClearScrollToDirectorOverview={onClearScrollToDirectorOverview} fullBleed />
                </ScrollPage>
              </main>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      id="mobile_device_workspace"
      className={`sbn-mobile-shell flex flex-col bg-app text-app${mapImmersiveNav ? ' sbn-immersive-nav' : ''}`}
    >
      <header
        className={`sbn-mobile-header sbn-glass-nav${mapImmersiveNav ? ' sbn-mobile-chrome-hidden' : ''}${isNative ? ' sbn-native-header' : ''}`}
        style={isNative ? ({ '--sbn-role-accent': theme.accent } as React.CSSProperties) : undefined}
      >
        <div className="sbn-mobile-header-row">
        <BrandLogo
          compact
          showTitle
          className="flex items-center gap-2 min-w-0 flex-1"
          imgClassName="h-9 w-9 object-cover rounded-lg shrink-0"
        />
        <div className="flex items-center shrink-0">
          <TopbarActions
            userProfile={userProfile}
            onOpenAccount={openAccount}
            onOpenAwards={onOpenAwards}
            awardsButtonGlow={awardsButtonGlow}
            accountActive={activeTab === 'profile'}
            compact
          />
        </div>
        </div>
      </header>

      <main
        id="mobile_viewport_card"
        className="sbn-mobile-main"
      >
        {/* Keep map mounted so Leaflet keeps size; hide when another tab is active */}
        <div
          className={`relative h-full w-full min-h-0 ${communityTab === 'map' ? '' : 'hidden'}`}
          aria-hidden={communityTab !== 'map'}
        >
          <SacramentoMapView
            items={items}
            events={events}
            userProfile={userProfile}
            selectedType={selectedMobileType}
            selectedCategory={selectedMobileCategory}
            onInitiateChat={onInitiateChat}
            onClaimSubmitted={onClaimSubmitted}
            onViewItem={onViewItem}
            onViewEvent={onViewEvent}
            onEditItem={onEditItem}
            isFullScreenMobile
            mapVisible={communityTab === 'map'}
            colorGuideOpen={colorGuideOpen}
            onColorGuideOpenChange={setColorGuideOpen}
            onOpenNewPost={onOpenNewPost}
            onImmersiveModeChange={setMapImmersiveNav}
            itemsHydrated={itemsHydrated}
            eventsHydrated={eventsHydrated}
            eventsEngagement={eventsEngagement}
            commentsLocked={!canAccessEvents}
          />
          {!mapImmersiveNav && (
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-w-0 -mx-0.5 px-0.5">
              {MAP_CONTENT_FILTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedMobileType(t)}
                  className={`sbn-chip shrink-0 sbn-map-filter-chip ${selectedMobileType === t ? 'sbn-chip-active' : ''}`}
                >
                  {getMapContentFilterLabel(t)}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setColorGuideOpen(true)}
                className="sbn-chip shrink-0 sbn-map-filter-chip"
                id="mobile_map_color_index_btn"
              >
                🎨 Index
              </button>
            </div>
          </div>
          )}
        </div>

        <ScrollPage
          className={communityTab === 'feed' ? '' : 'hidden'}
          id="mobile_feed_dock"
          aria-hidden={communityTab !== 'feed'}
          contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
          pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
          <FeedView userProfile={userProfile} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onViewFeedPost={onViewFeedPost} />
        </ScrollPage>

        <ScrollPage
          className={communityTab === 'stuff' ? '' : 'hidden'}
          id="mobile_directory_drawer"
          aria-hidden={communityTab !== 'stuff'}
          contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
          pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
            <ItemGrid
              items={items}
              userProfile={userProfile}
              engagement={engagement}
              onInitiateChat={onInitiateChat}
              onViewItem={onViewItem}
              onNavigateItem={onNavigateItem}
              onViewProfile={onViewProfile}
              onRefresh={onRefresh}
              isLoading={!itemsHydrated}
              onOpenNewPost={onOpenNewStuff}
            />
        </ScrollPage>

        <ScrollPage
          className={communityTab === 'events' ? '' : 'hidden'}
          id="mobile_events_dock"
          aria-hidden={communityTab !== 'events'}
          contentClassName="max-w-2xl mx-auto w-full px-3 pt-2"
          pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
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
              onOpenNewEvent={onOpenNewEvent}
              canAccessEvents={canAccessEvents}
            />
        </ScrollPage>

        <div
          className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`}
          id="mobile_messaging_dock"
          aria-hidden={communityTab !== 'chats'}
        >
          <ChatSystem
            userProfile={userProfile}
            initialSelectedChatId={initialSelectedChatId}
            onClearInitialChat={onClearInitialChat}
            initialFocusMessageRequests={initialFocusMessageRequests}
            onClearInitialFocusMessageRequests={onClearInitialFocusMessageRequests}
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
            fullBleed
            className="h-full min-h-0"
          />
        </div>

        <ScrollPage
          className={`bg-app ${communityTab === 'profile' ? '' : 'hidden'}`}
          id="mobile_profile_dock"
          aria-hidden={communityTab !== 'profile'}
          contentClassName="max-w-2xl mx-auto min-w-0 w-full overflow-x-hidden"
          pinToBottom
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
            <div className="sbn-page-header px-4 pt-4 pb-2">
              <h2>{IN_APP.profileTitle}</h2>
            </div>
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
              fullBleed
            />
        </ScrollPage>
      </main>

      <footer id="mobile_sticky_footer_nav" className={`sbn-mobile-nav${mapImmersiveNav ? ' sbn-mobile-chrome-hidden' : ''}`}>
        <div className="sbn-mobile-nav-bar">
          <div className="sbn-mobile-nav-side">
            {MOBILE_NAV_LEFT.map(({ id, label, icon: Icon }) => {
              const isActive = communityTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  id={`mobile_nav_${id}`}
                  onClick={() => setActiveTab(id)}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`sbn-mobile-nav-item flex-1 min-w-0 ${isActive ? 'sbn-mobile-nav-item-active' : ''}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            id="mobile_nav_map"
            onClick={() => setActiveTab(MOBILE_NAV_MAP.id)}
            aria-label={MOBILE_NAV_MAP.label}
            aria-current={communityTab === MOBILE_NAV_MAP.id ? 'page' : undefined}
            className={`sbn-mobile-nav-map ${communityTab === MOBILE_NAV_MAP.id ? 'sbn-mobile-nav-map-active' : ''}`}
          >
            <Map className="w-6 h-6" strokeWidth={communityTab === MOBILE_NAV_MAP.id ? 2.5 : 2} />
          </button>

          <div className="sbn-mobile-nav-side">
            {MOBILE_NAV_RIGHT.map(({ id, label, icon: Icon }) => {
              const isActive = communityTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  id={`mobile_nav_${id}`}
                  onClick={() => setActiveTab(id)}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`sbn-mobile-nav-item flex-1 min-w-0 ${isActive ? 'sbn-mobile-nav-item-active' : ''}`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
