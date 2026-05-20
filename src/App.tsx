import { useState, useEffect } from 'react';
import { UserProfile, ItemPost } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemGrid from './components/ItemGrid';
import ChatSystem from './components/ChatSystem';
import UserProfileView from './components/UserProfileView';
import SupabaseIndicator from './components/SupabaseIndicator';
import { 
  supabase, 
  getSupabaseProfile, 
  upsertSupabaseProfile, 
  getSupabaseItems, 
  getOrCreateSupabaseChat 
} from './supabase';
import { Gift, MapPin, MessageSquare, Heart, Sparkles } from 'lucide-react';

const DEFAULT_OFFLINE_ITEMS: ItemPost[] = [
  {
    id: "offline_item_1",
    title: "Excess organic lemons from backyard tree",
    description: "Harvested yesterday. Absolutely organic, very juicy and yellow. Perfect for making fresh lemonade, salad dressing, or zesty lemon baking! Safe contactless pickup on our front porch in Land Park. Feel free to take a bunch!",
    type: "giveaway",
    category: "Garden & Outdoors",
    userId: "landpark_margo",
    userDisplayName: "Margo Sutter",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Margo",
    neighborhood: "Land Park",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "offline_item_2",
    title: "Solid Pine dining room table",
    description: "Sturdy solid pine wood table. Easily fits up to 6 chairs. It has some small cosmetic surface scratches from past crafts, but structural condition is perfect. Needs two people to lift and carry from a first-floor apartment. No chairs included.",
    type: "giveaway",
    category: "Furniture",
    userId: "midtown_alex",
    userDisplayName: "Alex Rivera",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Alex",
    neighborhood: "Midtown",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "offline_item_3",
    title: "Double Baby Stroller",
    description: "Double baby stroller system in dark gray fabric. Front child bar, large storage basket, and UV sun canopies. Pre-cleaned and fabric covers washed. Free for any young family needing a stroller upgrade!",
    type: "giveaway",
    category: "Baby & Kids",
    userId: "eastsac_sarah",
    userDisplayName: "Sarah Nguyen",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Sarah",
    neighborhood: "East Sacramento",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "offline_item_4",
    title: "In-Search-Of: Slow Cooker / Crockpot",
    description: "Hi neighbors! Our family slow cooker developed a hairline fracture along the ceramic pot. Does anyone have an extra digital slow cooker or standard crockpot sitting unused in their garage or cabinets? Happy to pick up anywhere in West or East Sac! Thanks!",
    type: "looking",
    category: "Kitchen & Dining",
    userId: "curtispark_david",
    userDisplayName: "David Bowman",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=David",
    neighborhood: "Curtis Park",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "offline_item_5",
    title: "Assorted hardback mystery novels",
    description: "A stack of 12 thriller and detective mystery novels. Includes authors like Stephen King, John Grisham, and Michael Connelly. Feel free to browse or take the whole pile. Great vacation reads! Porch pickup near Fremont Park.",
    type: "giveaway",
    category: "Books & Education",
    userId: "midtown_emily",
    userDisplayName: "Emily Parker",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Emily",
    neighborhood: "Midtown",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "offline_item_6",
    title: "Bag of premium dry dog food (unopened)",
    description: "15-pound bag of premium salmon and sweet potato dry dog food. Sealed and freshly bought, expires September next year. Our young pup was placed on a specialized diet, so we have no use for this beautiful nutrient bag. Hope it can feed a happy neighbor canine!",
    type: "giveaway",
    category: "Pet Supplies",
    userId: "natomas_chris",
    userDisplayName: "Chris Evans",
    userPhotoURL: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Chris",
    neighborhood: "Natomas",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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
    
    // Try Supabase first
    try {
      profile = await getSupabaseProfile(user.id);
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
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
      setErrorMsg(err.message || 'Signature detour error.');
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
      {/* 1. Loader screen */}
      {(isAuthLoading || isProfileLoading) && (
        <div id="fullscreen_interactive_loader" className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-none animate-spin" />
          <p className="text-[9.5px] font-black text-black uppercase tracking-widest font-mono">ROUTING SYSTEM VERIFICATIONS...</p>
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
                
                {/* Supabase PostgreSQL live alignment notice */}
                <SupabaseIndicator />

                {activeTab === 'feed' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">EXCHANGE DIRECTORY</h2>
                        <p className="text-xs text-zinc-550 mt-1 font-semibold leading-relaxed">
                          Active operational records within the <span className="font-black text-[#276EF1] uppercase">{userProfile.neighborhood} Sector</span> and Greater Sacramento District.
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
