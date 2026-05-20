import { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, getDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, ItemPost } from './types';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import PostItemModal from './components/PostItemModal';
import ItemGrid from './components/ItemGrid';
import ChatSystem from './components/ChatSystem';
import UserProfileView from './components/UserProfileView';
import SupabaseIndicator from './components/SupabaseIndicator';
import { getSupabaseProfile, upsertSupabaseProfile, getSupabaseItems, getOrCreateSupabaseChat } from './supabase';
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
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

  // 1. Subscribe to Firebase Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsProfileLoading(true);
        setErrorMsg('');
        
        let profile: UserProfile | null = null;
        
        // Try Supabase first
        try {
          profile = await getSupabaseProfile(user.uid);
        } catch (sbErr) {
          console.warn('Supabase offline/not configured:', sbErr);
        }
        
        // If not in Supabase, try Firestore
        if (!profile) {
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              profile = {
                uid: data.uid,
                displayName: data.displayName,
                photoURL: data.photoURL || '',
                email: data.email,
                neighborhood: data.neighborhood,
                bio: data.bio || '',
                createdAt: data.createdAt
              };
              
              // Try syncing back to Supabase
              try {
                await upsertSupabaseProfile(profile);
              } catch (_) {}
            }
          } catch (fsErr) {
            console.warn('Firestore user profile fetch failed (offline/unreachable):', fsErr);
          }
        } else {
          // Sync Supabase profile to Firestore
          try {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
              uid: profile.uid,
              displayName: profile.displayName,
              photoURL: profile.photoURL || '',
              email: profile.email,
              neighborhood: profile.neighborhood,
              bio: profile.bio || '',
              createdAt: new Date(profile.createdAt || Date.now())
            }, { merge: true });
          } catch (fsErr) {
            console.warn('Firestore profile sync failed:', fsErr);
          }
        }

        // If neither worked, try localStorage fallback
        if (!profile) {
          const cachedProfileStr = localStorage.getItem(`profile_${user.uid}`);
          if (cachedProfileStr) {
            try {
              profile = JSON.parse(cachedProfileStr);
            } catch (_) {}
          }
        }

        // If we still don't have a profile, construct a smart temporary guest profile
        if (!profile) {
          profile = {
            uid: user.uid,
            displayName: user.displayName || user.email?.split('@')[0] || 'Sacramento Neighbor',
            photoURL: user.photoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(user.uid)}`,
            email: user.email || 'neighbor@sacramentobuynothing.org',
            neighborhood: 'Midtown',
            bio: 'Sacramento Buy Nothing collective member.',
            createdAt: new Date().toISOString()
          };
          localStorage.setItem(`profile_${profile.uid}`, JSON.stringify(profile));
        }

        setUserProfile(profile);
        setIsProfileLoading(false);
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Item Listings from Firestore once user is onboarded
  useEffect(() => {
    if (!userProfile) {
      setItems([]);
      return;
    }

    setIsItemsLoading(true);
    const itemsRef = collection(db, 'items');
    // Query order by most recent post first
    const q = query(itemsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems: ItemPost[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedItems.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          type: data.type,
          category: data.category,
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          userPhotoURL: data.userPhotoURL,
          neighborhood: data.neighborhood,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });

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
      
      // If we got items, save to fallback
      if (finalItems.length > 0) {
        localStorage.setItem('cached_items', JSON.stringify(finalItems));
        setItems(finalItems);
      } else {
        // No items in DB, combine local listings with beautiful default Sacramento database
        setItems([...filteredLocal, ...DEFAULT_OFFLINE_ITEMS]);
      }
      setIsItemsLoading(false);
    }, (error) => {
      console.warn('Firestore real-time subscription error, using cached/offline listings:', error);
      setIsItemsLoading(false);

      // Offline flow: retrieve local drafted items + cached items, or fallback to real Sacramento Buy Nothing listing base
      const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
      let localListings: ItemPost[] = [];
      try {
        localListings = JSON.parse(localListingsStr);
      } catch (_) {}

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

      const serverIds = new Set(localListings.map(item => item.id));
      const filteredCached = finalCached.filter(item => !serverIds.has(item.id));

      setItems([...localListings, ...filteredCached]);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Handle Google Login popup
  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    setErrorMsg('');
    const provider = new GoogleAuthProvider();
    // Force prompt to ensure user can select accounts smoothly inside sandbox
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setIsAuthLoading(false);
      setErrorMsg('Login interrupted or rejected. Please try again.');
      console.warn(err);
    }
  };

  // Sign out
  const handleLogOut = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setActiveTab('feed');
    } catch (err) {
      console.error(err);
    }
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
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDocSnap = await getDoc(chatDocRef);

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
        lastMessageAt: new Date(),
        lastMessageText: `Proposed an exchange for: "${item?.title || 'item'}"`,
        lastMessageSenderId: userProfile.uid,
        itemId: item?.id || '',
        itemTitle: item?.title || ''
      };

      // Sync Chat room details to Supabase
      try {
        await getOrCreateSupabaseChat(chatId, payload);
      } catch (sbErr) {
        console.warn('Supabase chat synchronization bypassed or failed:', sbErr);
      }

      if (!chatDocSnap.exists()) {
        // Chat doesn't exist, create it!
        await setDoc(chatDocRef, payload);
      } else if (item) {
        // Chat exists, update the specific post context so they know what they are chatting about
        await setDoc(chatDocRef, {
          lastMessageAt: new Date(),
          itemId: item.id,
          itemTitle: item.title
        }, { merge: true });
      }

      setInitialSelectedChatId(chatId);
      setActiveTab('chats');
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
      } catch (authError: any) {
        alert('Exchange coordination could not be started. Check login token state.');
      }
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
      {!firebaseUser ? (
        <LandingPage onGoogleLogin={handleGoogleLogin} errorMsg={errorMsg} />
      ) : (
        /* 3. Post-Auth Onboard vs App Feed Layout */
        <>
          {!userProfile ? (
            /* User signed in but needs onboarding details */
            <Onboarding onComplete={handleOnboardingComplete} />
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
