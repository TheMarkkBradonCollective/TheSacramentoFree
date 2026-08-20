import React, { useState } from 'react';
import { useKeyboardInset, useScrollInputOnFocus } from '../hooks/useKeyboardInset';
import { CommunityEvent, ItemPost, PendingChatCompose, UserProfile } from '../types';
import SacramentoMapView from './SacramentoMapView';
import ItemGrid, { ItemsEngagementApi } from './ItemGrid';
import ChatSystem from './ChatSystem';
import UserProfileView from './UserProfileView';
import { Map, List, MessageSquare, User, Plus, CalendarDays, Sparkles } from 'lucide-react';
import EventsPanel from './EventsPanel';
import { EventsEngagementApi } from '../hooks/useEventsEngagement';
import { IN_APP } from '../siteContent';
import { MAP_CONTENT_FILTERS, getMapContentFilterLabel, type MapContentFilter } from '../lib/postType';
import BrandLogo from './BrandLogo';
import TopbarActions from './TopbarActions';
import CommunityStatsBar from './CommunityStatsBar';
import { type AnyTab, type AppTab, isStaffTab } from '../lib/appTabs';
import PageScrollFooter, { ScrollPage } from './PageScrollFooter';
import { isStaffRole, roleTheme } from '../lib/roles';
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
  onOpenNewEvent: () => void;
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
}

const MOBILE_NAV_LEFT = [
  { id: 'feed' as const, label: IN_APP.feedTabLabel, icon: List },
  { id: 'events' as const, label: IN_APP.eventsTabLabel, icon: CalendarDays },
] as const;

const MOBILE_NAV_MAP = { id: 'map' as const, label: 'Map', icon: Map };

const MOBILE_NAV_RIGHT = [
  { id: 'chats' as const, label: IN_APP.chatsTabLabel, icon: MessageSquare },
  { id: 'profile' as const, label: IN_APP.accountTabLabel, icon: User },
] as const;

export default function MobileView({
  items,
  events,
  userProfile,
  activeTab,
  setActiveTab: setActiveTabRaw,
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
}: MobileViewProps) {
  const [selectedMobileCategory, setSelectedMobileCategory] = useState('All Categories');
  const [selectedMobileType, setSelectedMobileType] = useState<MapContentFilter>('all');
  const [colorGuideOpen, setColorGuideOpen] = useState(false);
  const [mapImmersiveNav, setMapImmersiveNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [violationsFocusSessionId, setViolationsFocusSessionId] = useState<string | null>(null);

  useKeyboardInset();
  useScrollInputOnFocus();

  const isStaff = isStaffRole(userProfile.role);
  const isNative = isNativeApp();
  const theme = roleTheme(userProfile.role);
  const firstName = userProfile.displayName.trim().split(/\s+/)[0] || userProfile.displayName;
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  // For staff, the type is AnyTab; for regular users, it's AppTab.
  // We cast activeTab back to AppTab for views that only accept AppTab.
  const setActiveTab = setActiveTabRaw;
  const communityTab = isStaff
    ? (['feed', 'events', 'map', 'chats', 'profile'] as string[]).includes(activeTab)
      ? (activeTab as AppTab)
      : 'feed'
    : (activeTab as AppTab);

  if (isStaff) {
    const onStaffTab = isStaffTab(activeTab);
    const staffEyebrow = onStaffTab ? 'Staff console' : 'Community';
    const staffTitle = onStaffTab
      ? undefined
      : communityTab === 'feed'
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
        className="flex h-screen bg-app text-app overflow-hidden"
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
            onOpenAwards={onOpenAwards ?? (() => {})}
            awardsButtonGlow={awardsButtonGlow}
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
                  contentClassName="max-w-2xl mx-auto w-full p-4"
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <div className="sbn-page-header"><h2>{IN_APP.feedTitle}</h2><p>{IN_APP.feedDescription} · {items.length} listings</p></div>
                  <ItemGrid items={items} userProfile={userProfile} engagement={engagement} onInitiateChat={onInitiateChat} onStaffListingChat={onStaffListingChat} onViewItem={onViewItem} onNavigateItem={onNavigateItem} onViewProfile={onViewProfile} onRefresh={onRefresh} isLoading={!itemsHydrated} />
                </ScrollPage>
                <ScrollPage
                  className={communityTab === 'events' ? '' : 'hidden'}
                  aria-hidden={communityTab !== 'events'}
                  contentClassName="max-w-2xl mx-auto w-full p-4"
                  footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
                >
                  <div className="sbn-page-header"><h2>{IN_APP.eventsTitle}</h2></div>
                  <EventsPanel events={events} userProfile={userProfile} engagement={eventsEngagement} onViewEvent={onViewEvent} onNavigateEvent={onNavigateEvent} onStaffEventChat={onStaffEventChat} onViewProfile={onViewProfile} onRefresh={onRefreshEvents} isLoading={isEventsLoading} />
                </ScrollPage>
                <div className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`} aria-hidden={communityTab !== 'chats'}>
                  <ChatSystem userProfile={userProfile} initialSelectedChatId={initialSelectedChatId} onClearInitialChat={onClearInitialChat} initialSupportTicketId={initialSupportTicketId} onClearInitialSupportTicket={onClearInitialSupportTicket} initialChatSupportView={initialChatSupportView} onClearInitialChatSupportView={onClearInitialChatSupportView} initialChatFeedbackPanel={initialChatFeedbackPanel} onClearInitialChatFeedbackPanel={onClearInitialChatFeedbackPanel} pendingChatCompose={pendingChatCompose} onClearPendingChatCompose={onClearPendingChatCompose} items={items} blockedUserIds={blockedUserIds} onViewProfile={onViewProfile} onItemsChanged={onRefresh} onOpenGoFundMe={onOpenGoFundMe} onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} onStartDirectMessage={() => setActiveTab('feed')} onViewRelatedListing={onViewListingId} onViewRelatedEvent={onViewEventId} fullBleed className="h-full min-h-0" />
                </div>
                <ScrollPage
                  className={`bg-app ${communityTab === 'profile' ? '' : 'hidden'}`}
                  aria-hidden={communityTab !== 'profile'}
                  contentClassName="max-w-2xl mx-auto min-w-0 w-full overflow-x-hidden"
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
          imgClassName="h-8 w-8 object-cover rounded-lg shrink-0"
          showTitle
          compact
        />
        <div className="flex items-center gap-1 shrink-0">
          <TopbarActions
            userProfile={userProfile}
            onOpenAwards={onOpenAwards ?? (() => {})}
            awardsButtonGlow={awardsButtonGlow}
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
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
            <div className="flex gap-2 overflow-x-auto flex-1 min-w-0 pb-1">
              {MAP_CONTENT_FILTERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedMobileType(t)}
                  className={`sbn-chip shrink-0 ${selectedMobileType === t ? 'sbn-chip-active' : ''}`}
                >
                  {getMapContentFilterLabel(t)}
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
          )}
        </div>

        <ScrollPage
          className={communityTab === 'feed' ? '' : 'hidden'}
          id="mobile_directory_drawer"
          aria-hidden={communityTab !== 'feed'}
          contentClassName="max-w-2xl mx-auto w-full px-4 pt-4"
          footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
            {isNative && (
              <div className="sbn-native-hero mb-4">
                <p className="relative text-[11px] font-bold uppercase tracking-widest text-white/75">
                  {greeting}
                </p>
                <p className="relative font-display text-lg font-extrabold text-white mt-0.5">
                  {firstName} 👋
                </p>
                <p className="relative text-xs text-white/85 mt-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  {items.length} listings live in Sacramento right now
                </p>
              </div>
            )}
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
              onNavigateItem={onNavigateItem}
              onViewProfile={onViewProfile}
              onRefresh={onRefresh}
              isLoading={!itemsHydrated}
            />
        </ScrollPage>
        {communityTab === 'feed' && (
          <button
            type="button"
            onClick={onOpenNewPost}
            className="sbn-fab absolute right-4 bottom-4 z-20"
            aria-label="New post"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <ScrollPage
          className={communityTab === 'events' ? '' : 'hidden'}
          id="mobile_events_dock"
          aria-hidden={communityTab !== 'events'}
          contentClassName="max-w-2xl mx-auto w-full px-4 pt-4"
          footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
        >
            <div className="sbn-page-header">
              <h2>{IN_APP.eventsTitle}</h2>
              <p>
                {IN_APP.eventsDescription} · {events.length} events
              </p>
            </div>
            <CommunityStatsBar items={items} variant="compact" />
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
        </ScrollPage>
        {communityTab === 'events' && canAccessEvents && (
          <button
            type="button"
            onClick={onOpenNewEvent}
            className="sbn-fab absolute right-4 bottom-4 z-20"
            aria-label="Post event"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        <div
          className={`h-full w-full min-h-0 overflow-hidden ${communityTab === 'chats' ? '' : 'hidden'}`}
          id="mobile_messaging_dock"
          aria-hidden={communityTab !== 'chats'}
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
