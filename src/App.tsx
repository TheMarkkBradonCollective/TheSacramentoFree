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

  // 1. Subscribe to Firebase Auth State changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setIsProfileLoading(true);
        setErrorMsg('');
        try {
          // Attempt to find profile in Supabase first
          let profile = await getSupabaseProfile(user.uid);
          
          if (!profile) {
            // Check if user has an existing community profile in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              profile = {
                uid: data.uid,
                displayName: data.displayName,
                photoURL: data.photoURL,
                email: data.email,
                neighborhood: data.neighborhood,
                bio: data.bio || '',
                createdAt: data.createdAt
              };
              // Sync Firestore profile back up to Supabase
              await upsertSupabaseProfile(profile);
            }
          } else {
            // Sync Supabase profile to Firestore so there is alignment
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

          if (profile) {
            setUserProfile(profile);
          } else {
            // Needs onboarding
            setUserProfile(null);
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          } catch (authError: any) {
            setErrorMsg('System block: Failed to query account verification records.');
            console.error(authError);
          }
        } finally {
          setIsProfileLoading(false);
        }
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
      setItems(loadedItems);
      setIsItemsLoading(false);
    }, (error) => {
      setIsItemsLoading(false);
      try {
        handleFirestoreError(error, OperationType.LIST, 'items');
      } catch (authError: any) {
        setErrorMsg('Authentication expired. Please log out and sign back in.');
      }
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
    <div id="app_root_layout" className="min-h-screen flex flex-col mesh-bg text-slate-800 antialiased font-sans">
      {/* 1. Loader screen */}
      {(isAuthLoading || isProfileLoading) && (
        <div id="fullscreen_interactive_loader" className="fixed inset-0 mesh-bg z-50 flex flex-col items-center justify-center space-y-4 backdrop-blur-md">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest font-mono">Syncing Sacramento Community...</p>
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
                        <h2 className="text-xl font-bold tracking-tight text-gray-900">Neighborhood Exchange</h2>
                        <p className="text-xs text-gray-500 mt-1">
                          You are viewing verified posts in the <span className="font-semibold text-emerald-600">{userProfile.neighborhood}</span> and general Sacramento area.
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
