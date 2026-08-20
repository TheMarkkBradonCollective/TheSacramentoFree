import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useItemsEngagement } from './hooks/useItemsEngagement';
import { useItemsRealtime } from './hooks/useItemsRealtime';
import { useSavedItemPushAlerts } from './hooks/useSavedItemPushAlerts';
import { useEventsEngagement } from './hooks/useEventsEngagement';
import { useEventsRealtime } from './hooks/useEventsRealtime';
import { useAuthorProfilesRealtime } from './hooks/useAuthorProfilesRealtime';
import { useBlockedUsers } from './hooks/useBlockedUsers';
import { UserProfile, ItemPost, PendingChatCompose, CommunityEvent } from './types';
import PublicSite from './components/public/PublicSite';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemDetailView from './components/ItemDetailView';
import PickupAttributionModal from './components/PickupAttributionModal';
import EventDetailView from './components/EventDetailView';
import PostEventModal from './components/PostEventModal';
import NeighborProfileView from './components/NeighborProfileView';
import MobileView from './components/MobileView';
import TabletView from './components/TabletView';
import DesktopView from './components/DesktopView';
import { 
  supabase, 
  getSupabaseProfile, 
  upsertSupabaseProfile,
  profileFromAuthUser,
  getSupabaseItems,
  getSupabaseItemById,
  getSupabaseEvents,
  cancelSupabaseEvent,
  updateSupabaseItemStatus,
  deleteSupabaseItem,
  deleteOwnAccount,
  isAccountRestricted,
  migrateLocalSavedItemsToDb,
  getClaimRequestById,
  staffGetListingById,
  findOrCreateStaffListingOutreachTicket,
  findOrCreateStaffEventOutreachTicket,
} from './supabase';
import { confirmStaffEventOutreach, confirmStaffListingOutreach } from './lib/staffChatSafety';
import { isStaffRole } from './lib/roles';
import { isStaffActingOfficial } from './lib/staffInteractionMode';
import { APP_LOGO_SRC, SITE, SUPPORT, AWARDS, PRIVACY, TERMS } from './siteContent';
import GoGetRingCoordinator from './components/goget/GoGetRingCoordinator';
import FullScreenPanel from './components/FullScreenPanel';
import GoFundMeSupport from './components/GoFundMeSupport';
import PrivacyPolicyContent from './components/PrivacyPolicyContent';
import TermsOfUseContent from './components/TermsOfUseContent';
import AwardsPanel from './components/AwardsPanel';
import StaffApplyView from './components/StaffApplyView';
import { registerStaffApplyOpener } from './lib/staffApplyOpen';
import { detectInstallKind } from './lib/installContext';
import { reportAppInstall } from './lib/deviceTracking';
import { type AnyTab, type AppTab } from './lib/appTabs';
import {
  appTabPath,
  parseStoredTab,
  parseTabFromHistoryState,
  parseTabFromPathname,
  persistActiveTab,
  pushActiveTabHistory,
  readPersistedTab,
  clearPersistedTab,
  TAB_HISTORY_KEY,
  TAB_STORAGE_KEY,
  withTabInHistoryState,
} from './lib/appNavigation';
import {
  readCachedProfile,
  readCachedItems,
  writeCachedProfile,
  writeCachedItems,
  clearSessionCache,
  sessionStubFromProfile,
} from './lib/sessionCache';
import AppBootSplash from './components/AppBootSplash';
import GuestItemDetailView from './components/public/GuestItemDetailView';
import { CLIENT_PUSH_DISPATCH_ENABLED } from './lib/pushConfig';
import { parsePushDeepLink, shouldPreservePushDeepLink, type PushDeepLinkTarget } from './lib/pushDeepLink';
import { clearNotificationDataOnLogout, usePushDeepLinkNavigation } from './hooks/usePushNotifications';
import PushNotificationCelebration from './components/PushNotificationCelebration';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfUseModal from './components/TermsOfUseModal';
import { acceptPrivacy, isPrivacyAccepted } from './lib/privacyPolicyPrompt';
import { acceptTerms, isTermsAccepted } from './lib/termsPolicyPrompt';
import { useConfirm } from './contexts/ConfirmContext';
import { NotificationsHubProvider, openNotificationsHub, closeNotificationsHub } from './contexts/NotificationsHubContext';
import { PresenceProvider } from './contexts/PresenceContext';
import { useAwardsGlow } from './hooks/useAwardsGlow';
import { useEventsUnlock } from './hooks/useEventsUnlock';
import { useReviewPrompt } from './hooks/useReviewPrompt';
import ReviewPromptModal from './components/ReviewPromptModal';
import { clearActiveNavSession, hasActiveNavSession } from './lib/navigationSession';
import { isEventEditable, isEventPast } from './lib/eventRsvp';
import { completedActionNeedsAttribution } from './lib/pickupAttribution';
import { parsePublicRoute, publicRouteFromPathname, isDownloadRoute, downloadPagePath, normalizePublicPath } from './public/routes';
import DownloadPage from './components/public/pages/DownloadPage';
import { canDownloadApkFromWebsite } from './lib/apkWebsiteAccess';
import { isPlayReviewBrowseOnly } from './lib/playReviewAccount';
import { BrowseOnlyProvider } from './contexts/BrowseOnlyContext';

const DEFAULT_OFFLINE_ITEMS: ItemPost[] = [];
const PENDING_DEEP_LINK_KEY = 'sbn_pending_deep_link_v1';

function sameFeedSnapshot<T extends { id: string; updatedAt?: unknown; status?: unknown }>(
  current: T[],
  next: T[],
): boolean {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i].id !== next[i].id) return false;
    if (String(current[i].updatedAt ?? '') !== String(next[i].updatedAt ?? '')) return false;
    if (String(current[i].status ?? '') !== String(next[i].status ?? '')) return false;
  }
  return true;
}

function readPendingDeepLinkPath(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(PENDING_DEEP_LINK_KEY);
  if (stored) return stored;
  const pathname = window.location.pathname;
  return pathname && pathname !== '/' ? pathname : null;
}

function rememberPendingDeepLinkPath(path: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PENDING_DEEP_LINK_KEY, path);
  } catch {
    // sessionStorage may be unavailable
  }
}

function clearPendingDeepLinkPath() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_DEEP_LINK_KEY);
  } catch {
    // ignore
  }
}

function clearAppPathname(tab: AppTab = 'map') {
  if (typeof window === 'undefined') return;
  const nextPath = appTabPath(tab);
  if (window.location.pathname === nextPath && !window.location.search && !window.location.hash) return;
  try {
    window.history.replaceState(window.history.state, '', nextPath);
  } catch {
    // ignore
  }
}

function readInitialAuthState() {
  const cachedProfile = readCachedProfile();
  return {
    sessionUser: cachedProfile ? sessionStubFromProfile(cachedProfile) : null,
    userProfile: cachedProfile,
    items: readCachedItems(),
  };
}

export default function App() {
  const initialAuth = readInitialAuthState();
  const [sessionUser, setSessionUser] = useState<any>(initialAuth.sessionUser);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialAuth.userProfile);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const profileSyncRef = useRef<string | null>(null);
  const handlingPopStateRef = useRef(false);
  const loadItemsRef = useRef<
    (isBackground?: boolean, attempt?: number, options?: { guest?: boolean }) => Promise<void>
  >(async () => {});
  const itemsCountRef = useRef(initialAuth.items.length);
  const eventsCountRef = useRef(0);
  const itemsLoadGenRef = useRef(0);
  const lastSignedInUserIdRef = useRef<string | null>(initialAuth.userProfile?.uid ?? null);
  const logoutCleanupDoneRef = useRef(false);
  const hadSessionOnMountRef = useRef(!!initialAuth.sessionUser);
  const pathnameSeededRef = useRef(false);
  const [activeTab, setActiveTab] = useState<AnyTab>(() => readPersistedTab(initialAuth.userProfile?.uid));
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPostEventModal, setShowPostEventModal] = useState(false);
  const [showGoFundMeDetail, setShowGoFundMeDetail] = useState(false);
  const [legalPanel, setLegalPanel] = useState<'privacy' | 'terms' | null>(null);
  const [showAwardsPanel, setShowAwardsPanel] = useState(false);
  const [showStaffApplyPanel, setShowStaffApplyPanel] = useState(false);
  const [privacyGateOpen, setPrivacyGateOpen] = useState(false);
  const [termsGateOpen, setTermsGateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [addEventDatesMode, setAddEventDatesMode] = useState(false);
  const [detailItem, setDetailItem] = useState<ItemPost | null>(null);
  const [detailNavigateOnOpen, setDetailNavigateOnOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<CommunityEvent | null>(null);
  const [detailEventNavigateOnOpen, setDetailEventNavigateOnOpen] = useState(false);
  const [detailEventUpdating, setDetailEventUpdating] = useState(false);
  const [detailUpdating, setDetailUpdating] = useState(false);
  const [pickupAttributionItem, setPickupAttributionItem] = useState<ItemPost | null>(null);
  const [pickupAttributionMode, setPickupAttributionMode] = useState<'complete' | 'edit'>('complete');
  const [viewProfileUid, setViewProfileUid] = useState<string | null>(null);
  const [showDownloadPage, setShowDownloadPage] = useState(() => isDownloadRoute());
  const [initialChatFeedbackPanel, setInitialChatFeedbackPanel] = useState<
    'reviews' | 'report' | 'staffReports' | null
  >(null);
  const [initialSupportTicketId, setInitialSupportTicketId] = useState<string | null>(null);
  const [initialChatSupportView, setInitialChatSupportView] = useState<'list' | 'new' | null>(null);
  const [scrollToDirectorOverview, setScrollToDirectorOverview] = useState(false);
  const [items, setItems] = useState<ItemPost[]>(initialAuth.items);
  useEffect(() => {
    itemsCountRef.current = items.length;
  }, [items.length]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  useEffect(() => {
    eventsCountRef.current = events.length;
  }, [events.length]);
  const { confirm, alert } = useConfirm();
  const { blockedUserIds, reloadBlockedUsers } = useBlockedUsers(userProfile?.uid);
  const { shouldGlow: awardsButtonGlow, markAwardsSeen } = useAwardsGlow(userProfile?.uid);
  const { canAccessEvents } = useEventsUnlock(userProfile);

  const handleOpenAwards = useCallback(() => {
    markAwardsSeen();
    setShowAwardsPanel(true);
  }, [markAwardsSeen]);

  const handleOpenDownload = useCallback(() => {
    setShowDownloadPage(true);
    try {
      window.history.pushState(window.history.state, '', downloadPagePath());
    } catch (err) {
      console.warn('History pushState unavailable for download route:', err);
    }
  }, []);

  const handleOpenStaffApply = useCallback(() => {
    setShowStaffApplyPanel(true);
  }, []);

  useEffect(() => {
    registerStaffApplyOpener(userProfile ? handleOpenStaffApply : null);
    return () => registerStaffApplyOpener(null);
  }, [userProfile, handleOpenStaffApply]);

  const goHomeTab = useCallback(() => {
    setActiveTab('map');
    persistActiveTab('map', userProfile?.uid);
  }, [userProfile?.uid]);

  const clearAuthenticatedUiState = useCallback(() => {
    setEvents([]);
    setEventsHydrated(false);
    setIsEventsLoading(false);
    setItemsHydrated(false);
    setIsItemsLoading(false);
    setDetailItem(null);
    setDetailNavigateOnOpen(false);
    setDetailEvent(null);
    setDetailEventNavigateOnOpen(false);
    setViewProfileUid(null);
    setShowPostModal(false);
    setShowPostEventModal(false);
    setShowGoFundMeDetail(false);
    setLegalPanel(null);
    setShowAwardsPanel(false);
    setShowStaffApplyPanel(false);
    setEditingItem(null);
    setEditingEvent(null);
    setAddEventDatesMode(false);
    setPickupAttributionItem(null);
    setInitialSelectedChatId(null);
    setPendingChatCompose(null);
    setInitialChatFeedbackPanel(null);
    setInitialSupportTicketId(null);
    setInitialChatSupportView(null);
    setScrollToDirectorOverview(false);
    setGuestDetailItem(null);
    setErrorMsg('');
    pathnameSeededRef.current = false;
  }, []);

  /** Reset in-app tab state on sign-out without leaving an authenticated `/map` URL for the now-signed-out guest. */
  const resetTabStateForSignOut = useCallback(() => {
    const signedOutUserId = lastSignedInUserIdRef.current ?? undefined;
    setActiveTab('map');
    clearPersistedTab(signedOutUserId);
    if (typeof window === 'undefined') return;
    try {
      window.history.replaceState(null, '', '/');
    } catch (err) {
      console.warn('History replaceState unavailable during sign-out cleanup:', err);
    }
  }, []);

  const closeTransientOverlays = useCallback(() => {
    setDetailItem(null);
    setDetailNavigateOnOpen(false);
    setDetailEvent(null);
    setDetailEventNavigateOnOpen(false);
    setViewProfileUid(null);
    setLegalPanel(null);
    setShowAwardsPanel(false);
    setShowStaffApplyPanel(false);
    setShowGoFundMeDetail(false);
    closeNotificationsHub();
  }, []);

  const handleTabChange = useCallback(
    (tab: AnyTab) => {
      closeTransientOverlays();
      setActiveTab(tab);
      persistActiveTab(tab as AppTab, userProfile?.uid);
    },
    [closeTransientOverlays, userProfile?.uid],
  );

  const navigateToTab = useCallback(
    (tab: AnyTab) => {
      setActiveTab(tab);
      persistActiveTab(tab as AppTab, userProfile?.uid);
    },
    [userProfile?.uid],
  );

  const pendingDeepLinkPathRef = useRef<string | null>(
    typeof window !== 'undefined' ? readPendingDeepLinkPath() : null,
  );

  const refreshLegalGates = useCallback(() => {
    if (!sessionUser?.id) {
      setPrivacyGateOpen(false);
      setTermsGateOpen(false);
      return;
    }
    const privacyOk = isPrivacyAccepted(sessionUser.id);
    setPrivacyGateOpen(!privacyOk);
    setTermsGateOpen(privacyOk && !isTermsAccepted(sessionUser.id));
  }, [sessionUser?.id]);

  useEffect(() => {
    refreshLegalGates();
  }, [refreshLegalGates]);

  useEffect(() => {
    if (!userProfile?.uid || !hasActiveNavSession(userProfile.uid)) return;
    setActiveTab('map');
    persistActiveTab('map', userProfile.uid);
  }, [userProfile?.uid]);

  const visibleItems = useMemo(
    () => items.filter((item) => !blockedUserIds.has(item.userId)),
    [items, blockedUserIds],
  );
  const itemIds = useMemo(() => visibleItems.map((i) => i.id), [visibleItems]);
  const engagement = useItemsEngagement(itemIds, userProfile, blockedUserIds);
  const visibleEvents = useMemo(
    () => events.filter((event) => !blockedUserIds.has(event.userId)),
    [events, blockedUserIds],
  );
  const eventIds = useMemo(() => visibleEvents.map((e) => e.id), [visibleEvents]);
  const eventsEngagement = useEventsEngagement(eventIds, userProfile, blockedUserIds);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [itemsHydrated, setItemsHydrated] = useState(() => initialAuth.items.length > 0);
  const [eventsHydrated, setEventsHydrated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [guestDetailItem, setGuestDetailItem] = useState<ItemPost | null>(null);

  useEffect(() => {
    if (!sessionUser || !errorMsg) return;
    const message = errorMsg;
    setErrorMsg('');
    void alert({ message });
  }, [errorMsg, sessionUser, alert]);

  // Open existing chat thread (e.g. after claim)
  const [initialSelectedChatId, setInitialSelectedChatId] = useState<string | null>(null);
  // Draft compose — chat row is created on first sent message
  const [pendingChatCompose, setPendingChatCompose] = useState<PendingChatCompose | null>(null);

  // Responsive device classification configuration
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 768) return 'mobile';
      if (w < 1024) return 'tablet';
      return 'desktop';
    }
    return 'mobile';
  });

  // PWA states and install trigger handlers
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed & launched from screen icon)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    
    if (isStandaloneMode) {
      setIsAlreadyInstalled(true);
      void reportAppInstall();
      return;
    }

    // Check device type
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = localStorage.getItem('pwa_banner_dismissed_v1');
      if (!isDismissed) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsAlreadyInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      void reportAppInstall();
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIosDevice && !isStandaloneMode) {
      const isDismissed = localStorage.getItem('pwa_banner_dismissed_v1');
      if (!isDismissed) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsAlreadyInstalled(true);
        void reportAppInstall(userProfile?.uid);
      }
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    }
  };

  const handleDismissPrompt = () => {
    setShowInstallBanner(false);
    localStorage.setItem('pwa_banner_dismissed_v1', 'true');
  };

  useEffect(() => {
    if (detectInstallKind() === 'browser') return;
    void reportAppInstall(userProfile?.uid);
  }, [userProfile?.uid]);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setDeviceType('mobile');
      } else if (w < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist the active tab to localStorage for refresh recovery.
  // URL and history-stack updates are handled by the effect below so that
  // user-initiated tab clicks push a new history entry (enabling back-button
  // tab navigation) while programmatic navigations via navigateToTab() still
  // only replace the current entry.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionUser?.id) return;
    try {
      window.localStorage.setItem(`${TAB_STORAGE_KEY}_${sessionUser.id}`, activeTab);
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, [activeTab, sessionUser?.id]);

  useEffect(() => {
    if (sessionUser && !hadSessionOnMountRef.current) {
      const pendingPath = pendingDeepLinkPathRef.current ?? readPendingDeepLinkPath();
      const hasDeepLink = Boolean(pendingPath && parsePushDeepLink(pendingPath));
      if (!hasDeepLink) {
        goHomeTab();
      }
    }
    hadSessionOnMountRef.current = !!sessionUser;
  }, [sessionUser, goHomeTab]);

  // Guests browse the public marketing site on hash routes (see usePublicRoute).
  // Everything below manages the AUTHENTICATED app's tab <-> URL sync, and must
  // never touch window.history for a signed-out visitor — doing so used to wipe
  // the public site's `#/...` hash on every load, corrupting shareable links and
  // sending guests back to the homepage on refresh.
  //
  // sessionUserRef is updated synchronously during render (not in a useEffect):
  // a same-document hash navigation (PublicSite redirecting to `#/` on mount)
  // fires a native `popstate` event as part of a CHILD component's effect,
  // which runs before this component's own effects in the same commit — an
  // effect-based ref sync would still read the previous (stale) sessionUser
  // value at that point and let a signed-out popstate slip through.
  const sessionUserRef = useRef(sessionUser);
  sessionUserRef.current = sessionUser;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathnameSeededRef.current) return;
    if (!sessionUser) return;
    pathnameSeededRef.current = true;

    // Capture public marketing destinations before tab URL seeding replaces them.
    const hashRoute = window.location.hash ? parsePublicRoute(window.location.hash) : null;
    const pathRoute = publicRouteFromPathname(window.location.pathname);
    const publicDest =
      hashRoute && hashRoute !== 'home' && hashRoute !== 'not-found' && hashRoute !== 'login'
        ? hashRoute
        : pathRoute && pathRoute !== 'home' && pathRoute !== 'login'
          ? pathRoute
          : null;
    if (publicDest === 'privacy') {
      setLegalPanel('privacy');
      setShowGoFundMeDetail(false);
    } else if (publicDest === 'terms') {
      setLegalPanel('terms');
      setShowGoFundMeDetail(false);
    } else if (publicDest === 'gofundme') {
      setShowGoFundMeDetail(true);
      setLegalPanel(null);
    } else if (publicDest === 'download') {
      setShowDownloadPage(true);
      try {
        window.history.replaceState(window.history.state, '', downloadPagePath());
      } catch (err) {
        console.warn('History replaceState unavailable for download route:', err);
      }
      return;
    }

    // Last-tab replaceState used to wipe /updates, /news, /listing/… before the
    // deep-link effect ran, so signed-in neighbors never reached Updates/News.
    const currentPath = window.location.pathname;
    const hashPath = window.location.hash
      ? normalizePublicPath(window.location.hash.replace(/^#\/?/, ''))
      : '';
    const pendingFromDeepLink = shouldPreservePushDeepLink(parsePushDeepLink(currentPath))
      ? currentPath
      : hashPath === 'news' || hashPath === 'announcements'
        ? '/news'
        : null;
    const pendingFromPublic = !pendingFromDeepLink && publicDest === 'updates' ? '/updates' : null;
    const pendingPath = pendingFromDeepLink || pendingFromPublic;
    if (pendingPath) {
      pendingDeepLinkPathRef.current = pendingPath;
      rememberPendingDeepLinkPath(pendingPath);
      return;
    }

    const initialTab = readPersistedTab(initialAuth.userProfile?.uid);
    if (initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    try {
      window.history.replaceState(withTabInHistoryState(initialTab), '', appTabPath(initialTab));
    } catch (err) {
      console.warn('History replaceState unavailable, tab persistence fallback active:', err);
    }
  }, [sessionUser, activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncDownloadRoute = () => setShowDownloadPage(isDownloadRoute());
    window.addEventListener('popstate', syncDownloadRoute);
    return () => window.removeEventListener('popstate', syncDownloadRoute);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = (event: PopStateEvent) => {
      if (!sessionUserRef.current) return;

      const nextTab = parseTabFromHistoryState(event.state);
      if (nextTab) {
        handlingPopStateRef.current = true;
        setActiveTab(nextTab);
        return;
      }

      // If browser history has no app-tab state, keep users in-app by restoring last tab.
      // Prefer the pathname of the new URL (window.location has already been updated by
      // the time popstate fires), then fall back to localStorage, then default to 'map'.
      const fallbackTab =
        parseTabFromPathname(window.location.pathname) ||
        parseStoredTab(window.localStorage.getItem(`sbn_active_tab_v1_${sessionUserRef.current?.id ?? ''}`)) ||
        'map';
      handlingPopStateRef.current = true;
      setActiveTab(fallbackTab);
      try {
        window.history.pushState(withTabInHistoryState(fallbackTab), '', appTabPath(fallbackTab));
      } catch (err) {
        console.warn('History pushState fallback failed:', err);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasHandlingPopState = handlingPopStateRef.current;
    handlingPopStateRef.current = false;
    if (!sessionUser) return;
    if (wasHandlingPopState) return;

    const currentHistoryTab = parseTabFromHistoryState(window.history.state);
    if (currentHistoryTab === activeTab) return;
    pushActiveTabHistory(activeTab, sessionUser?.id);
  }, [activeTab, sessionUser?.id]);

  // Keep listening for in-session hash changes (e.g. footer links that set #/privacy).
  useEffect(() => {
    if (!sessionUser || typeof window === 'undefined') return;

    const openPublicDestination = () => {
      if (!window.location.hash) return;
      const route = parsePublicRoute(window.location.hash);
      if (route === 'privacy') {
        setLegalPanel('privacy');
        setShowGoFundMeDetail(false);
      } else if (route === 'terms') {
        setLegalPanel('terms');
        setShowGoFundMeDetail(false);
      } else if (route === 'gofundme') {
        setShowGoFundMeDetail(true);
        setLegalPanel(null);
      }
    };

    window.addEventListener('hashchange', openPublicDestination);
    return () => window.removeEventListener('hashchange', openPublicDestination);
  }, [sessionUser]);

  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);

  const withTimeoutReject = <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
    ]);

  const waitForSupabaseAuth = async (maxMs = 8_000): Promise<boolean> => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      try {
        const {
          data: { session },
        } = await withTimeoutReject(supabase.auth.getSession(), 3_000, 'getSession timed out');
        if (session?.access_token) return true;
      } catch (err) {
        console.warn('Waiting for Supabase auth session:', err);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  };

  /** Enter the app immediately from auth metadata — DB sync runs in background. */
  const applySession = useCallback((user: any) => {
    if (user?.id && lastSignedInUserIdRef.current && lastSignedInUserIdRef.current !== user.id) {
      clearAuthenticatedUiState();
    }
    if (user?.id) lastSignedInUserIdRef.current = user.id;
    setSessionUser((prev) => (prev?.id === user.id ? prev : user));
    setUserProfile((prev) => {
      if (prev?.uid === user.id) return prev;
      return profileFromAuthUser(user);
    });
    setIsAuthLoading(false);
    setAuthBootstrapping(false);
  }, [clearAuthenticatedUiState]);

  const syncProfileFromDb = useCallback(async (user: any) => {
    if (!user?.id) return;
    if (profileSyncRef.current === user.id) return;
    profileSyncRef.current = user.id;

    try {
      const fromDb = await withTimeout(getSupabaseProfile(user.id), 6000, null);
        if (fromDb) {
          setUserProfile(fromDb);
          writeCachedProfile(fromDb);
          return;
        }

      const seed = profileFromAuthUser(user);
      await upsertSupabaseProfile(seed);
    } catch (err) {
      console.warn('Background profile sync failed:', err);
    } finally {
      if (profileSyncRef.current === user.id) {
        profileSyncRef.current = null;
      }
    }
  }, []);

  // 1. Subscribe to Supabase Auth State changes
  useEffect(() => {
    let cancelled = false;

    const finishBootstrap = () => {
      if (!cancelled) {
        setAuthBootstrapping(false);
        setIsAuthLoading(false);
      }
    };

    const bootFailsafe = setTimeout(finishBootstrap, 4000);

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          console.warn('Error checking supabase session:', error);
        }

      if (session?.user) {
        logoutCleanupDoneRef.current = false;
        applySession(session.user);
        void syncProfileFromDb(session.user);
      } else if (!hadSessionOnMountRef.current) {
        // No cached session — this is a real guest. Do not wipe a restored
        // session if getSession() races ahead of INITIAL_SESSION.
        setSessionUser(null);
        setUserProfile(null);
        clearSessionCache();
        clearAuthenticatedUiState();
      }
      } catch (err) {
        if (!cancelled) {
          console.warn('Error checking supabase session:', err);
        }
      } finally {
        clearTimeout(bootFailsafe);
        finishBootstrap();
      }
    };

    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'TOKEN_REFRESHED') return;

      if (session?.user) {
        const alreadyInApp = !!lastSignedInUserIdRef.current;
        logoutCleanupDoneRef.current = false;
        applySession(session.user);
        // Defer DB sync — never await inside this callback (Supabase auth deadlock).
        setTimeout(() => {
          if (!cancelled) {
            void syncProfileFromDb(session.user);
          }
        }, 0);
        if (event === 'SIGNED_IN' && !alreadyInApp) {
          const pendingPath = pendingDeepLinkPathRef.current ?? readPendingDeepLinkPath();
          const hasDeepLink = Boolean(pendingPath && parsePushDeepLink(pendingPath));
          if (!hasDeepLink) {
            goHomeTab();
          }
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setTimeout(() => {
            if (!cancelled) void loadItemsRef.current(true);
          }, 100);
        }
      } else {
        if (event === 'SIGNED_OUT') {
          const signedOutUserId = lastSignedInUserIdRef.current;
          lastSignedInUserIdRef.current = null;
          profileSyncRef.current = null;
          if (!logoutCleanupDoneRef.current) {
            logoutCleanupDoneRef.current = true;
            void clearNotificationDataOnLogout(signedOutUserId);
          }
          clearSessionCache();
          clearAuthenticatedUiState();
          setSessionUser(null);
          setUserProfile(null);
          setItems([]);
          setIsAuthLoading(false);
          resetTabStateForSignOut();
          return;
        }
        // INITIAL_SESSION with no user: keep a restored cache. getSession() often
        // races and would otherwise flash the public site through the signed-in app.
        if (event === 'INITIAL_SESSION' && hadSessionOnMountRef.current) {
          return;
        }
        if (event !== 'INITIAL_SESSION') return;
        lastSignedInUserIdRef.current = null;
        profileSyncRef.current = null;
        clearSessionCache();
        clearAuthenticatedUiState();
        setSessionUser(null);
        setUserProfile(null);
        setItems([]);
        setIsAuthLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(bootFailsafe);
      subscription.unsubscribe();
    };
  }, [applySession, syncProfileFromDb, goHomeTab, clearAuthenticatedUiState, resetTabStateForSignOut]);

  const loadItems = useCallback(
    async (isBackground = false, attempt = 0, options?: { guest?: boolean }) => {
      const isGuest = options?.guest === true;
      if (!isGuest && (!userProfile?.uid || !sessionUser?.id)) return;

      const gen = ++itemsLoadGenRef.current;
      const isStale = () => gen !== itemsLoadGenRef.current;
      const hasVisibleItems = itemsCountRef.current > 0;

      // Foreground spinner only when we have nothing to show yet.
      if (!isBackground && !hasVisibleItems) {
        setIsItemsLoading(true);
      }

      const scheduleRetry = () => {
        if (attempt >= 2) return;
        window.setTimeout(() => {
          // Only the latest load generation may retry.
          if (gen !== itemsLoadGenRef.current) return;
          // Retries are always background so the UI is never stuck on "Loading…".
          void loadItemsRef.current(true, attempt + 1, options);
        }, 1200 * (attempt + 1));
      };

      let loadedOk = false;
      try {
        if (!isGuest) {
          // Best-effort wait for the JWT. Do not block the feed forever —
          // public RLS still allows reading active listings without a session.
          await waitForSupabaseAuth(4_000);
          if (isStale()) return;
        }

        const loadedItems = await withTimeoutReject(
          getSupabaseItems(),
          15_000,
          'Items fetch timed out',
        );
        if (isStale()) return;
        loadedOk = true;

        setItems((current) => {
          if (!isGuest && loadedItems.length === 0 && current.length > 0) {
            console.warn('Items fetch returned empty — keeping cached listings until auth syncs.');
            return current;
          }
          return sameFeedSnapshot(current, loadedItems) ? current : loadedItems;
        });
        if (loadedItems.length > 0) {
          writeCachedItems(loadedItems);
        } else {
          scheduleRetry();
        }
      } catch (err) {
        console.warn('Supabase items fetch failed:', err);
        if (isStale()) return;
        setItems((current) => (current.length === 0 ? DEFAULT_OFFLINE_ITEMS : current));
        scheduleRetry();
      } finally {
        // Only the latest generation clears the spinner. Older in-flight loads
        // must not leave "Loading…" up after a newer attempt finishes.
        if (gen === itemsLoadGenRef.current) {
          setIsItemsLoading(false);
          // A failed/empty fetch must not look like “the community has 0 posts”
          // unless we actually completed a load (or we already have cached cards).
          if (loadedOk || itemsCountRef.current > 0 || attempt >= 2) {
            setItemsHydrated(true);
          }
        }
      }
    },
    [userProfile?.uid, sessionUser?.id],
  );

  useEffect(() => {
    loadItemsRef.current = loadItems;
  }, [loadItems]);

  const sessionReady = !!sessionUser && !!userProfile;

  // Load public listing preview for guests
  useEffect(() => {
    if (authBootstrapping || sessionUser) return;
    void loadItems(false, 0, { guest: true });
  }, [authBootstrapping, sessionUser, loadItems]);

  // Load listings once auth is ready, then keep in sync via Supabase Realtime
  useEffect(() => {
    if (!sessionReady) return;
    loadItems(itemsCountRef.current > 0);
  }, [sessionReady, userProfile?.uid, loadItems, authBootstrapping]);

  useEffect(() => {
    if (userProfile) {
      writeCachedProfile(userProfile);
    }
  }, [userProfile]);

  const loadEvents = useCallback(async (isBackground = false) => {
    if (!userProfile || !sessionUser) return;
    const hasVisibleEvents = eventsCountRef.current > 0;
    if (!isBackground && !hasVisibleEvents) setIsEventsLoading(true);
    try {
      const loaded = await getSupabaseEvents();
      setEvents((current) => (sameFeedSnapshot(current, loaded) ? current : loaded));
    } catch (err) {
      console.warn('Supabase events fetch failed:', err);
    } finally {
      setIsEventsLoading(false);
      setEventsHydrated(true);
    }
  }, [userProfile?.uid, sessionUser?.id]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadEvents(eventsCountRef.current > 0);
  }, [sessionReady, userProfile?.uid, loadEvents]);

  useItemsRealtime(sessionReady, setItems);
  useSavedItemPushAlerts(sessionReady, userProfile?.uid, items);
  useEventsRealtime(sessionReady, setEvents);
  useAuthorProfilesRealtime(sessionReady, setItems);

  useEffect(() => {
    if (!detailEvent) return;
    const updated = events.find((e) => e.id === detailEvent.id);
    if (!updated) {
      setDetailEvent(null);
      return;
    }
    if (
      updated.updatedAt !== detailEvent.updatedAt ||
      updated.status !== detailEvent.status ||
      updated.title !== detailEvent.title
    ) {
      setDetailEvent(updated);
    }
  }, [events, detailEvent]);

  // Keep detail view in sync when this listing changes live (not on unrelated feed updates)
  useEffect(() => {
    if (!detailItem) return;
    const updated = items.find((i) => i.id === detailItem.id);
    if (!updated) {
      setDetailItem(null);
      return;
    }
    if (
      updated.updatedAt !== detailItem.updatedAt ||
      updated.status !== detailItem.status ||
      updated.title !== detailItem.title ||
      (updated.description !== detailItem.description && updated.description) ||
      updated.pickupAttributionType !== detailItem.pickupAttributionType ||
      updated.pickupAttributionLabel !== detailItem.pickupAttributionLabel
    ) {
      setDetailItem({
        ...updated,
        description: updated.description || detailItem.description,
        imageUrl: updated.imageUrl || detailItem.imageUrl,
        imageUrls: updated.imageUrls?.length ? updated.imageUrls : detailItem.imageUrls,
      });
    }
  }, [items, detailItem]);

  // Handle Email and Password Logins
  const handleEmailSignIn = async (email: string, password: string): Promise<boolean> => {
    setIsAuthLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        applySession(data.user);
        goHomeTab();
        void syncProfileFromDb(data.user);
        return true;
      }
      setIsAuthLoading(false);
      return false;
    } catch (err: any) {
      console.warn('Supabase sign-in failed:', err);
      setIsAuthLoading(false);
      const friendlyErr = String(err?.message || err || '');
      if (friendlyErr.toLowerCase().includes('failed to fetch') || friendlyErr.toLowerCase().includes('fetch')) {
        setErrorMsg('Connection failed. The database is unreachable. Please check your network and try again.');
      } else {
        setErrorMsg(friendlyErr || 'Unable to sign in right now. Please try again.');
      }
      throw err;
    }
  };

  const handleEmailSignUp = async (
    email: string, 
    password: string, 
    displayName: string, 
    neighborhood: string, 
    bio: string,
    acceptedLegal = false,
  ): Promise<boolean> => {
    setIsAuthLoading(true);
    setErrorMsg('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            displayName,
            neighborhood,
            bio
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const newProfile: UserProfile = {
          uid: data.user.id,
          displayName,
          photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(data.user.id)}`,
          email: data.user.email || email,
          neighborhood,
          bio,
          createdAt: new Date().toISOString()
        };

        await upsertSupabaseProfile(newProfile);

        // Signup checkbox already covered privacy + terms — persist so gates don't re-prompt.
        if (acceptedLegal) {
          acceptPrivacy(data.user.id);
          acceptTerms(data.user.id);
        }
        
        if (!data.session) {
          setIsAuthLoading(false);
          throw new Error('Registration completed! Check your email inbox to verify your account.');
        }

        applySession(data.user);
        setUserProfile(newProfile);
        if (acceptedLegal) {
          setPrivacyGateOpen(false);
          setTermsGateOpen(false);
        }
        goHomeTab();
        return true;
      }
      setIsAuthLoading(false);
      return false;
    } catch (err: any) {
      console.warn('Supabase sign-up failed:', err);
      setIsAuthLoading(false);
      const friendlyErr = String(err?.message || err || '');
      setErrorMsg(friendlyErr || 'Unable to register right now.');
      throw err;
    }
  };

  // Sign out
  const handleLogOut = async () => {
    const signedOutUserId =
      userProfile?.uid || sessionUser?.id || lastSignedInUserIdRef.current;
    try {
      logoutCleanupDoneRef.current = true;
      await clearNotificationDataOnLogout(signedOutUserId);
      await supabase.auth.signOut();
    } catch (_) {}
    lastSignedInUserIdRef.current = null;
    clearActiveNavSession();
    clearSessionCache();
    clearAuthenticatedUiState();
    setSessionUser(null);
    setUserProfile(null);
    setItems([]);
    resetTabStateForSignOut();
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    goHomeTab();
  };

  useEffect(() => {
    if (detailItem) {
      engagement.setCommentsExpanded(detailItem.id, true);
    }
  }, [detailItem?.id]);

  const refreshDetailItem = useCallback(async () => {
    try {
      const loadedItems = await getSupabaseItems();
      setItems((current) => {
        if (loadedItems.length === 0 && current.length > 0) return current;
        return loadedItems;
      });
      setDetailItem((current) => {
        if (!current) return null;
        const next = loadedItems.find((i) => i.id === current.id);
        if (!next) return current;
        if (!next.description && current.description) {
          return {
            ...next,
            description: current.description,
            imageUrl: next.imageUrl || current.imageUrl,
            imageUrls: next.imageUrls?.length ? next.imageUrls : current.imageUrls,
          };
        }
        return next;
      });
    } catch (err) {
      console.warn('Could not refresh listing detail:', err);
    }
  }, []);

  const handleDetailUpdateStatus = async (
    status: 'completed' | 'withdrawn' | 'active' | 'pending_pickup' | 'on_hold',
  ) => {
    if (!detailItem || !userProfile) return;
    if (status === 'completed' && completedActionNeedsAttribution(detailItem, userProfile)) {
      setPickupAttributionMode('complete');
      setPickupAttributionItem(detailItem);
      return;
    }
    setDetailUpdating(true);
    try {
      await updateSupabaseItemStatus(detailItem.id, status, userProfile?.uid);
      await refreshDetailItem();
    } catch (err) {
      console.warn('Failed to update listing status:', err);
    } finally {
      setDetailUpdating(false);
    }
  };

  const handleRepostPost = useCallback(
    async (post: ItemPost) => {
      if (!userProfile || post.userId !== userProfile.uid || post.status !== 'withdrawn') return;

      setDetailUpdating(true);
      try {
        const ok = await updateSupabaseItemStatus(post.id, 'active', userProfile.uid);
        if (!ok) {
          setErrorMsg('Could not repost listing.');
          return;
        }
        if (detailItem?.id === post.id) await refreshDetailItem();
        await loadItems(true);
        setActiveTab('feed');
      } catch (err) {
        console.warn('Failed to repost listing:', err);
        setErrorMsg('Could not repost listing.');
      } finally {
        setDetailUpdating(false);
      }
    },
    [userProfile, detailItem?.id, loadItems, refreshDetailItem],
  );

  const handleDeletePost = useCallback(
    async (post: ItemPost) => {
      if (!userProfile || post.userId !== userProfile.uid || post.status !== 'withdrawn') return;

      const confirmed = await confirm({
        title: 'Delete listing',
        message: `Permanently delete "${post.title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        variant: 'danger',
      });
      if (!confirmed) return;

      setDetailUpdating(true);
      try {
        const ok = await deleteSupabaseItem(post.id);
        if (!ok) {
          setErrorMsg('Could not delete post.');
          return;
        }
        if (detailItem?.id === post.id) setDetailItem(null);
        await loadItems(true);
      } catch (err) {
        console.warn('Failed to delete post:', err);
        setErrorMsg('Could not delete post.');
      } finally {
        setDetailUpdating(false);
      }
    },
    [userProfile, detailItem?.id, loadItems, confirm],
  );

  const handleOpenSupportTicket = useCallback((ticketId: string) => {
    setInitialSupportTicketId(ticketId);
    setActiveTab('chats');
  }, []);

  const handleStaffListingOutreach = useCallback(
    async (item: ItemPost) => {
      if (!userProfile || !isStaffRole(userProfile.role)) return;
      if (blockedUserIds.has(item.userId)) return;

      const confirmed = await confirmStaffListingOutreach(
        confirm,
        item.userDisplayName,
        item.title,
      );
      if (!confirmed) return;

      const result = await findOrCreateStaffListingOutreachTicket({ staff: userProfile, item });
      if (!result.ok || !result.ticketId) {
        await alert({
          title: 'Could not open staff thread',
          message: result.errorMessage || 'Could not open staff thread.',
        });
        return;
      }

      setDetailItem(null);
      handleOpenSupportTicket(result.ticketId);
    },
    [userProfile, blockedUserIds, confirm, alert, handleOpenSupportTicket],
  );

  const handleStaffEventOutreach = useCallback(
    async (event: CommunityEvent) => {
      if (!userProfile || !isStaffRole(userProfile.role)) return;
      if (blockedUserIds.has(event.userId)) return;

      const confirmed = await confirmStaffEventOutreach(
        confirm,
        event.userDisplayName,
        event.title,
      );
      if (!confirmed) return;

      const result = await findOrCreateStaffEventOutreachTicket({ staff: userProfile, event });
      if (!result.ok || !result.ticketId) {
        await alert({
          title: 'Could not open staff thread',
          message: result.errorMessage || 'Could not open staff thread.',
        });
        return;
      }

      setDetailEvent(null);
      handleOpenSupportTicket(result.ticketId);
    },
    [userProfile, blockedUserIds, confirm, alert, handleOpenSupportTicket],
  );

  const handleInitiateChat = (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => {
    if (!userProfile) return;
    if (blockedUserIds.has(posterUid)) return;

    if (isStaffActingOfficial(userProfile) && item) {
      void handleStaffListingOutreach(item);
      return;
    }

    const participants = [userProfile.uid, posterUid].sort();
    const chatId = participants.join('_');

    setInitialSelectedChatId(null);
    setPendingChatCompose({
      chatId,
      otherUserId: posterUid,
      otherUserName: posterName,
      otherUserPhoto: posterPhoto,
      itemId: item?.id,
      itemTitle: item?.title,
    });
    setActiveTab('chats');
  };

  const handleDeleteAccount = async () => {
    if (!userProfile) return;
    const confirmed = await confirm({
      title: 'Delete account',
      message:
        'Permanently delete your account? All your listings, comments, messages, and profile data will be removed. This cannot be undone.',
      confirmLabel: 'Delete account',
      variant: 'danger',
    });
    if (!confirmed) return;

    const result = await deleteOwnAccount();
    if (!result.ok) {
      setErrorMsg(result.errorMessage || 'Could not delete account.');
      return;
    }
    await handleLogOut();
  };

  const handleViewProfile = useCallback(
    (uid: string) => {
      if (blockedUserIds.has(uid)) return;
      setViewProfileUid(uid);
    },
    [blockedUserIds],
  );

  const openDetailItem = useCallback((item: ItemPost, startNavigation = false) => {
    setDetailNavigateOnOpen(startNavigation);
    setDetailItem(item);
    if (item.description) return;
    void getSupabaseItemById(item.id).then((full) => {
      if (!full) return;
      setDetailItem((current) => {
        if (current?.id !== full.id) return current;
        return {
          ...full,
          description: full.description || current.description,
          imageUrl: full.imageUrl || current.imageUrl,
          imageUrls: full.imageUrls?.length ? full.imageUrls : current.imageUrls,
        };
      });
      setItems((current) =>
        current.map((row) => {
          if (row.id !== full.id) return row;
          return {
            ...row,
            description: full.description || row.description,
            imageUrl: full.imageUrl || row.imageUrl,
            imageUrls: full.imageUrls?.length ? full.imageUrls : row.imageUrls,
          };
        }),
      );
    });
  }, []);

  const handleViewItem = useCallback((item: ItemPost) => {
    openDetailItem(item, false);
  }, [openDetailItem]);

  const handleNavigateItem = useCallback(
    (item: ItemPost) => {
      openDetailItem(item, true);
    },
    [openDetailItem],
  );

  const openDetailEvent = useCallback((event: CommunityEvent, startNavigation = false) => {
    setDetailEventNavigateOnOpen(startNavigation);
    setDetailEvent(event);
  }, []);

  const handleViewEvent = useCallback(
    (event: CommunityEvent) => {
      openDetailEvent(event, false);
    },
    [openDetailEvent],
  );

  const handleNavigateEvent = useCallback(
    (event: CommunityEvent) => {
      openDetailEvent(event, true);
    },
    [openDetailEvent],
  );

  const handleOpenChatFromProfile = useCallback((chatId: string) => {
    setViewProfileUid(null);
    setInitialSelectedChatId(chatId);
    setActiveTab('chats');
  }, []);

  const handleViewListingId = useCallback(
    async (itemId: string) => {
      const fromFeed = items.find((i) => i.id === itemId);
      const item = fromFeed ?? (await staffGetListingById(itemId));
      if (!item) {
        setErrorMsg('That listing is no longer available.');
        return;
      }
      handleViewItem(item);
      await engagement.ensureEngagementForPost(item.id);
      engagement.setCommentsExpanded(item.id, true);
    },
    [items, engagement, handleViewItem],
  );

  const handleViewEventId = useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (event) handleViewEvent(event);
    },
    [events, handleViewEvent],
  );

  const handleClaimSubmitted = useCallback((chatId: string) => {
    setDetailItem(null);
    setInitialSelectedChatId(chatId);
    setActiveTab('chats');
    void loadItems(true);
  }, [loadItems]);

  const handleBlockListChanged = useCallback(() => {
    void reloadBlockedUsers();
  }, [reloadBlockedUsers]);

  const handlePushDeepLink = useCallback(
    (target: PushDeepLinkTarget) => {
      let tabForUrl: AppTab = target.tab ?? 'map';
      if (target.tab) navigateToTab(target.tab);
      if (target.conversationId) {
        setInitialSelectedChatId(target.conversationId);
        navigateToTab('chats');
        tabForUrl = 'chats';
      }
      if (target.listingId) {
        const openListing = (item: ItemPost | undefined) => {
          if (!item) {
            void alert({ message: 'This listing is no longer available.' });
            return;
          }
          if (blockedUserIds.has(item.userId)) {
            void alert({ message: 'This listing is unavailable.' });
            return;
          }
          setDetailItem(item);
        };
        const existing = items.find((item) => item.id === target.listingId);
        if (existing) {
          openListing(existing);
        } else {
          void getSupabaseItemById(target.listingId).then((item) => openListing(item ?? undefined));
        }
        tabForUrl = 'feed';
        navigateToTab('feed');
      }
      if (target.eventId) {
        const openEvent = (event: CommunityEvent | undefined) => {
          if (!event) {
            void alert({ message: 'This event is no longer available.' });
            return;
          }
          if (blockedUserIds.has(event.userId)) {
            void alert({ message: 'This event is unavailable.' });
            return;
          }
          setDetailEvent(event);
        };
        const existing = events.find((event) => event.id === target.eventId);
        if (existing) {
          openEvent(existing);
        } else {
          void getSupabaseEvents().then((loaded) => {
            openEvent(loaded.find((event) => event.id === target.eventId));
          });
        }
        tabForUrl = 'events';
        navigateToTab('events');
      }
      if (target.requestId) {
        void getClaimRequestById(target.requestId).then((request) => {
          if (request?.chatId) {
            setInitialSelectedChatId(request.chatId);
          } else {
            void alert({ message: 'That claim request is no longer available.' });
          }
        });
        navigateToTab('chats');
        tabForUrl = 'chats';
      }
      if (target.chatFeedbackPanel) {
        setInitialChatFeedbackPanel(target.chatFeedbackPanel);
        navigateToTab('chats');
        tabForUrl = 'chats';
      } else if (target.staffPanel === 'reports') {
        setInitialChatFeedbackPanel('staffReports');
        navigateToTab('chats');
        tabForUrl = 'chats';
      } else if (target.staffPanel === 'tickets') {
        navigateToTab('chats');
        setInitialChatSupportView('list');
        tabForUrl = 'chats';
      }
      if (target.notificationsTab) {
        openNotificationsHub(target.notificationsTab);
      } else if (target.notifications) {
        openNotificationsHub('notifications');
      }
      if (target.directorOverview) {
        setScrollToDirectorOverview(true);
        navigateToTab('profile');
        tabForUrl = 'profile';
      }
      if (target.staffApply) {
        setShowStaffApplyPanel(true);
        navigateToTab('profile');
        tabForUrl = 'profile';
      }
      if (target.supportTicketId) {
        setInitialSupportTicketId(target.supportTicketId);
        navigateToTab('chats');
        tabForUrl = 'chats';
      }
      if (target.chatSupportView) {
        setInitialChatSupportView(target.chatSupportView);
        navigateToTab('chats');
        tabForUrl = 'chats';
      }
      clearPendingDeepLinkPath();
      clearAppPathname(tabForUrl);
    },
    [items, events, navigateToTab, blockedUserIds, alert],
  );

  usePushDeepLinkNavigation(handlePushDeepLink);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pendingDeepLinkPathRef.current) {
      rememberPendingDeepLinkPath(pendingDeepLinkPathRef.current);
      return;
    }
    const path = readPendingDeepLinkPath();
    if (path) {
      pendingDeepLinkPathRef.current = path;
      rememberPendingDeepLinkPath(path);
    }
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    const pendingPath = pendingDeepLinkPathRef.current ?? readPendingDeepLinkPath();
    const target = pendingPath ? parsePushDeepLink(pendingPath) : parsePushDeepLink(window.location.pathname);
    if (!target) return;
    pendingDeepLinkPathRef.current = null;
    handlePushDeepLink(target);
  }, [userProfile, handlePushDeepLink]);

  useEffect(() => {
    if (!userProfile) return;
    void migrateLocalSavedItemsToDb(userProfile.uid);
    const userPosts = items.filter((item) => item.userId === userProfile.uid);
    if (CLIENT_PUSH_DISPATCH_ENABLED) {
      void import('./lib/pushIntegration').then((m) => m.pushListingExpiryReminders(userProfile.uid, userPosts));
    }
  }, [userProfile, items]);

  useEffect(() => {
    if (viewProfileUid && blockedUserIds.has(viewProfileUid)) {
      setViewProfileUid(null);
    }
    if (detailItem && blockedUserIds.has(detailItem.userId)) {
      setDetailItem(null);
    }
    if (initialSelectedChatId && userProfile) {
      const otherId = initialSelectedChatId
        .split('_')
        .find((id) => id !== userProfile.uid);
      if (otherId && blockedUserIds.has(otherId)) {
        setInitialSelectedChatId(null);
      }
    }
  }, [blockedUserIds, viewProfileUid, detailItem, initialSelectedChatId, userProfile]);

  const accountRestriction = isAccountRestricted(userProfile);
  const browseOnlyReview = isPlayReviewBrowseOnly(userProfile?.email);
  const openNewPost = () => {
    if (browseOnlyReview) return;
    setShowPostModal(true);
  };
  const openNewEvent = () => {
    if (browseOnlyReview) return;
    setShowPostEventModal(true);
  };

  const reviewPromptEnabled =
    Boolean(userProfile) &&
    !privacyGateOpen &&
    !termsGateOpen &&
    !accountRestriction.restricted;

  const {
    promptKind: reviewPromptKind,
    myReview: reviewPromptMyReview,
    submitting: reviewPromptSubmitting,
    error: reviewPromptError,
    dismissPrompt,
    submitPromptReview,
  } = useReviewPrompt({
    userProfile: userProfile ?? null,
    enabled: reviewPromptEnabled,
  });

  return (
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-app antialiased font-sans">
      {showDownloadPage && sessionUser ? (
        <DownloadPage
          userProfile={userProfile}
          onBack={() => {
            setShowDownloadPage(false);
            const tab = readPersistedTab(userProfile?.uid);
            try {
              window.history.replaceState(withTabInHistoryState(tab), '', appTabPath(tab));
            } catch {
              window.location.assign(appTabPath(tab));
            }
          }}
        />
      ) : authBootstrapping && !sessionUser ? (
        <AppBootSplash />
      ) : !sessionUser ? (
        <>
          <PublicSite
            onEmailSignIn={handleEmailSignIn}
            onEmailSignUp={handleEmailSignUp}
            errorMsg={errorMsg}
            isAuthLoading={isAuthLoading}
            items={items}
            isItemsLoading={isItemsLoading}
            onViewListing={(item) => {
              setGuestDetailItem(item);
              if (item.description) return;
              void getSupabaseItemById(item.id).then((full) => {
                if (full) setGuestDetailItem((current) => (current?.id === full.id ? full : current));
              });
            }}
            onRequireSignIn={() => {
              window.location.hash = '#/login';
            }}
          />
          {guestDetailItem && (
            <GuestItemDetailView
              item={guestDetailItem}
              onClose={() => setGuestDetailItem(null)}
              onRequireSignIn={() => {
                setGuestDetailItem(null);
                window.location.hash = '#/login';
              }}
            />
          )}
        </>
      ) : (
        <>
          {!userProfile ? (
            <Onboarding user={sessionUser} onComplete={handleOnboardingComplete} />
          ) : accountRestriction.restricted ? (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center mesh-bg">
              <h1 className="font-display text-xl font-bold text-app">
                {accountRestriction.reason === 'banned'
                  ? 'Account disabled'
                  : accountRestriction.reason === 'locked'
                    ? 'Account locked'
                    : 'Account suspended'}
              </h1>
              <p className="text-sm text-muted max-w-md leading-relaxed">
                {accountRestriction.reason === 'banned'
                  ? 'Your account has been disabled by community staff. Contact the Sacramento Buy Nothing team if you believe this is a mistake.'
                  : accountRestriction.reason === 'locked'
                    ? 'Your account was automatically locked after repeated Go Get pickup violations. A city administrator must review your record before you can use the app again — check Messages → Support for updates or to appeal.'
                    : accountRestriction.suspendedUntil
                      ? `Your account is suspended until ${new Date(accountRestriction.suspendedUntil).toLocaleString()}. You cannot use the app until then.`
                      : 'Your account is temporarily suspended.'}
              </p>
              <button type="button" onClick={handleLogOut} className="sbn-btn sbn-btn-secondary">
                Sign out
              </button>
            </div>
          ) : (
            <BrowseOnlyProvider browseOnly={browseOnlyReview}>
            <NotificationsHubProvider userProfile={userProfile} onDeepLink={handlePushDeepLink}>
            <GoGetRingCoordinator userProfile={userProfile} />
            <PresenceProvider userId={userProfile.uid}>
               {deviceType === 'mobile' ? (
                <MobileView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={handleTabChange}
                  onOpenNewPost={openNewPost}
                  onOpenNewEvent={openNewEvent}
                  canAccessEvents={canAccessEvents}
                  onInitiateChat={handleInitiateChat}
                  onStaffListingChat={handleStaffListingOutreach}
                  onStaffEventChat={handleStaffEventOutreach}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={() => void loadItems(true)}
                  onRefreshEvents={() => void loadEvents(true)}
                  isEventsLoading={isEventsLoading}
                  itemsHydrated={itemsHydrated}
                  eventsHydrated={eventsHydrated}
                  onViewItem={handleViewItem}
                  onNavigateItem={handleNavigateItem}
                  onRepostPost={handleRepostPost}
                  onDeletePost={handleDeletePost}
                  onViewEvent={handleViewEvent}
                  onNavigateEvent={handleNavigateEvent}
                  onViewProfile={handleViewProfile}
                  blockedUserIds={blockedUserIds}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                  eventsEngagement={eventsEngagement}
                  onOpenGoFundMe={() => setShowGoFundMeDetail(true)}
                  onOpenPrivacy={() => setLegalPanel('privacy')}
                  onOpenTerms={() => setLegalPanel('terms')}
                  onOpenDownload={handleOpenDownload}
                  onOpenAwards={handleOpenAwards}
                  awardsButtonGlow={awardsButtonGlow}
                  initialChatFeedbackPanel={initialChatFeedbackPanel}
                  onClearInitialChatFeedbackPanel={() => setInitialChatFeedbackPanel(null)}
                  initialSupportTicketId={initialSupportTicketId}
                  onClearInitialSupportTicket={() => setInitialSupportTicketId(null)}
                  initialChatSupportView={initialChatSupportView}
                  onClearInitialChatSupportView={() => setInitialChatSupportView(null)}
                  scrollToDirectorOverview={scrollToDirectorOverview}
                  onClearScrollToDirectorOverview={() => setScrollToDirectorOverview(false)}
                  onOpenChatById={handleOpenChatFromProfile}
                  onOpenTicketById={handleOpenSupportTicket}
                  onViewListingId={handleViewListingId}
                  onViewEventId={handleViewEventId}
                />
              ) : deviceType === 'tablet' ? (
                <TabletView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={handleTabChange}
                  onOpenNewPost={openNewPost}
                  onOpenNewEvent={openNewEvent}
                  canAccessEvents={canAccessEvents}
                  onInitiateChat={handleInitiateChat}
                  onStaffListingChat={handleStaffListingOutreach}
                  onStaffEventChat={handleStaffEventOutreach}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={() => void loadItems(true)}
                  onRefreshEvents={() => void loadEvents(true)}
                  isEventsLoading={isEventsLoading}
                  itemsHydrated={itemsHydrated}
                  eventsHydrated={eventsHydrated}
                  onViewItem={handleViewItem}
                  onNavigateItem={handleNavigateItem}
                  onRepostPost={handleRepostPost}
                  onDeletePost={handleDeletePost}
                  onViewEvent={handleViewEvent}
                  onNavigateEvent={handleNavigateEvent}
                  onViewProfile={handleViewProfile}
                  blockedUserIds={blockedUserIds}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                  eventsEngagement={eventsEngagement}
                  onOpenGoFundMe={() => setShowGoFundMeDetail(true)}
                  onOpenPrivacy={() => setLegalPanel('privacy')}
                  onOpenTerms={() => setLegalPanel('terms')}
                  onOpenDownload={handleOpenDownload}
                  onOpenAwards={handleOpenAwards}
                  awardsButtonGlow={awardsButtonGlow}
                  initialChatFeedbackPanel={initialChatFeedbackPanel}
                  onClearInitialChatFeedbackPanel={() => setInitialChatFeedbackPanel(null)}
                  initialSupportTicketId={initialSupportTicketId}
                  onClearInitialSupportTicket={() => setInitialSupportTicketId(null)}
                  initialChatSupportView={initialChatSupportView}
                  onClearInitialChatSupportView={() => setInitialChatSupportView(null)}
                  scrollToDirectorOverview={scrollToDirectorOverview}
                  onClearScrollToDirectorOverview={() => setScrollToDirectorOverview(false)}
                  onOpenChatById={handleOpenChatFromProfile}
                  onOpenTicketById={handleOpenSupportTicket}
                  onViewListingId={handleViewListingId}
                  onViewEventId={handleViewEventId}
                />
              ) : (
                <DesktopView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={handleTabChange}
                  onOpenNewPost={openNewPost}
                  onOpenNewEvent={openNewEvent}
                  canAccessEvents={canAccessEvents}
                  onInitiateChat={handleInitiateChat}
                  onStaffListingChat={handleStaffListingOutreach}
                  onStaffEventChat={handleStaffEventOutreach}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={() => void loadItems(true)}
                  onRefreshEvents={() => void loadEvents(true)}
                  isEventsLoading={isEventsLoading}
                  itemsHydrated={itemsHydrated}
                  eventsHydrated={eventsHydrated}
                  onViewItem={handleViewItem}
                  onNavigateItem={handleNavigateItem}
                  onRepostPost={handleRepostPost}
                  onDeletePost={handleDeletePost}
                  onViewEvent={handleViewEvent}
                  onNavigateEvent={handleNavigateEvent}
                  onViewProfile={handleViewProfile}
                  blockedUserIds={blockedUserIds}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                  eventsEngagement={eventsEngagement}
                  onOpenGoFundMe={() => setShowGoFundMeDetail(true)}
                  onOpenPrivacy={() => setLegalPanel('privacy')}
                  onOpenTerms={() => setLegalPanel('terms')}
                  onOpenDownload={handleOpenDownload}
                  onOpenAwards={handleOpenAwards}
                  awardsButtonGlow={awardsButtonGlow}
                  initialChatFeedbackPanel={initialChatFeedbackPanel}
                  onClearInitialChatFeedbackPanel={() => setInitialChatFeedbackPanel(null)}
                  initialSupportTicketId={initialSupportTicketId}
                  onClearInitialSupportTicket={() => setInitialSupportTicketId(null)}
                  initialChatSupportView={initialChatSupportView}
                  onClearInitialChatSupportView={() => setInitialChatSupportView(null)}
                  scrollToDirectorOverview={scrollToDirectorOverview}
                  onClearScrollToDirectorOverview={() => setScrollToDirectorOverview(false)}
                  onOpenChatById={handleOpenChatFromProfile}
                  onOpenTicketById={handleOpenSupportTicket}
                  onViewListingId={handleViewListingId}
                  onViewEventId={handleViewEventId}
                />
              )}

              {showGoFundMeDetail && (
                <FullScreenPanel
                  title={SUPPORT.gofundmeTitle}
                  subtitle={SUPPORT.gofundmeBlurb}
                  onClose={() => setShowGoFundMeDetail(false)}
                >
                  <GoFundMeSupport />
                </FullScreenPanel>
              )}

              {legalPanel === 'privacy' && (
                <FullScreenPanel
                  title={PRIVACY.title}
                  subtitle={PRIVACY.summary}
                  onClose={() => setLegalPanel(null)}
                >
                  <PrivacyPolicyContent />
                </FullScreenPanel>
              )}

              {legalPanel === 'terms' && (
                <FullScreenPanel
                  title={TERMS.title}
                  subtitle={TERMS.summary}
                  onClose={() => setLegalPanel(null)}
                >
                  <TermsOfUseContent />
                </FullScreenPanel>
              )}

              {showAwardsPanel && userProfile && (
                <FullScreenPanel
                  title={AWARDS.panelTitle}
                  subtitle={AWARDS.panelSubtitle}
                  onClose={() => setShowAwardsPanel(false)}
                >
                  <AwardsPanel
                    userProfile={userProfile}
                    userPosts={visibleItems.filter((item) => item.userId === userProfile.uid)}
                    onViewProfile={handleViewProfile}
                  />
                </FullScreenPanel>
              )}

              {showStaffApplyPanel && userProfile && (
                <FullScreenPanel
                  title="Join the staff team"
                  subtitle="Read each role, then apply for one"
                  onClose={() => setShowStaffApplyPanel(false)}
                >
                  <StaffApplyView user={userProfile} />
                </FullScreenPanel>
              )}

              {viewProfileUid && (
                <NeighborProfileView
                  userId={viewProfileUid}
                  currentUserId={userProfile.uid}
                  currentUserProfile={userProfile}
                  listingHints={visibleItems}
                  onClose={() => setViewProfileUid(null)}
                  onOpenChat={handleOpenChatFromProfile}
                  onViewPost={handleViewItem}
                  onRepostPost={handleRepostPost}
                  onDeletePost={handleDeletePost}
                  onBlockListChanged={handleBlockListChanged}
                />
              )}

              {detailItem && (
                <ItemDetailView
                  item={detailItem}
                  currentUserId={userProfile.uid}
                  updating={detailUpdating}
                  onClose={() => {
                    setDetailItem(null);
                    setDetailNavigateOnOpen(false);
                  }}
                  onEdit={() => {
                    setEditingItem(detailItem);
                    setDetailItem(null);
                  }}
                  onUpdateStatus={handleDetailUpdateStatus}
                  onDelete={
                    detailItem.status === 'withdrawn' && detailItem.userId === userProfile.uid
                      ? () => void handleDeletePost(detailItem)
                      : undefined
                  }
                  onViewProfile={handleViewProfile}
                  voteState={engagement.getVotesForPost(detailItem.id)}
                  comments={engagement.getCommentsForPost(detailItem.id)}
                  onVote={(dir) => engagement.handleVote(detailItem.id, detailItem.userId, dir)}
                  onAddComment={(text) => engagement.handleAddComment(detailItem.id, text)}
                  onDeleteComment={(commentId) =>
                    void engagement.handleDeleteComment(detailItem.id, commentId)
                  }
                  onMessage={
                    blockedUserIds.has(detailItem.userId) || isStaffActingOfficial(userProfile)
                      ? undefined
                      : () => {
                          handleInitiateChat(
                            detailItem.userId,
                            detailItem.userDisplayName,
                            detailItem.userPhotoURL,
                            detailItem,
                          );
                          setDetailItem(null);
                        }
                  }
                  onStaffChat={
                    isStaffActingOfficial(userProfile) && !blockedUserIds.has(detailItem.userId)
                      ? () => {
                          void handleStaffListingOutreach(detailItem);
                        }
                      : undefined
                  }
                  onListingStaffAction={async () => {
                    await refreshDetailItem();
                    await loadItems(true);
                  }}
                  userProfile={userProfile}
                  onClaimSubmitted={handleClaimSubmitted}
                  onOpenChat={(chatId) => {
                    setDetailItem(null);
                    setInitialSelectedChatId(chatId);
                    setActiveTab('chats');
                  }}
                  onEditPickupAttribution={() => {
                    setPickupAttributionMode('edit');
                    setPickupAttributionItem(detailItem);
                  }}
                  startNavigationOnOpen={detailNavigateOnOpen}
                  onStartNavigationConsumed={() => setDetailNavigateOnOpen(false)}
                />
              )}

              {pickupAttributionItem && userProfile && (
                <PickupAttributionModal
                  item={pickupAttributionItem}
                  owner={userProfile}
                  mode={pickupAttributionMode}
                  onClose={() => setPickupAttributionItem(null)}
                  onSaved={async () => {
                    setPickupAttributionItem(null);
                    await refreshDetailItem();
                    await loadItems(true);
                  }}
                />
              )}

              {detailEvent && (
                <EventDetailView
                  event={detailEvent}
                  allEvents={events}
                  currentUserId={userProfile.uid}
                  userProfile={userProfile}
                  rsvpState={eventsEngagement.getRsvpsForEvent(detailEvent.id)}
                  comments={eventsEngagement.getCommentsForEvent(detailEvent.id)}
                  onRsvp={(status) =>
                    eventsEngagement.handleRsvp(
                      detailEvent.id,
                      detailEvent.userId,
                      status,
                      isEventPast(detailEvent),
                    )
                  }
                  onAddComment={(text) => eventsEngagement.handleAddComment(detailEvent.id, text)}
                  onDeleteComment={(commentId) =>
                    void eventsEngagement.handleDeleteComment(detailEvent.id, commentId)
                  }
                  onClose={() => {
                    setDetailEvent(null);
                    setDetailEventNavigateOnOpen(false);
                  }}
                  onEdit={() => {
                    if (!isEventEditable(detailEvent)) return;
                    setAddEventDatesMode(false);
                    setEditingEvent(detailEvent);
                    setDetailEvent(null);
                  }}
                  onAddDates={() => {
                    setAddEventDatesMode(true);
                    setEditingEvent(detailEvent);
                    setDetailEvent(null);
                  }}
                  onCancel={async () => {
                    const confirmed = await confirm({
                      message: 'Cancel this event? Neighbors will see it as cancelled.',
                      confirmLabel: 'Cancel event',
                      variant: 'danger',
                    });
                    if (!confirmed) return;
                    setDetailEventUpdating(true);
                    const result = await cancelSupabaseEvent(detailEvent.id, userProfile.uid);
                    setDetailEventUpdating(false);
                    if (result.ok) void loadEvents(true);
                    else {
                      await alert({
                        title: 'Could not cancel event',
                        message: result.errorMessage || 'Could not cancel event.',
                      });
                    }
                  }}
                  onViewProfile={handleViewProfile}
                  onStaffChat={
                    isStaffActingOfficial(userProfile) && !blockedUserIds.has(detailEvent.userId)
                      ? () => void handleStaffEventOutreach(detailEvent)
                      : undefined
                  }
                  onEventStaffAction={() => void loadEvents(true)}
                  onSelectOccurrence={(occurrence) => setDetailEvent(occurrence)}
                  onEventUpdated={(updatedEvent) => {
                    setDetailEvent(updatedEvent);
                    void loadEvents(true);
                  }}
                  updating={detailEventUpdating}
                  commentsLocked={!canAccessEvents}
                  startNavigationOnOpen={detailEventNavigateOnOpen}
                  onStartNavigationConsumed={() => setDetailEventNavigateOnOpen(false)}
                />
              )}

              {(showPostModal || editingItem) && !browseOnlyReview && (
                <PostItemModal
                  userProfile={userProfile}
                  editItem={editingItem}
                  onClose={() => {
                    setShowPostModal(false);
                    setEditingItem(null);
                  }}
                  onSuccess={() => {
                    void loadItems(true);
                    setActiveTab('feed');
                    setShowPostModal(false);
                    setEditingItem(null);
                  }}
                />
              )}

              {((showPostEventModal && canAccessEvents) || editingEvent) && !browseOnlyReview && (
                <PostEventModal
                  userProfile={userProfile}
                  editEvent={editingEvent}
                  allEvents={events}
                  addOccurrencesOnly={addEventDatesMode}
                  onClose={() => {
                    setShowPostEventModal(false);
                    setEditingEvent(null);
                    setAddEventDatesMode(false);
                  }}
                  onSuccess={() => {
                    void loadEvents(true);
                    setActiveTab('events');
                    setShowPostEventModal(false);
                    setEditingEvent(null);
                    setAddEventDatesMode(false);
                  }}
                />
              )}
            </PresenceProvider>
            </NotificationsHubProvider>
            </BrowseOnlyProvider>
          )}
        </>
      )}

      {userProfile && !accountRestriction.restricted && (
        <PushNotificationCelebration
          userId={userProfile.uid}
          onGoToProfile={() => openNotificationsHub('alerts')}
        />
      )}

      {/* Floating PWA Install Helper Banner */}
      {showInstallBanner && !isAlreadyInstalled && (
        <div 
          id="pwa_floating_install_banner" 
          className="fixed bottom-20 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs md:max-w-md z-[45] bg-surface border border-app border-l-[4px] border-l-accent shadow-2xl p-4 rounded-xl transition-all duration-300 text-app font-sans animate-fade-in"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <img
                src={APP_LOGO_SRC}
                alt=""
                className="w-10 h-10 rounded-lg object-contain shrink-0 mt-0.5 bg-surface border border-app"
              />
              <div className="min-w-0">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent">Download Mobile App</h4>
                <p className="text-xs font-bold text-app mt-1">{SITE.name}</p>
                <div className="text-[11px] text-muted mt-1.5 leading-relaxed font-semibold">
                  {isIOS ? (
                    <span>
                      Tap Safari's <strong className="text-app font-bold">Share</strong> button and choose <strong className="text-app font-bold">Add to Home Screen</strong> to install.
                    </span>
                  ) : (
                    <span>Add to your home screen for quick access to free local gifting across Sacramento.</span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={handleDismissPrompt}
              className="text-subtle hover:text-app p-1 hover:bg-surface rounded-lg transition-colors cursor-pointer shrink-0"
              title="Dismiss Installation Banner"
              id="pwa_banner_dismiss_btn"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {!isIOS && (
            <div className="mt-3 flex items-center justify-end flex-wrap gap-2 pt-2.5 border-t border-app">
              {canDownloadApkFromWebsite(userProfile) ? (
                <button
                  type="button"
                  onClick={handleOpenDownload}
                  className="px-3.5 py-1.5 text-[11px] font-extrabold text-accent hover:text-accent-hover rounded-lg transition-all cursor-pointer"
                >
                  ANDROID APK
                </button>
              ) : (
                <a
                  href={SITE.playStoreBetaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 rounded-lg transition-all"
                >
                  GOOGLE PLAY
                </a>
              )}
              <button
                onClick={handleDismissPrompt}
                className="px-3.5 py-1.5 text-[11px] font-extrabold text-muted hover:text-app rounded-lg transition-all cursor-pointer"
              >
                LATER
              </button>
              <button
                onClick={handleInstallApp}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-on-accent text-[11px] font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
                id="pwa_banner_install_btn"
              >
                <span>INSTALL NOW</span>
              </button>
            </div>
          )}
        </div>
      )}

      {sessionUser && privacyGateOpen && (
        <PrivacyPolicyModal
          required
          userId={sessionUser.id}
          onAccepted={refreshLegalGates}
        />
      )}

      {sessionUser && termsGateOpen && !privacyGateOpen && (
        <TermsOfUseModal
          required
          userId={sessionUser.id}
          onAccepted={() => setTermsGateOpen(false)}
        />
      )}

      {reviewPromptKind && userProfile && (
        <ReviewPromptModal
          kind={reviewPromptKind}
          initialRating={reviewPromptMyReview?.rating ?? 5}
          initialText={reviewPromptMyReview?.text || ''}
          submitting={reviewPromptSubmitting}
          error={reviewPromptError}
          onSubmit={submitPromptReview}
          onDismiss={dismissPrompt}
        />
      )}
    </div>
  );
}
