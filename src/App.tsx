import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useItemsEngagement } from './hooks/useItemsEngagement';
import { useItemsRealtime } from './hooks/useItemsRealtime';
import { useSavedItemPushAlerts } from './hooks/useSavedItemPushAlerts';
import { useEventsEngagement } from './hooks/useEventsEngagement';
import { useEventsRealtime } from './hooks/useEventsRealtime';
import { useAuthorProfilesRealtime } from './hooks/useAuthorProfilesRealtime';
import { useBlockedUsers } from './hooks/useBlockedUsers';
import { UserProfile, ItemPost, PendingChatCompose, CommunityEvent } from './types';
import Navbar from './components/Navbar';
import PublicSite from './components/public/PublicSite';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemDetailView from './components/ItemDetailView';
import EventDetailView from './components/EventDetailView';
import PostEventModal from './components/PostEventModal';
import NeighborProfileView from './components/NeighborProfileView';
import ItemGrid from './components/ItemGrid';
import ChatSystem from './components/ChatSystem';
import UserProfileView from './components/UserProfileView';
import SacramentoMapView from './components/SacramentoMapView';
import MobileView from './components/MobileView';
import TabletView from './components/TabletView';
import DesktopView from './components/DesktopView';
import { 
  supabase, 
  getSupabaseProfile, 
  upsertSupabaseProfile,
  profileFromAuthUser,
  getSupabaseItems,
  getSupabaseEvents,
  cancelSupabaseEvent,
  updateSupabaseItemStatus,
  deleteSupabaseItem,
  deleteOwnAccount,
  isAccountRestricted,
  migrateLocalSavedItemsToDb,
} from './supabase';
import { APP_LOGO_SRC, SITE, SUPPORT, AWARDS, PRIVACY, TERMS } from './siteContent';
import FullScreenPanel from './components/FullScreenPanel';
import GoFundMeSupport from './components/GoFundMeSupport';
import PrivacyPolicyContent from './components/PrivacyPolicyContent';
import TermsOfUseContent from './components/TermsOfUseContent';
import AwardsPanel from './components/AwardsPanel';
import { AppTab, parseAppTab } from './lib/appTabs';
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
import { parsePushDeepLink, type PushDeepLinkTarget } from './lib/pushDeepLink';
import { clearNotificationDataOnLogout, usePushDeepLinkNavigation } from './hooks/usePushNotifications';
import PushNotificationCelebration from './components/PushNotificationCelebration';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import TermsOfUseModal from './components/TermsOfUseModal';
import { isPrivacyAccepted } from './lib/privacyPolicyPrompt';
import { isTermsAccepted } from './lib/termsPolicyPrompt';
import { useConfirm } from './contexts/ConfirmContext';
import { NotificationsHubProvider, openNotificationsHub } from './contexts/NotificationsHubContext';
import { useAwardsGlow } from './hooks/useAwardsGlow';

const DEFAULT_OFFLINE_ITEMS: ItemPost[] = [];
const TAB_STORAGE_KEY = 'sbn_active_tab_v1';
const TAB_HISTORY_KEY = 'sbnTab';

function parseStoredTab(value: string | null): AppTab | null {
  return parseAppTab(value);
}

function parseTabFromHistoryState(state: unknown): AppTab | null {
  if (!state || typeof state !== 'object') return null;
  const value = (state as Record<string, unknown>)[TAB_HISTORY_KEY];
  return typeof value === 'string' ? parseStoredTab(value) : null;
}

function withTabInHistoryState(tab: AppTab) {
  // Keep history state minimal/serializable to avoid DataCloneError crashes.
  return { [TAB_HISTORY_KEY]: tab };
}

function persistActiveTab(tab: AppTab) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TAB_STORAGE_KEY, tab);
  try {
    window.history.replaceState(withTabInHistoryState(tab), '', window.location.href);
  } catch (err) {
    console.warn('History replaceState unavailable, tab persistence fallback active:', err);
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
  const loadItemsRef = useRef<(isBackground?: boolean, attempt?: number) => Promise<void>>(async () => {});
  const lastSignedInUserIdRef = useRef<string | null>(initialAuth.userProfile?.uid ?? null);
  const logoutCleanupDoneRef = useRef(false);
  const hadSessionOnMountRef = useRef(!!initialAuth.sessionUser);
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'map';
    return parseStoredTab(window.localStorage.getItem(TAB_STORAGE_KEY)) || 'map';
  });
  const [showPostModal, setShowPostModal] = useState(false);
  const [showPostEventModal, setShowPostEventModal] = useState(false);
  const [showGoFundMeDetail, setShowGoFundMeDetail] = useState(false);
  const [legalPanel, setLegalPanel] = useState<'privacy' | 'terms' | null>(null);
  const [showAwardsPanel, setShowAwardsPanel] = useState(false);
  const [privacyGateOpen, setPrivacyGateOpen] = useState(false);
  const [termsGateOpen, setTermsGateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);
  const [detailItem, setDetailItem] = useState<ItemPost | null>(null);
  const [detailEvent, setDetailEvent] = useState<CommunityEvent | null>(null);
  const [detailEventUpdating, setDetailEventUpdating] = useState(false);
  const [detailUpdating, setDetailUpdating] = useState(false);
  const [viewProfileUid, setViewProfileUid] = useState<string | null>(null);
  const [initialChatFeedbackPanel, setInitialChatFeedbackPanel] = useState<
    'reviews' | 'report' | 'staffReports' | null
  >(null);
  const [initialSupportTicketId, setInitialSupportTicketId] = useState<string | null>(null);
  const [initialChatSupportView, setInitialChatSupportView] = useState<'list' | 'new' | null>(null);
  const [scrollToDirectorOverview, setScrollToDirectorOverview] = useState(false);
  const [items, setItems] = useState<ItemPost[]>(initialAuth.items);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const { confirm, alert } = useConfirm();
  const { blockedUserIds, reloadBlockedUsers } = useBlockedUsers(userProfile?.uid);
  const { shouldGlow: awardsButtonGlow, markAwardsSeen } = useAwardsGlow(userProfile?.uid);

  const handleOpenAwards = useCallback(() => {
    markAwardsSeen();
    setShowAwardsPanel(true);
  }, [markAwardsSeen]);

  const goHomeTab = useCallback(() => {
    setActiveTab('map');
    persistActiveTab('map');
  }, []);

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
  const [errorMsg, setErrorMsg] = useState('');
  const [guestDetailItem, setGuestDetailItem] = useState<ItemPost | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (sessionUser && !hadSessionOnMountRef.current) {
      goHomeTab();
    }
    hadSessionOnMountRef.current = !!sessionUser;
  }, [sessionUser, goHomeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const historyTab = parseTabFromHistoryState(window.history.state);
    const storedTab = parseStoredTab(window.localStorage.getItem(TAB_STORAGE_KEY));
    const initialTab = historyTab || storedTab || 'map';

    if (initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
    try {
      window.history.replaceState(withTabInHistoryState(initialTab), '', window.location.href);
    } catch (err) {
      console.warn('History replaceState unavailable, tab persistence fallback active:', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPopState = (event: PopStateEvent) => {
      const nextTab = parseTabFromHistoryState(event.state);
      if (nextTab) {
        handlingPopStateRef.current = true;
        setActiveTab(nextTab);
        return;
      }

      // If browser history has no app-tab state, keep users in-app by restoring last tab.
      const fallbackTab = parseStoredTab(window.localStorage.getItem(TAB_STORAGE_KEY)) || 'map';
      handlingPopStateRef.current = true;
      setActiveTab(fallbackTab);
      try {
        window.history.pushState(withTabInHistoryState(fallbackTab), '', window.location.href);
      } catch (err) {
        console.warn('History pushState fallback failed:', err);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (handlingPopStateRef.current) {
      handlingPopStateRef.current = false;
      return;
    }

    const currentHistoryTab = parseTabFromHistoryState(window.history.state);
    if (currentHistoryTab === activeTab) return;
    try {
      window.history.pushState(withTabInHistoryState(activeTab), '', window.location.href);
    } catch (err) {
      console.warn('History pushState unavailable, continuing without tab back-stack:', err);
    }
  }, [activeTab]);


  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);

  /** Enter the app immediately from auth metadata — DB sync runs in background. */
  const applySession = useCallback((user: any) => {
    if (user?.id) lastSignedInUserIdRef.current = user.id;
    setSessionUser(user);
    setUserProfile((prev) => {
      if (prev?.uid === user.id) return prev;
      return profileFromAuthUser(user);
    });
    setIsAuthLoading(false);
    setAuthBootstrapping(false);
  }, []);

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
      } else if (!readCachedProfile()) {
          // Only clear when there is no cached session hint — avoids wiping UI on slow refresh.
          setSessionUser(null);
          setUserProfile(null);
          clearSessionCache();
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

      if (session?.user) {
        logoutCleanupDoneRef.current = false;
        applySession(session.user);
        // Defer DB sync — never await inside this callback (Supabase auth deadlock).
        setTimeout(() => {
          if (!cancelled) {
            void syncProfileFromDb(session.user);
          }
        }, 0);
        if (event === 'SIGNED_IN') {
          goHomeTab();
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setTimeout(() => {
            if (!cancelled) void loadItemsRef.current(true);
          }, 100);
        }
      } else if (event === 'SIGNED_OUT') {
        const signedOutUserId = lastSignedInUserIdRef.current;
        lastSignedInUserIdRef.current = null;
        profileSyncRef.current = null;
        if (!logoutCleanupDoneRef.current) {
          logoutCleanupDoneRef.current = true;
          void clearNotificationDataOnLogout(signedOutUserId);
        }
        clearSessionCache();
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
  }, [applySession, syncProfileFromDb, goHomeTab]);

  const loadItems = useCallback(
    async (isBackground = false, attempt = 0, options?: { guest?: boolean }) => {
      const isGuest = options?.guest === true;
      if (!isGuest && (!userProfile || !sessionUser)) return;
      if (!isBackground) {
        setIsItemsLoading(true);
      }
      try {
        const loadedItems = await getSupabaseItems();
        setItems((current) => {
          if (!isGuest && loadedItems.length === 0 && current.length > 0) {
            console.warn('Items fetch returned empty — keeping cached listings until auth syncs.');
            return current;
          }
          return loadedItems;
        });
        if (loadedItems.length > 0) {
          writeCachedItems(loadedItems);
        } else if (!isGuest && attempt < 2) {
          window.setTimeout(() => {
            void loadItemsRef.current(true, attempt + 1);
          }, 1200 * (attempt + 1));
        }
      } catch (err) {
        console.warn('Supabase items fetch failed:', err);
        setItems((current) => (current.length === 0 ? DEFAULT_OFFLINE_ITEMS : current));
        if (!isGuest && attempt < 2) {
          window.setTimeout(() => {
            void loadItemsRef.current(true, attempt + 1);
          }, 1200 * (attempt + 1));
        }
      } finally {
        if (!isBackground) {
          setIsItemsLoading(false);
        }
      }
    },
    [userProfile?.uid, sessionUser],
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
    loadItems(false);
  }, [sessionReady, userProfile?.uid, loadItems, authBootstrapping]);

  useEffect(() => {
    if (userProfile) {
      writeCachedProfile(userProfile);
    }
  }, [userProfile]);

  const loadEvents = useCallback(async (isBackground = false) => {
    if (!userProfile || !sessionUser) return;
    if (!isBackground) setIsEventsLoading(true);
    try {
      const loaded = await getSupabaseEvents();
      setEvents(loaded);
    } catch (err) {
      console.warn('Supabase events fetch failed:', err);
    } finally {
      if (!isBackground) setIsEventsLoading(false);
    }
  }, [userProfile?.uid, sessionUser]);

  useEffect(() => {
    if (!sessionReady) return;
    void loadEvents(false);
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
      updated.description !== detailItem.description
    ) {
      setDetailItem(updated);
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
        setErrorMsg(friendlyErr || 'Signature detour error.');
      }
      throw err;
    }
  };

  const handleEmailSignUp = async (
    email: string, 
    password: string, 
    displayName: string, 
    neighborhood: string, 
    bio: string
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
        
        if (!data.session) {
          setIsAuthLoading(false);
          throw new Error('Registration completed! Check your email inbox to verify your account.');
        }

        applySession(data.user);
        setUserProfile(newProfile);
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
    clearSessionCache();
    setSessionUser(null);
    setUserProfile(null);
    setItems([]);
    goHomeTab();
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
    const loadedItems = await getSupabaseItems();
    setItems((current) => {
      if (loadedItems.length === 0 && current.length > 0) return current;
      return loadedItems;
    });
    setDetailItem((current) => {
      if (!current) return null;
      return loadedItems.find((i) => i.id === current.id) ?? null;
    });
  }, []);

  const handleDetailUpdateStatus = async (
    status: 'completed' | 'withdrawn' | 'active' | 'pending_pickup' | 'on_hold',
  ) => {
    if (!detailItem) return;
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
        await loadItems(false);
      } catch (err) {
        console.warn('Failed to delete post:', err);
        setErrorMsg('Could not delete post.');
      } finally {
        setDetailUpdating(false);
      }
    },
    [userProfile, detailItem?.id, loadItems, confirm],
  );

  const handleInitiateChat = (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => {
    if (!userProfile) return;
    if (blockedUserIds.has(posterUid)) return;

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

  const handleOpenChatFromProfile = useCallback((chatId: string) => {
    setViewProfileUid(null);
    setInitialSelectedChatId(chatId);
    setActiveTab('chats');
  }, []);

  const handleClaimSubmitted = useCallback((chatId: string) => {
    setDetailItem(null);
    setInitialSelectedChatId(chatId);
    setActiveTab('chats');
    void loadItems(false);
  }, [loadItems]);

  const handleBlockListChanged = useCallback(() => {
    void reloadBlockedUsers();
  }, [reloadBlockedUsers]);

  const handlePushDeepLink = useCallback(
    (target: PushDeepLinkTarget) => {
      if (target.tab) setActiveTab(target.tab);
      if (target.conversationId) {
        setInitialSelectedChatId(target.conversationId);
        setActiveTab('chats');
      }
      if (target.listingId) {
        const existing = items.find((item) => item.id === target.listingId);
        if (existing) {
          setDetailItem(existing);
        } else {
          void getSupabaseItems().then((loaded) => {
            const match = loaded.find((item) => item.id === target.listingId);
            if (match) setDetailItem(match);
          });
        }
      }
      if (target.requestId) {
        setActiveTab('chats');
      }
      if (target.chatFeedbackPanel) {
        setInitialChatFeedbackPanel(target.chatFeedbackPanel);
        setActiveTab('chats');
      } else if (target.staffPanel === 'reports') {
        setInitialChatFeedbackPanel('staffReports');
        setActiveTab('chats');
      } else if (target.staffPanel === 'tickets') {
        setActiveTab('chats');
        setInitialChatSupportView('list');
      }
      if (target.notificationsTab) {
        openNotificationsHub(target.notificationsTab);
      } else if (target.notifications) {
        openNotificationsHub('notifications');
      }
      if (target.directorOverview) {
        setScrollToDirectorOverview(true);
        setActiveTab('profile');
      }
      if (target.supportTicketId) {
        setInitialSupportTicketId(target.supportTicketId);
        setActiveTab('chats');
      }
      if (target.chatSupportView) {
        setInitialChatSupportView(target.chatSupportView);
        setActiveTab('chats');
      }
    },
    [items],
  );

  usePushDeepLinkNavigation(handlePushDeepLink);

  useEffect(() => {
    if (!userProfile) return;
    const target = parsePushDeepLink(window.location.pathname);
    if (target) handlePushDeepLink(target);
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

  return (
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-app antialiased font-sans">
      {authBootstrapping && !sessionUser ? (
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
            onViewListing={setGuestDetailItem}
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
                  : 'Account suspended'}
              </h1>
              <p className="text-sm text-muted max-w-md leading-relaxed">
                {accountRestriction.reason === 'banned'
                  ? 'Your account has been disabled by community staff. Contact the Buy Nothing team if you believe this is a mistake.'
                  : accountRestriction.suspendedUntil
                    ? `Your account is suspended until ${new Date(accountRestriction.suspendedUntil).toLocaleString()}. You cannot use the app until then.`
                    : 'Your account is temporarily suspended.'}
              </p>
              <button type="button" onClick={handleLogOut} className="sbn-btn sbn-btn-secondary">
                Sign out
              </button>
            </div>
          ) : (
            <NotificationsHubProvider userProfile={userProfile}>
               {deviceType === 'mobile' ? (
                <MobileView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onOpenNewEvent={() => setShowPostEventModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={loadItems}
                  onRefreshEvents={() => void loadEvents(false)}
                  isEventsLoading={isEventsLoading}
                  onViewItem={setDetailItem}
                  onDeletePost={handleDeletePost}
                  onViewEvent={setDetailEvent}
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
                />
              ) : deviceType === 'tablet' ? (
                <TabletView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onOpenNewEvent={() => setShowPostEventModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={loadItems}
                  onRefreshEvents={() => void loadEvents(false)}
                  isEventsLoading={isEventsLoading}
                  onViewItem={setDetailItem}
                  onDeletePost={handleDeletePost}
                  onViewEvent={setDetailEvent}
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
                />
              ) : (
                <DesktopView
                  items={visibleItems}
                  events={visibleEvents}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onOpenNewEvent={() => setShowPostEventModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onClaimSubmitted={handleClaimSubmitted}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  pendingChatCompose={pendingChatCompose}
                  onClearPendingChatCompose={() => setPendingChatCompose(null)}
                  onDeleteAccount={handleDeleteAccount}
                  onRefresh={loadItems}
                  onRefreshEvents={() => void loadEvents(false)}
                  isEventsLoading={isEventsLoading}
                  onViewItem={setDetailItem}
                  onDeletePost={handleDeletePost}
                  onViewEvent={setDetailEvent}
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
                  <AwardsPanel userProfile={userProfile} />
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
                  onViewPost={setDetailItem}
                  onDeletePost={handleDeletePost}
                  onBlockListChanged={handleBlockListChanged}
                />
              )}

              {detailItem && (
                <ItemDetailView
                  item={detailItem}
                  currentUserId={userProfile.uid}
                  updating={detailUpdating}
                  onClose={() => setDetailItem(null)}
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
                    blockedUserIds.has(detailItem.userId)
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
                  userProfile={userProfile}
                  onClaimSubmitted={handleClaimSubmitted}
                />
              )}

              {detailEvent && (
                <EventDetailView
                  event={detailEvent}
                  currentUserId={userProfile.uid}
                  userProfile={userProfile}
                  rsvpState={eventsEngagement.getRsvpsForEvent(detailEvent.id)}
                  comments={eventsEngagement.getCommentsForEvent(detailEvent.id)}
                  onRsvp={(status) =>
                    eventsEngagement.handleRsvp(detailEvent.id, detailEvent.userId, status)
                  }
                  onAddComment={(text) => eventsEngagement.handleAddComment(detailEvent.id, text)}
                  onDeleteComment={(commentId) =>
                    void eventsEngagement.handleDeleteComment(detailEvent.id, commentId)
                  }
                  onClose={() => setDetailEvent(null)}
                  onEdit={() => {
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
                  updating={detailEventUpdating}
                />
              )}

              {(showPostModal || editingItem) && (
                <PostItemModal
                  userProfile={userProfile}
                  editItem={editingItem}
                  onClose={() => {
                    setShowPostModal(false);
                    setEditingItem(null);
                  }}
                  onSuccess={() => {
                    loadItems(false);
                    setActiveTab('feed');
                    setShowPostModal(false);
                    setEditingItem(null);
                  }}
                />
              )}

              {(showPostEventModal || editingEvent) && (
                <PostEventModal
                  userProfile={userProfile}
                  editEvent={editingEvent}
                  onClose={() => {
                    setShowPostEventModal(false);
                    setEditingEvent(null);
                  }}
                  onSuccess={() => {
                    void loadEvents(false);
                    setActiveTab('events');
                    setShowPostEventModal(false);
                    setEditingEvent(null);
                  }}
                />
              )}
            </NotificationsHubProvider>
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
          className="fixed bottom-20 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-xs md:max-w-md z-[45] bg-surface border border-app border-l-[4px] border-l-[#FF4500] shadow-2xl p-4 rounded-xl transition-all duration-300 text-app font-sans animate-fade-in"
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
            <div className="mt-3 flex items-center justify-end space-x-3 pt-2.5 border-t border-[#1A1A1B]">
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
    </div>
  );
}
