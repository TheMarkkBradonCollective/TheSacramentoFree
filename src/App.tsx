import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useItemsEngagement } from './hooks/useItemsEngagement';
import { useItemsRealtime } from './hooks/useItemsRealtime';
import { UserProfile, ItemPost } from './types';
import Navbar from './components/Navbar';
import PublicSite from './components/public/PublicSite';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemDetailView from './components/ItemDetailView';
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
  getSupabaseItems,
  getOrCreateSupabaseChat,
  updateSupabaseItemStatus,
  deleteSupabaseItem,
} from './supabase';
import { APP_LOGO_SRC, SITE } from './siteContent';

const DEFAULT_OFFLINE_ITEMS: ItemPost[] = [];

export default function App() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const profileLoadRef = useRef<Promise<void> | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'chats' | 'profile'>('map');
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemPost | null>(null);
  const [detailItem, setDetailItem] = useState<ItemPost | null>(null);
  const [detailUpdating, setDetailUpdating] = useState(false);
  const [viewProfileUid, setViewProfileUid] = useState<string | null>(null);
  const [items, setItems] = useState<ItemPost[]>([]);
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const engagement = useItemsEngagement(itemIds, userProfile);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial Chat Trigger State when clicking "Message Member"
  const [initialSelectedChatId, setInitialSelectedChatId] = useState<string | null>(null);

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


  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);

  const handleUserAuthenticated = useCallback(async (user: any) => {
    setIsProfileLoading(true);
    setErrorMsg('');

    let profile: UserProfile | null = null;

    try {
      profile = await withTimeout(getSupabaseProfile(user.id), 8000, null);
    } catch (sbErr) {
      console.warn('Supabase profile fetch failed:', sbErr);
    }

    if (profile && profile.email === 'sigsecspec@gmail.com') {
      profile.role = 'director';
    }

    if (!profile) {
      profile = {
        uid: user.id,
        displayName: user.user_metadata?.displayName || user.email?.split('@')[0] || 'Sacramento Neighbor',
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.id)}`,
        email: user.email || 'neighbor@sacramentobuynothing.org',
        neighborhood: user.user_metadata?.neighborhood || 'Midtown',
        bio: user.user_metadata?.bio || 'Sacramento Buy Nothing collective member.',
        createdAt: new Date().toISOString(),
        role: user.email === 'sigsecspec@gmail.com' ? 'director' : 'user',
      };

      await withTimeout(upsertSupabaseProfile(profile), 8000, { ok: false });
    }

    setUserProfile(profile);
    setIsProfileLoading(false);
    setIsAuthLoading(false);
  }, []);

  const loadProfileForUser = useCallback(
    (user: any): Promise<void> => {
      if (!user?.id) return Promise.resolve();
      if (profileLoadRef.current) {
        return profileLoadRef.current;
      }
      const task = handleUserAuthenticated(user).finally(() => {
        if (profileLoadRef.current === task) {
          profileLoadRef.current = null;
        }
      });
      profileLoadRef.current = task;
      return task;
    },
    [handleUserAuthenticated],
  );

  // 1. Subscribe to Supabase Auth State changes
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) {
          console.warn('Error checking supabase session:', error);
        }

        if (session?.user) {
          setIsProfileLoading(true);
          setSessionUser(session.user);
          await handleUserAuthenticated(session.user);
        } else {
          setSessionUser(null);
          setUserProfile(null);
          setIsAuthLoading(false);
          setIsProfileLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Error checking supabase session:', err);
          setIsAuthLoading(false);
          setIsProfileLoading(false);
        }
      } finally {
        if (!cancelled) {
          setAuthBootstrapping(false);
        }
      }
    };

    void checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (session?.user) {
        setIsProfileLoading(true);
        setSessionUser(session.user);
        // Defer async work — awaiting inside this callback can deadlock Supabase auth.
        setTimeout(() => {
          if (!cancelled) {
            loadProfileForUser(session.user);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setSessionUser(null);
        setUserProfile(null);
        setIsAuthLoading(false);
        setIsProfileLoading(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [handleUserAuthenticated, loadProfileForUser]);

  const loadItems = async (isBackground = false) => {
    if (!userProfile) return;
    if (!isBackground) {
      setIsItemsLoading(true);
    }
    try {
      const loadedItems = await getSupabaseItems();
      setItems(loadedItems);
    } catch (err) {
      console.warn('Supabase items fetch failed:', err);
      setItems(DEFAULT_OFFLINE_ITEMS);
    } finally {
      if (!isBackground) {
        setIsItemsLoading(false);
      }
    }
  };

  // 2. Load listings once, then keep in sync via Supabase Realtime
  useEffect(() => {
    if (!userProfile) {
      setItems([]);
      return;
    }
    loadItems(false);
  }, [userProfile]);

  useItemsRealtime(!!userProfile, setItems);

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
        setIsProfileLoading(true);
        setSessionUser(data.user);
        await handleUserAuthenticated(data.user);
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

        setIsProfileLoading(false);
        setSessionUser(data.user);
        setUserProfile(newProfile);
        setIsAuthLoading(false);
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
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    setSessionUser(null);
    setUserProfile(null);
    setActiveTab('map');
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
  };

  useEffect(() => {
    if (detailItem) {
      engagement.setCommentsExpanded(detailItem.id, true);
    }
  }, [detailItem?.id]);

  const refreshDetailItem = useCallback(async () => {
    const loadedItems = await getSupabaseItems();
    setItems(loadedItems);
    setDetailItem((current) => {
      if (!current) return null;
      return loadedItems.find((i) => i.id === current.id) ?? null;
    });
  }, []);

  const handleDetailUpdateStatus = async (status: 'completed' | 'withdrawn' | 'active') => {
    if (!detailItem) return;
    setDetailUpdating(true);
    try {
      await updateSupabaseItemStatus(detailItem.id, status);
      await refreshDetailItem();
    } catch (err) {
      console.warn('Failed to update listing status:', err);
    } finally {
      setDetailUpdating(false);
    }
  };

  const handleDetailDelete = async () => {
    if (!detailItem) return;
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    setDetailUpdating(true);
    try {
      await deleteSupabaseItem(detailItem.id);
      setDetailItem(null);
      await loadItems(false);
    } catch (err) {
      console.warn('Failed to delete listing:', err);
    } finally {
      setDetailUpdating(false);
    }
  };

  // Initiate Chat when clicking Msg icon on post card
  const handleInitiateChat = async (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => {
    if (!userProfile) return;

    // Generate unique alphabetical chat ID to bypass duplicates
    const participants = [userProfile.uid, posterUid].sort();
    const chatId = participants.join('_');

    setIsProfileLoading(true);

    try {
      const payload = {
        id: chatId,
        participantIds: participants,
        participantNames: {
          [userProfile.uid]: userProfile.displayName,
          [posterUid]: posterName
        },
        participantPhotos: {
          [userProfile.uid]: userProfile.photoURL || '',
          [posterUid]: posterPhoto || ''
        },
        lastMessageAt: new Date().toISOString(),
        lastMessageText: `Proposed an exchange for: "${item?.title || 'item'}"`,
        lastMessageSenderId: userProfile.uid,
        itemId: item?.id || '',
        itemTitle: item?.title || ''
      };

      // Sync Chat room details to Supabase
      await getOrCreateSupabaseChat(chatId, payload);

      setInitialSelectedChatId(chatId);
      setActiveTab('chats');
    } catch (err) {
      console.warn('Exchange coordination could not be synced:', err);
      // Fallback local UI session activation
      setInitialSelectedChatId(chatId);
      setActiveTab('chats');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleProfileMessage = async () => {
    if (!viewProfileUid || !userProfile || viewProfileUid === userProfile.uid) return;
    const neighbor = await getSupabaseProfile(viewProfileUid);
    if (!neighbor) return;
    setViewProfileUid(null);
    await handleInitiateChat(neighbor.uid, neighbor.displayName, neighbor.photoURL);
    setActiveTab('chats');
  };

  return (
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-app antialiased font-sans">
      {/* 2. Authentication Landing View */}
      {!sessionUser ? (
        <PublicSite
          onEmailSignIn={handleEmailSignIn}
          onEmailSignUp={handleEmailSignUp}
          errorMsg={errorMsg}
          isAuthLoading={isAuthLoading}
        />
      ) : authBootstrapping || isProfileLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center mesh-bg">
          <div className="w-11 h-11 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-hidden />
          <p className="font-display text-lg font-bold text-app">Signing you in…</p>
          <p className="text-sm text-muted max-w-xs">Setting up your neighbor profile.</p>
        </div>
      ) : (
        <>
          {!userProfile ? (
            <Onboarding user={sessionUser} onComplete={handleOnboardingComplete} />
          ) : (
            <>
               {deviceType === 'mobile' ? (
                <MobileView
                  items={items}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  onRefresh={loadItems}
                  onViewItem={setDetailItem}
                  onViewProfile={setViewProfileUid}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                />
              ) : deviceType === 'tablet' ? (
                <TabletView
                  items={items}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  onRefresh={loadItems}
                  onViewItem={setDetailItem}
                  onViewProfile={setViewProfileUid}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                />
              ) : (
                <DesktopView
                  items={items}
                  userProfile={userProfile}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  onOpenNewPost={() => setShowPostModal(true)}
                  onInitiateChat={handleInitiateChat}
                  onLogout={handleLogOut}
                  onUpdateProfile={(updated) => setUserProfile(updated)}
                  initialSelectedChatId={initialSelectedChatId}
                  onClearInitialChat={() => setInitialSelectedChatId(null)}
                  onRefresh={loadItems}
                  onViewItem={setDetailItem}
                  onViewProfile={setViewProfileUid}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setDetailItem(null);
                  }}
                  engagement={engagement}
                />
              )}

              {viewProfileUid && (
                <NeighborProfileView
                  userId={viewProfileUid}
                  currentUserId={userProfile.uid}
                  onClose={() => setViewProfileUid(null)}
                  onMessage={
                    viewProfileUid !== userProfile.uid ? handleProfileMessage : undefined
                  }
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
                  onDelete={handleDetailDelete}
                  onViewProfile={setViewProfileUid}
                  voteState={engagement.getVotesForPost(detailItem.id)}
                  comments={engagement.getCommentsForPost(detailItem.id)}
                  onVote={(dir) => engagement.handleVote(detailItem.id, detailItem.userId, dir)}
                  onAddComment={(text) => engagement.handleAddComment(detailItem.id, text)}
                  onMessage={() => {
                    handleInitiateChat(
                      detailItem.userId,
                      detailItem.userDisplayName,
                      detailItem.userPhotoURL,
                      detailItem,
                    );
                    setDetailItem(null);
                  }}
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
            </>
          )}
        </>
      )}

      {/* Floating PWA Install Helper Banner */}
      {showInstallBanner && !isAlreadyInstalled && (
        <div 
          id="pwa_floating_install_banner" 
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-6 sm:right-6 sm:max-w-xs md:max-w-md z-50 bg-surface border border-app border-l-[4px] border-l-[#FF4500] shadow-2xl p-4 rounded-xl transition-all duration-300 text-app font-sans animate-fade-in"
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
    </div>
  );
}
