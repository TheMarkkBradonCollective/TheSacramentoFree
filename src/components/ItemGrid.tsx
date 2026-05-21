import { useState } from 'react';
import { ItemPost, SACRAMENTO_NEIGHBORHOODS, ITEM_CATEGORIES, ISO_CATEGORIES, UserProfile } from '../types';
import { Search as SearchIcon, MapPin, Tag, MessageSquare, AlertCircle, Trash2, Calendar, ChevronUp, ChevronDown } from 'lucide-react';
import { updateSupabaseItemStatus, deleteSupabaseItem } from '../supabase';

interface ItemGridProps {
  items: ItemPost[];
  userProfile: UserProfile;
  onInitiateChat: (posterUid: string, posterName: string, posterPhoto?: string, item?: ItemPost) => void;
  onRefresh: () => void;
}

interface PostVoteState {
  userVote: 'up' | 'down' | null;
  upvotes: number;
  downvotes: number;
}

interface PostCommentType {
  id: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: string;
  userNeighborhood: string;
}

const getInitialVotesForPost = (postId: string): PostVoteState => {
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < postId.length; i++) {
    hash1 = (hash1 * 31 + postId.charCodeAt(i)) % 17;
    hash2 = (hash2 * 13 + postId.charCodeAt(i)) % 7;
  }
  const initialUp = (hash1 % 8) + 2; // 2-9 upvotes
  const initialDown = hash2 % 3;     // 0-2 downvotes
  return {
    userVote: null,
    upvotes: initialUp,
    downvotes: initialDown,
  };
};

const getInitialCommentsForPost = (postId: string, category: string, title: string): PostCommentType[] => {
  let hash = 0;
  for (let i = 0; i < postId.length; i++) {
    hash = (hash * 31 + postId.charCodeAt(i)) % 1000;
  }

  const seedCommentsList = [
    {
      text: "Is this still available for porch pickup? I can come get it right away!",
      user: "Midtown Sarah",
      neighborhood: "Midtown",
      offsetMinutes: 120
    },
    {
      text: "I want to be next in line if the first neighbor passes! 💚",
      user: "Oak Park Jerry",
      neighborhood: "Oak Park",
      offsetMinutes: 90
    },
    {
      text: "Such a beautiful item! Thank you for sharing with our community.",
      user: "Elk Grove Resident",
      neighborhood: "Elk Grove",
      offsetMinutes: 240
    },
    {
      text: "Sent a private chat to see if we can arrange details, thank you!",
      user: "Downtown Dan",
      neighborhood: "Downtown",
      offsetMinutes: 30
    },
    {
      text: "This would go perfectly in my community art class project. Hope to grab it!",
      user: "Tahoe Park Art",
      neighborhood: "Tahoe Park",
      offsetMinutes: 180
    }
  ];

  const commentCount = (hash % 2) + 1; // 1 or 2 comments
  const selected: PostCommentType[] = [];
  
  for (let i = 0; i < commentCount; i++) {
    const commentSeed = seedCommentsList[(hash + i) % seedCommentsList.length];
    const createdTime = new Date(Date.now() - commentSeed.offsetMinutes * 60 * 1000).toISOString();
    selected.push({
      id: `${postId}_comment_seed_${i}`,
      userName: commentSeed.user,
      userPhoto: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(commentSeed.user)}`,
      text: commentSeed.text,
      createdAt: createdTime,
      userNeighborhood: commentSeed.neighborhood
    });
  }
  
  return selected.sort((a,b) => a.createdAt.localeCompare(b.createdAt));
};

export default function ItemGrid({ items, userProfile, onInitiateChat, onRefresh }: ItemGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'giveaway' | 'looking'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('All Neighborhoods');
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [customVotes, setCustomVotes] = useState<Record<string, PostVoteState>>(() => {
    try {
      const saved = localStorage.getItem('sbn_custom_votes');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const [customComments, setCustomComments] = useState<Record<string, PostCommentType[]>>(() => {
    try {
      const saved = localStorage.getItem('sbn_custom_comments');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});

  const getVotesForPost = (postId: string): PostVoteState => {
    return customVotes[postId] || getInitialVotesForPost(postId);
  };

  const getCommentsForPost = (postId: string, category: string, title: string): PostCommentType[] => {
    return customComments[postId] || getInitialCommentsForPost(postId, category, title);
  };

  const handleVote = (itemId: string, direction: 'up' | 'down') => {
    const current = getVotesForPost(itemId);
    
    let newUserVote: 'up' | 'down' | null = null;
    let newUpvotes = current.upvotes;
    let newDownvotes = current.downvotes;

    if (current.userVote === direction) {
      newUserVote = null;
      if (direction === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
      else newDownvotes = Math.max(0, newDownvotes - 1);
    } else {
      if (current.userVote === 'up') newUpvotes = Math.max(0, newUpvotes - 1);
      if (current.userVote === 'down') newDownvotes = Math.max(0, newDownvotes - 1);

      newUserVote = direction;
      if (direction === 'up') newUpvotes += 1;
      else newDownvotes += 1;
    }

    const updated = {
      ...customVotes,
      [itemId]: {
        userVote: newUserVote,
        upvotes: newUpvotes,
        downvotes: newDownvotes
      }
    };

    setCustomVotes(updated);
    localStorage.setItem('sbn_custom_votes', JSON.stringify(updated));
  };

  const handleAddComment = (itemId: string, text: string) => {
    const current = getCommentsForPost(itemId, '', '');
    
    const newComment: PostCommentType = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userName: userProfile.displayName,
      userPhoto: userProfile.photoURL,
      text: text,
      createdAt: new Date().toISOString(),
      userNeighborhood: userProfile.neighborhood || 'Midtown'
    };

    const updated = {
      ...customComments,
      [itemId]: [...current, newComment]
    };

    setCustomComments(updated);
    localStorage.setItem('sbn_custom_comments', JSON.stringify(updated));
  };

  const toggleComments = (postId: string) => {
    setExpandedPostComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  // Status transitions
  const handleUpdateStatus = async (itemId: string, newStatus: 'completed' | 'withdrawn' | 'active') => {
    setUpdatingItemId(itemId);
    
    // Update local storage immediately for seamless offline response
    const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
    let localListings: ItemPost[] = [];
    try {
      localListings = JSON.parse(localListingsStr);
    } catch (_) {}
    localListings = localListings.map(item => {
      if (item.id === itemId) return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      return item;
    });
    localStorage.setItem('local_user_listings', JSON.stringify(localListings));

    const cachedStr = localStorage.getItem('cached_items') || '[]';
    let cachedItems: ItemPost[] = [];
    try {
      cachedItems = JSON.parse(cachedStr);
    } catch (_) {}
    cachedItems = cachedItems.map(item => {
      if (item.id === itemId) return { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      return item;
    });
    localStorage.setItem('cached_items', JSON.stringify(cachedItems));

    try {
      await updateSupabaseItemStatus(itemId, newStatus);
      onRefresh();
    } catch (err) {
      console.warn('Supabase update status failed:', err);
      onRefresh();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to permanently delete this listing?')) return;
    setUpdatingItemId(itemId);

    // Delete from local storage immediately for seamless offline response
    const localListingsStr = localStorage.getItem('local_user_listings') || '[]';
    let localListings: ItemPost[] = [];
    try {
      localListings = JSON.parse(localListingsStr);
    } catch (_) {}
    localListings = localListings.filter(item => item.id !== itemId);
    localStorage.setItem('local_user_listings', JSON.stringify(localListings));

    const cachedStr = localStorage.getItem('cached_items') || '[]';
    let cachedItems: ItemPost[] = [];
    try {
      cachedItems = JSON.parse(cachedStr);
    } catch (_) {}
    cachedItems = cachedItems.filter(item => item.id !== itemId);
    localStorage.setItem('cached_items', JSON.stringify(cachedItems));

    // Also delete associated chats from local storage
    const localChatsKey = 'local_chats';
    let localChats: any[] = [];
    try {
      localChats = JSON.parse(localStorage.getItem(localChatsKey) || '[]');
    } catch (_) {}
    localChats = localChats.filter(c => c.itemId !== itemId);
    localStorage.setItem(localChatsKey, JSON.stringify(localChats));

    try {
      await deleteSupabaseItem(itemId);
      onRefresh();
    } catch (err) {
      console.warn('Supabase delete item failed:', err);
      onRefresh();
    } finally {
      setUpdatingItemId(null);
    }
  }  // Run modular filters
  const filteredItems = items.filter((item) => {
    // 1. Text Search
    const searchString = `${item.title} ${item.description} ${item.category}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());

    // 2. Type Filter
    const matchesType = selectedType === 'all' || item.type === selectedType;

    // 3. Category Filter
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;

    // 4. Neighborhood Filter
    const matchesNeighborhood = selectedNeighborhood === 'All Neighborhoods' || item.neighborhood === selectedNeighborhood;

    return matchesSearch && matchesType && matchesCategory && matchesNeighborhood;
  });

  const renderItemCard = (item: ItemPost) => {
    const isOwner = item.userId === userProfile.uid;
    
    // Votes and comments context
    const { userVote, upvotes, downvotes } = getVotesForPost(item.id);
    const commentsForPost = getCommentsForPost(item.id, item.category, item.title);
    const netScore = upvotes - downvotes;

    return (
      <div
        key={item.id}
        id={`item_card_${item.id}`}
        className={`flex flex-row bg-white rounded-none border border-zinc-200 hover:border-black transition-all group ${
          item.status !== 'active' ? 'opacity-65 bg-zinc-50' : ''
        }`}
      >
        {/* COLUMN 1: Reddit-style vertical voter bar (Interested / Not Interested) */}
        <div 
          className="w-14 bg-zinc-50/80 border-r border-zinc-150 flex flex-col items-center pt-5 pb-4 px-1 select-none text-center shrink-0" 
          id={`voter_rail_${item.id}`}
        >
          {/* Up Arrow (Interested) */}
          <button
            id={`vote_up_${item.id}`}
            onClick={() => handleVote(item.id, 'up')}
            className={`p-1.5 transition-all rounded-none hover:bg-orange-50 group/voteup shrink-0 cursor-pointer ${
              userVote === 'up' ? 'text-brand-orange scale-110 font-bold' : 'text-zinc-400 hover:text-brand-orange'
            }`}
            title="Interested (Upvote)"
          >
            <ChevronUp className="w-6 h-6 stroke-[3px] transition-transform group-hover/voteup:-translate-y-0.5" />
          </button>
          
          {/* Net Score Display */}
          <div className="my-1.5 flex flex-col items-center">
            <span className={`text-[12.5px] font-black tracking-tighter leading-none ${
              userVote === 'up' ? 'text-brand-orange font-black' : userVote === 'down' ? 'text-blue-600 font-black' : 'text-zinc-800'
            }`} id={`vote_score_${item.id}`}>
              {netScore > 0 ? `+${netScore}` : netScore}
            </span>
            <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest block scale-85 mt-0.5 font-mono">NET</span>
          </div>

          {/* Down Arrow (Not Interested) */}
          <button
            id={`vote_down_${item.id}`}
            onClick={() => handleVote(item.id, 'down')}
            className={`p-1.5 transition-all rounded-none hover:bg-blue-50 group/votedown shrink-0 cursor-pointer ${
              userVote === 'down' ? 'text-blue-600 scale-110 font-bold' : 'text-zinc-400 hover:text-blue-550'
            }`}
            title="Not Interested (Downvote)"
          >
            <ChevronDown className="w-6 h-6 stroke-[3px] transition-transform group-hover/votedown:translate-y-0.5" />
          </button>

          {/* Operational indicators */}
          <div className="mt-5 border-t border-zinc-200/80 pt-3 flex flex-col space-y-2 text-[7px] text-zinc-400 font-bold uppercase tracking-widest text-center leading-none scale-90">
            <div title="Neighbors Interested" className="flex flex-col items-center">
              <span className="text-zinc-650 font-black mb-0.5 font-mono text-[9px]">{upvotes}</span>
              <span className="text-brand-orange font-mono">INT 💚</span>
            </div>
            <div title="Neighbors Not Interested" className="flex flex-col items-center pt-1">
              <span className="text-zinc-650 font-black mb-0.5 font-mono text-[9px]">{downvotes}</span>
              <span className="text-zinc-500 font-mono">PASS ✕</span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Card Main Content & Controls */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Header list block */}
          <div className="p-5 flex-1 flex flex-col justify-between overflow-hidden">
            <div>
              {/* Badge row */}
              <div className="flex items-center justify-between mb-4">
                {item.type === 'giveaway' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest bg-black text-white border border-black">
                    Giveaway
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-none text-[8px] font-black uppercase tracking-widest bg-white text-black border border-black">
                    Request Wanted
                  </span>
                )}

                {/* Status label */}
                {item.status === 'completed' && (
                  <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-[#05A357] bg-[#05A357]/10 border border-[#05A357]/20 px-2.5 py-0.5" id={`status_claimed_badge_${item.id}`}>
                    {item.type === 'giveaway' ? 'CLAIMED' : 'FULFILLED'}
                  </span>
                )}
                {item.status === 'withdrawn' && (
                  <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-[#E11900] bg-[#E11900]/10 border border-[#E11900]/20 px-2.5 py-0.5">
                    Withdrawn
                  </span>
                )}
                {item.status === 'active' && (
                  <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-widest text-brand-orange bg-brand-orange-light border border-brand-orange/20 px-2.5 py-0.5">
                    Active
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-black text-black group-hover:text-brand-orange transition-colors uppercase tracking-tight leading-tight break-words">
                {item.title}
              </h4>

              {/* Category */}
              <span className="inline-block mt-1 text-[9.5px] font-black text-zinc-400 font-mono tracking-widest uppercase">
                {item.category}
              </span>

              {/* Image representation if present */}
              {item.imageUrl && (
                <div className="mt-2.5 border border-zinc-200 overflow-hidden bg-zinc-50 flex items-center justify-center max-h-48 w-full">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="max-h-48 w-full object-cover rounded-none"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Description */}
              <p className="mt-2.5 text-xs text-zinc-650 font-semibold leading-relaxed line-clamp-3 break-words">
                {item.description}
              </p>
            </div>

            {/* Metadata Row with centralized comments toggler */}
            <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-zinc-500">
              <div className="flex items-center space-x-1.5 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-brand-sage shrink-0" />
                <span className="font-extrabold text-black uppercase tracking-wide">{item.neighborhood}</span>
              </div>

              <button
                id={`comments_toggle_btn_${item.id}`}
                onClick={() => toggleComments(item.id)}
                className={`inline-flex items-center space-x-1.5 text-[10px] font-extrabold transition-colors cursor-pointer py-1 px-2.5 ${
                  expandedPostComments[item.id] ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200'
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${expandedPostComments[item.id] ? 'text-brand-orange' : 'text-zinc-400'}`} />
                <span>
                  {commentsForPost.length} {commentsForPost.length === 1 ? 'REPLY' : 'REPLIES'}
                </span>
              </button>

              <div className="flex items-center space-x-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="font-bold text-zinc-500 uppercase">
                  {item.createdAt 
                    ? new Date(item.createdAt.seconds ? item.createdAt.seconds * 1000 : item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : 'Recent'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive comments block (nested inside content area for aesthetic slide out) */}
          {expandedPostComments[item.id] && (
            <div className="border-t border-zinc-150 bg-zinc-50 p-4 space-y-3 font-sans" id={`comments_tray_${item.id}`}>
              <h5 className="text-[9px] font-black text-zinc-455 uppercase tracking-widest font-mono">
                Neighbor Discussions ({commentsForPost.length})
              </h5>

              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 font-sans" id={`comments_scroll_${item.id}`}>
                {commentsForPost.length === 0 ? (
                  <p className="text-[10px] text-zinc-405 font-semibold italic py-2 text-center font-sans">
                    No comments yet. Be the first neighbor to write a reply!
                  </p>
                ) : (
                  commentsForPost.map((comment, index) => (
                    <div key={comment.id || index} className="bg-white border border-zinc-150 p-3 shadow-xs font-sans">
                      <div className="flex items-start space-x-2.5 font-sans">
                        <img
                          src={comment.userPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(comment.userName)}`}
                          alt={comment.userName}
                          referrerPolicy="no-referrer"
                          className="w-5.5 h-5.5 rounded-none border border-zinc-150 mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0 font-sans">
                          <div className="flex items-baseline justify-between gap-x-1.5 flex-wrap font-sans">
                            <span className="text-[10.5px] font-black text-black uppercase leading-tight font-sans">
                              {comment.userName}
                            </span>
                            <span className="text-[8px] font-extrabold text-[#FF6A39] uppercase bg-orange-50 px-1 font-mono">
                              {comment.userNeighborhood}
                            </span>
                            <span className="text-[8px] font-bold text-zinc-455 font-mono ml-auto">
                              {new Date(comment.createdAt).toLocaleDateString() === 'Invalid Date' 
                                ? 'RECENT' 
                                : new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-700 font-medium mt-1.5 leading-normal whitespace-pre-wrap break-words font-sans">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem('commentText') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    handleAddComment(item.id, input.value.trim());
                    input.value = '';
                  }
                }}
                className="flex items-center space-x-2 pt-2 border-t border-zinc-150 font-sans"
              >
                <input
                  type="text"
                  name="commentText"
                  placeholder="Reply or inquire about porch pick up..."
                  className="flex-1 bg-white border border-zinc-200 px-3 py-1.5 text-xs text-black placeholder-zinc-400 font-medium focus:outline-hidden focus:border-black rounded-none font-sans"
                  required
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-black hover:bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-none shrink-0 cursor-pointer font-sans"
                >
                  POST
                </button>
              </form>
            </div>
          )}

          {/* Card Footer / Action Drawer */}
          <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-150 flex items-center justify-between">
            {/* Poster details */}
            <div className="flex items-center space-x-2 shrink-0">
              <img
                src={item.userPhotoURL || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(item.userDisplayName)}`}
                referrerPolicy="no-referrer"
                alt={item.userDisplayName}
                className="w-7 h-7 rounded-none border border-zinc-200 shrink-0"
              />
              <div className="max-w-[100px]">
                <p className="text-[10px] font-black text-black line-clamp-1 uppercase leading-none">{item.userDisplayName}</p>
                <span className="text-[8.5px] text-zinc-455 font-bold uppercase block mt-1 tracking-wider">Member</span>
              </div>
            </div>

            {/* Access Button Logic */}
            <div>
              {isOwner ? (
                <div className="flex items-center space-x-1" id="owner_card_actions">
                  {item.status === 'active' ? (
                    <>
                      <button
                        id={`complete_btn_${item.id}`}
                        disabled={updatingItemId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'completed')}
                        className="px-2.5 py-1.5 bg-[#05A357]/10 hover:bg-[#05A357]/20 border border-[#05A357]/30 text-[#05A357] rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        title={item.type === 'giveaway' ? "Mark as claimed" : "Mark as fulfilled"}
                      >
                        {item.type === 'giveaway' ? 'Claimed' : 'Fulfilled'}
                      </button>
                      <button
                        id={`withdraw_btn_${item.id}`}
                        disabled={updatingItemId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'withdrawn')}
                        className="px-2.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-300 rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                        title="Withdraw listing"
                      >
                        Withdraw
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        id={`relist_btn_${item.id}`}
                        disabled={updatingItemId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'active')}
                        className="px-2.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-none text-[9.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Relist
                      </button>
                      <button
                        id={`delete_btn_${item.id}`}
                        disabled={updatingItemId === item.id}
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-[#E11900] hover:bg-red-500/10 rounded-none transition-colors cursor-pointer"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                (item.status === 'active' || item.status === 'completed') ? (
                  <button
                    id={`message_btn_${item.id}`}
                    onClick={() => onInitiateChat(item.userId, item.userDisplayName, item.userPhotoURL, item)}
                    className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white font-black text-[10px] uppercase tracking-widest rounded-none inline-flex items-center space-x-1.5 transition-colors cursor-pointer select-none"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>MESSAGE NEIGHBOR</span>
                  </button>
                ) : (
                  <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest font-mono">Withdrawn / Archived</span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="item_feed_wrapper">
      {/* Search & Filtering Area */}
      <div className="bg-white rounded-none p-6 border border-zinc-200 shadow-xs" id="filter_panel">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Main search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <SearchIcon className="h-4.5 w-4.5 text-zinc-500" />
            </div>
            <input
              type="text"
              id="feed_search_input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search wood tables, kitchenware, organic lemon plants, toys..."
              className="block w-full pl-11 pr-3 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-450 font-semibold focus:bg-white"
            />
          </div>

          {/* Giveaway vs Looking toggle */}
          <div className="flex bg-zinc-100 p-1 rounded-none border border-zinc-200 shrink-0" id="feed_type_filter">
            <button
              id="type_all_btn"
              onClick={() => { setSelectedType('all'); setSelectedCategory('All Categories'); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'all' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-600 hover:text-black'
              }`}
            >
              All Listings
            </button>
            <button
              id="type_gives_btn"
              onClick={() => { setSelectedType('giveaway'); setSelectedCategory('All Categories'); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'giveaway' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-650 hover:text-black'
              }`}
            >
              Gives
            </button>
            <button
              id="type_asks_btn"
              onClick={() => { setSelectedType('looking'); setSelectedCategory('All Categories'); }}
              className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider cursor-pointer transition-all rounded-none ${
                selectedType === 'looking' 
                  ? 'bg-black text-white shadow-xs' 
                  : 'text-zinc-650 hover:text-black'
              }`}
            >
              Asks
            </button>
          </div>
        </div>

        {/* Compound Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-zinc-150 pt-4" id="compound_selectors">
          {/* Category Dropdown */}
          <div className="flex items-center space-x-2.5 bg-zinc-50 rounded-none px-3 py-2 border border-zinc-200" id="category_select_group">
            <Tag className="w-4 h-4 text-zinc-500 shrink-0" />
            <select
              id="filter_category_select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-transparent text-xs text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
            >
              <option value="All Categories" className="bg-white">All Categories</option>
              {selectedType === 'all' ? (
                <>
                  <optgroup label="OFFERS / GIFTS" className="text-[10px] font-black tracking-widest text-zinc-400 bg-zinc-100 uppercase">
                    {ITEM_CATEGORIES.map((c) => (
                      <option key={`all_giveaway_${c}`} value={c} className="bg-white text-xs text-black normal-case font-bold">{c.toUpperCase()}</option>
                    ))}
                  </optgroup>
                  <optgroup label="IN SEARCH OF / ASKS" className="text-[10px] font-black tracking-widest text-zinc-400 bg-zinc-100 uppercase">
                    {ISO_CATEGORIES.map((c) => (
                      <option key={`all_looking_${c}`} value={c} className="bg-white text-xs text-black normal-case font-bold">{c.toUpperCase()}</option>
                    ))}
                  </optgroup>
                </>
              ) : selectedType === 'giveaway' ? (
                <>
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={`giveaway_only_${c}`} value={c} className="bg-white">{c.toUpperCase()}</option>
                  ))}
                </>
              ) : (
                <>
                  {ISO_CATEGORIES.map((c) => (
                    <option key={`looking_only_${c}`} value={c} className="bg-white">{c.toUpperCase()}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Neighborhood Dropdown */}
          <div className="flex items-center space-x-2.5 bg-zinc-50 rounded-none px-3 py-2 border border-zinc-200">
            <MapPin className="w-4 h-4 text-brand-orange shrink-0" />
            <select
              id="filter_neighborhood_select"
              value={selectedNeighborhood}
              onChange={(e) => setSelectedNeighborhood(e.target.value)}
              className="w-full bg-transparent text-xs text-black font-bold focus:outline-hidden cursor-pointer uppercase tracking-wider"
            >
              <option value="All Neighborhoods" className="bg-white">All Counties ({userProfile.neighborhood} Sector)</option>
              {SACRAMENTO_NEIGHBORHOODS.map((n) => (
                <option key={n} value={n} className="bg-white">{n.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bulletin Listings Feed */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-none border border-dashed border-zinc-300 p-8" id="empty_feed_state">
          <AlertCircle className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-xs font-black text-black uppercase tracking-widest">No listings match operational filters</h3>
          <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto font-semibold">
            Re-adjust your filter configurations above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="items_grid_cards">
          {filteredItems.map((item) => renderItemCard(item))}
        </div>
      )}
    </div>
  );
}
