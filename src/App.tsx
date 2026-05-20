import { useState, useEffect } from 'react';
import { UserProfile, ItemPost } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemGrid from './components/ItemGrid';
import ChatSystem from './components/ChatSystem';
import UserProfileView from './components/UserProfileView';
import { 
  supabase, 
  getSupabaseProfile, 
  upsertSupabaseProfile, 
  getSupabaseItems, 
  getOrCreateSupabaseChat 
} from './supabase';
import { Gift, MapPin, MessageSquare, Heart, Sparkles } from 'lucide-react';

const DEFAULT_OFFLINE_ITEMS: ItemPost[] = [];

export default function App() {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'chats' | 'profile'>('feed');
  const [showPostModal, setShowPostModal] = useState(false);
  const [items, setItems] = useState<ItemPost[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial Chat Trigger State when clicking "Message Member"
  const [initialSelectedChatId, setInitialSelectedChatId] = useState<string | null>(null);

  // Sync profile update to localStorage
  useEffect(() => {
    if (userProfile?.uid) {
      localStorage.setItem(`profile_${userProfile.uid}`, JSON.stringify(userProfile));
    }
  }, [userProfile]);

  const handleUserAuthenticated = async (user: any) => {
    setIsProfileLoading(true);
    setErrorMsg('');
    
    let profile: UserProfile | null = null;
    
    // Try Supabase first with a safe timeout
    try {
      const getProfilePromise = getSupabaseProfile(user.id);
      const profileTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
      profile = await Promise.race([getProfilePromise, profileTimeout]);
    } catch (sbErr) {
      console.warn('Supabase profile fetch failed:', sbErr);
    }

    // If neither worked, try localStorage fallback
    if (!profile) {
      const cachedProfileStr = localStorage.getItem(`profile_${user.id}`);
      if (cachedProfileStr) {
        try {
          profile = JSON.parse(cachedProfileStr);
        } catch (_) {}
      }
    }

    // Constructor of temporary cached profile if missing
    if (!profile) {
      profile = {
        uid: user.id,
        displayName: user.user_metadata?.displayName || user.email?.split('@')[0] || 'Sacramento Neighbor',
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.id)}`,
        email: user.email || 'neighbor@sacramentobuynothing.org',
        neighborhood: user.user_metadata?.neighborhood || 'Midtown',
        bio: user.user_metadata?.bio || 'Sacramento Buy Nothing collective member.',
        createdAt: new Date().toISOString()
      };
      
      try {
        await upsertSupabaseProfile(profile);
      } catch (_) {}
      localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(profile));
    }

    setUserProfile(profile);
    setIsProfileLoading(false);
    setIsAuthLoading(false);
  };

  // 1. Subscribe to Supabase Auth State changes
  useEffect(() => {
    let authCompleted = false;

    // Safety timeout: Auto-bypass after 1.8 seconds max if database initialization or fetch hangs
    const safetyTimeout = setTimeout(() => {
      if (!authCompleted) {
        console.warn('Database session check didn\'t finish within safety threshold. Auto-bypassing...');
        const cachedGuest = localStorage.getItem('supabase_guest_profile');
        if (cachedGuest) {
          try {
            const guest = JSON.parse(cachedGuest);
            setSessionUser(guest);
            setUserProfile(guest);
          } catch (_) {}
        }
        setIsAuthLoading(false);
        setIsProfileLoading(false);
      }
    }, 1800);

    const checkSession = async () => {
      try {
        // Race the fetch call with a 1200ms timeout promise
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => 
          setTimeout(() => resolve({ data: { session: null } }), 1200)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (session?.user) {
          setSessionUser(session.user);
          await handleUserAuthenticated(session.user);
        } else {
          // Check if there is a cached guest user
          const cachedGuest = localStorage.getItem('supabase_guest_profile');
          if (cachedGuest) {
            try {
              const guest = JSON.parse(cachedGuest);
              setSessionUser(guest);
              setUserProfile(guest);
            } catch (_) {
              setSessionUser(null);
              setUserProfile(null);
            }
          } else {
            setSessionUser(null);
            setUserProfile(null);
          }
          setIsAuthLoading(false);
        }
      } catch (err) {
        console.warn('Error checking supabase session:', err);
        setIsAuthLoading(false);
      } finally {
        authCompleted = true;
        clearTimeout(safetyTimeout);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
        await handleUserAuthenticated(session.user);
      } else {
        const cachedGuest = localStorage.getItem('supabase_guest_profile');
        if (cachedGuest) {
          try {
            const guest = JSON.parse(cachedGuest);
            setSessionUser(guest);
            setUserProfile(guest);
          } catch (_) {
            setSessionUser(null);
            setUserProfile(null);
          }
        } else {
          setSessionUser(null);
          setUserProfile(null);
        }
        setIsAuthLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  // 2. Load Item Listings periodically from Supabase once user is onboarded
  useEffect(() => {
    if (!userProfile) {
      setItems([]);
      return;
    }

    let isSubscribed = true;

    const loadItems = async () => {
      setIsItemsLoading(true);
      try {
        const loadedItems = await getSupabaseItems();
        
        if (!isSubscribed) return;

        // Merge current local drafted items so that user's offline submissions show up too
        const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
        let localListings: ItemPost[] = [];
        try {
          localListings = JSON.parse(localListingsStr);
        } catch (_) {}

        // Filter local items to avoid repeating items loaded from server
        const serverIds = new Set(loadedItems.map(item => item.id));
        const filteredLocal = localListings.filter(item => !serverIds.has(item.id));

        // Merge order
        const finalItems = [...filteredLocal, ...loadedItems];
        
        if (finalItems.length > 0) {
          localStorage.setItem('cached_items', JSON.stringify(finalItems));
          setItems(finalItems);
        } else {
          setItems([...filteredLocal, ...DEFAULT_OFFLINE_ITEMS]);
        }
      } catch (err) {
        console.warn('Supabase items fetch failed, using offline fallback:', err);
        if (!isSubscribed) return;

        const cachedStr = localStorage.getItem('cached_items');
        let finalCached: ItemPost[] = [];
        if (cachedStr) {
          try {
            finalCached = JSON.parse(cachedStr);
          } catch (_) {}
        }
        if (finalCached.length === 0) {
          finalCached = DEFAULT_OFFLINE_ITEMS;
        }
        setItems(finalCached);
      } finally {
        if (isSubscribed) {
          setIsItemsLoading(false);
        }
      }
    };

    loadItems();
    const interval = setInterval(loadItems, 8000); // Poll for real Sacramento listings

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [userProfile]);

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
        setSessionUser(data.user);
        await handleUserAuthenticated(data.user);
        return true;
      }
      setIsAuthLoading(false);
      return false;
    } catch (err: any) {
      console.warn('Supabase sign-in failed, checking safe local ledger database fallback...', err);
      
      // 1. Try local cooperative registered users fallback
      let localUsers: Record<string, any> = {};
      try {
        localUsers = JSON.parse(localStorage.getItem('local_cooperative_users') || '{}');
      } catch (_) {}

      const localUser = localUsers[email.trim().toLowerCase()];
      if (localUser && localUser.password === password) {
        const profile = localUser.profile;
        localStorage.setItem('supabase_guest_profile', JSON.stringify(profile));
        localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(profile));
        setSessionUser(profile);
        setUserProfile(profile);
        setIsAuthLoading(false);
        return true;
      }

      setIsAuthLoading(false);
      const friendlyErr = String(err?.message || err || '');
      if (friendlyErr.toLowerCase().includes('failed to fetch') || friendlyErr.toLowerCase().includes('fetch')) {
        setErrorMsg('Connection offline (Failed to Fetch). The cloud database is unreachable. Check your adblocker or select Guest Access to continue offline.');
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
    const normEmail = email.trim().toLowerCase();
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
        localStorage.setItem(`profile_${newProfile.uid}`, JSON.stringify(newProfile));
        
        if (!data.session) {
          setIsAuthLoading(false);
          throw new Error('Registration completed! Check your email inbox to verify your account.');
        }

        setSessionUser(data.user);
        setUserProfile(newProfile);
        setIsAuthLoading(false);
        return true;
      }
      setIsAuthLoading(false);
      return false;
    } catch (err: any) {
      console.warn('Supabase sign-up failed or offline, implementing local cooperative ledger routing...', err);
      
      // 2. Try registering locally instead of showing failure or blocked detours
      let localUsers: Record<string, any> = {};
      try {
        localUsers = JSON.parse(localStorage.getItem('local_cooperative_users') || '{}');
      } catch (_) {}

      if (localUsers[normEmail]) {
        setIsAuthLoading(false);
        const existsErr = new Error('This email is already registered as a local neighbor. Please Sign In.');
        setErrorMsg(existsErr.message);
        throw existsErr;
      }

      // Generate local client account credentials
      const localId = 'user_' + Math.random().toString(36).substring(2, 11);
      const randSeed = encodeURIComponent(displayName || localId);
      const guestProfile: UserProfile = {
        uid: localId,
        displayName: displayName,
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${randSeed}`,
        email: email,
        neighborhood: neighborhood,
        bio: bio || 'Sacramento Buy Nothing collective member.',
        createdAt: new Date().toISOString()
      };

      // Store locally
      localUsers[normEmail] = {
        id: localId,
        email: email,
        password: password,
        profile: guestProfile
      };

      localStorage.setItem('local_cooperative_users', JSON.stringify(localUsers));
      localStorage.setItem('supabase_guest_profile', JSON.stringify(guestProfile));
      localStorage.setItem(`profile_${localId}`, JSON.stringify(guestProfile));

      setSessionUser(guestProfile);
      setUserProfile(guestProfile);
      setIsAuthLoading(false);
      return true;
    }
  };

  // Handle Quick Guest Login
  const handleGuestLogin = () => {
    setIsAuthLoading(true);
    setErrorMsg('');
    const guestProfile: UserProfile = {
      uid: 'guest_' + Math.random().toString(36).substring(2, 11),
      displayName: 'Sacramento Guest ' + Math.floor(100 + Math.random() * 900),
      photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=Guest_${Date.now()}`,
      email: 'guest@sacramentobuynothing.org',
      neighborhood: 'Midtown',
      bio: 'Visiting Sacramento guest user.',
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('supabase_guest_profile', JSON.stringify(guestProfile));
    localStorage.setItem(`profile_${guestProfile.uid}`, JSON.stringify(guestProfile));
    
    setTimeout(() => {
      setSessionUser(guestProfile);
      setUserProfile(guestProfile);
      setIsAuthLoading(false);
    }, 450);
  };

  // Sign out
  const handleLogOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    localStorage.removeItem('supabase_guest_profile');
    setSessionUser(null);
    setUserProfile(null);
    setActiveTab('feed');
  };

  // Onboarding Complete Handler
  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setUserProfile(newProfile);
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

      // Local storage backup
      const localChatsKey = 'local_chats';
      let localChats: any[] = [];
      try {
        localChats = JSON.parse(localStorage.getItem(localChatsKey) || '[]');
      } catch (_) {}
      const filteredLocalList = localChats.filter(c => c.id !== chatId);
      filteredLocalList.push(payload);
      localStorage.setItem(localChatsKey, JSON.stringify(filteredLocalList));

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

  return (
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-black antialiased font-sans">
      {/* 1. Loader screen with instant skip override */}
      {(isAuthLoading || isProfileLoading) && (
        <div id="fullscreen_interactive_loader" className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center space-y-4 px-4 text-center">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-none animate-spin" />
          <p className="text-[9.5px] font-black text-zinc-900 uppercase tracking-widest font-mono">ROUTING SYSTEM VERIFICATIONS...</p>
          <button
            onClick={() => {
              setIsAuthLoading(false);
              setIsProfileLoading(false);
            }}
            className="px-3.5 py-2 text-[9px] font-black border border-zinc-200 text-zinc-500 hover:border-black hover:text-black uppercase tracking-widest font-mono transition-colors rounded-none cursor-pointer mt-2"
          >
            Offline Bypass ✕
          </button>
        </div>
      )}

      {/* 2. Authentication Landing View */}
      {!sessionUser ? (
        <LandingPage 
          onEmailSignIn={handleEmailSignIn} 
          onEmailSignUp={handleEmailSignUp} 
          onGuestLogin={handleGuestLogin} 
          errorMsg={errorMsg} 
        />
      ) : (
        /* 3. Post-Auth Onboard vs App Feed Layout */
        <>
          {!userProfile ? (
            /* User signed in but needs onboarding details */
            <Onboarding user={sessionUser} onComplete={handleOnboardingComplete} />
          ) : (
            /* Standard Dashboard Workspace */
            <>
              {/* Header Navigator */}
              <Navbar
                userProfile={userProfile}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onOpenNewPost={() => setShowPostModal(true)}
                onLogout={handleLogOut}
              />

              {/* Main Content Workspace Layout */}
              <main id="dashboard_main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-opacity duration-200 space-y-6">
                
                {activeTab === 'feed' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">EXCHANGE DIRECTORY</h2>
                        <p className="text-xs text-zinc-550 mt-1 font-semibold leading-relaxed">
                          Active operational records within the <span className="font-black text-brand-orange uppercase">{userProfile.neighborhood} Sector</span> and Greater Sacramento District.
                        </p>
                      </div>
                    </div>

                    {/* Listings list component */}
                    <ItemGrid
                      items={items}
                      userProfile={userProfile}
                      onInitiateChat={handleInitiateChat}
                      onRefresh={() => {}} // snapshot triggers automatically
                    />
                  </div>
                )}

                {activeTab === 'chats' && (
                  <ChatSystem
                    userProfile={userProfile}
                    initialSelectedChatId={initialSelectedChatId}
                    onClearInitialChat={() => setInitialSelectedChatId(null)}
                  />
                )}

                {activeTab === 'profile' && (
                  <UserProfileView
                    userProfile={userProfile}
                    onUpdateProfile={(updated) => setUserProfile(updated)}
                  />
                )}
              </main>

              {/* Posting Dialog Overlay */}
              {showPostModal && (
                <PostItemModal
                  userProfile={userProfile}
                  onClose={() => setShowPostModal(false)}
                  onSuccess={(newItem) => {
                    setActiveTab('feed');
                    setShowPostModal(false);
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
