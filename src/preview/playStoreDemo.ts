/**
 * Local-only Play Store screenshot fixtures.
 *
 * Enabled solely when Vite is started with VITE_PLAY_STORE_DEMO=1.
 * Production / Play / Vercel builds never set that flag, so this never
 * ships as a live “fake community.”
 */
import type {
  AwardsUnlockStatus,
  Chat,
  CommunityEvent,
  EventComment,
  EventRsvpStatus,
  FeedPost,
  FeedPostComment,
  FeedPostReaction,
  ItemComment,
  ItemPost,
  UserProfile,
} from '../types';
import { buildListingDescription } from '../lib/itemLocation';
import { buildGlobalCommunityChatRow } from '../lib/communityChats';
import { parseTabFromPathname } from '../lib/appNavigation';

export function isPlayStoreDemo(): boolean {
  return String((import.meta as { env?: Record<string, string> }).env?.VITE_PLAY_STORE_DEMO || '') === '1';
}

export function isPlayStoreDemoPublicHome(): boolean {
  if (typeof window === 'undefined') return true;
  if (parseTabFromPathname(window.location.pathname)) return false;
  return true;
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function daysFromNow(days: number, hour = 10): string {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setHours(hour, 0, 0, 0);
  return next.toISOString();
}

function avatar(seed: string): string {
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(seed)}`;
}

function listing(
  partial: Omit<ItemPost, 'description' | 'createdAt' | 'updatedAt' | 'status'> & {
    details: string;
    pickupNotes?: string;
    createdHoursAgo: number;
    status?: ItemPost['status'];
  },
): ItemPost {
  const createdAt = hoursAgo(partial.createdHoursAgo);
  return {
    id: partial.id,
    title: partial.title,
    type: partial.type,
    category: partial.category,
    userId: partial.userId,
    userDisplayName: partial.userDisplayName,
    userPhotoURL: partial.userPhotoURL,
    neighborhood: partial.neighborhood,
    status: partial.status ?? 'active',
    imageUrl: partial.imageUrl,
    imageUrls: partial.imageUrls ?? (partial.imageUrl ? [partial.imageUrl] : []),
    createdAt,
    updatedAt: createdAt,
    viewCount: partial.viewCount,
    description: buildListingDescription({
      type: partial.type,
      details: partial.details,
      pickupNotes: partial.pickupNotes,
      customCoords: null,
      locationIsPublic: false,
    }),
  };
}

export const PLAY_STORE_DEMO_PROFILE: UserProfile = {
  uid: 'demo-neighbor-alex',
  displayName: 'Alex Hart',
  email: 'alex.hart.demo@example.com',
  neighborhood: 'Midtown',
  bio: 'Midtown neighbor — giving away extras and borrowing what I need.',
  photoURL: avatar('Alex Hart'),
  role: 'user',
  accountStatus: 'active',
  goGetEnabled: true,
  createdAt: hoursAgo(24 * 40),
  lastActiveAt: hoursAgo(0.2),
  appPreferences: {
    feedViewMode: 'grid',
    eventsViewMode: 'grid',
    theme: 'light',
    feedAudienceScope: 'everyone',
    feedContentFilter: 'all',
  },
};

const NEIGHBORS = {
  avery: { uid: 'demo-neighbor-avery', name: 'Avery Quinn', neighborhood: 'East Sacramento', photo: avatar('Avery Quinn') },
  jordan: { uid: 'demo-neighbor-jordan', name: 'Jordan Hale', neighborhood: 'Midtown', photo: avatar('Jordan Hale') },
  sam: { uid: 'demo-neighbor-sam', name: 'Sam Rivera', neighborhood: 'Oak Park', photo: avatar('Sam Rivera') },
  casey: { uid: 'demo-neighbor-casey', name: 'Casey Brooks', neighborhood: 'Tahoe Park', photo: avatar('Casey Brooks') },
  riley: { uid: 'demo-neighbor-riley', name: 'Riley Nguyen', neighborhood: 'Land Park', photo: avatar('Riley Nguyen') },
  morgan: { uid: 'demo-neighbor-morgan', name: 'Morgan Ellis', neighborhood: 'Curtis Park', photo: avatar('Morgan Ellis') },
} as const;

export const PLAY_STORE_DEMO_ITEMS: ItemPost[] = [
  listing({
    id: 'demo-item-couch',
    title: 'Gray sectional couch — free',
    type: 'giveaway',
    category: 'Furniture',
    userId: NEIGHBORS.avery.uid,
    userDisplayName: NEIGHBORS.avery.name,
    userPhotoURL: NEIGHBORS.avery.photo,
    neighborhood: NEIGHBORS.avery.neighborhood,
    imageUrl: '/play-store-demo/couch.jpg',
    details: 'L-shaped sectional in good shape — no tears, pet-free home. You haul from the garage; two-person lift recommended.',
    pickupNotes: 'Message me and we can pick a porch time.',
    createdHoursAgo: 3,
    viewCount: 24,
  }),
  listing({
    id: 'demo-item-tv',
    title: '42" flat-screen TV + remote',
    type: 'giveaway',
    category: 'Electronics & Media',
    userId: NEIGHBORS.jordan.uid,
    userDisplayName: NEIGHBORS.jordan.name,
    userPhotoURL: NEIGHBORS.jordan.photo,
    neighborhood: NEIGHBORS.jordan.neighborhood,
    imageUrl: '/play-store-demo/tv.jpg',
    details: 'Works great — upgraded to a bigger screen. Includes HDMI cable and wall mount bracket if you want it.',
    createdHoursAgo: 6,
    viewCount: 18,
  }),
  listing({
    id: 'demo-item-baby-toys',
    title: 'Toddler toys — LEGO, blocks, puzzles',
    type: 'giveaway',
    category: 'Baby & Kids',
    userId: NEIGHBORS.sam.uid,
    userDisplayName: NEIGHBORS.sam.name,
    userPhotoURL: NEIGHBORS.sam.photo,
    neighborhood: NEIGHBORS.sam.neighborhood,
    imageUrl: '/play-store-demo/baby-toys.jpg',
    details: 'Clean toy box our 3-year-old outgrew. Duplo, wooden blocks, and a few board books in the bin.',
    createdHoursAgo: 9,
  }),
  listing({
    id: 'demo-item-clothes',
    title: 'Kids winter coats — sizes 4T–6',
    type: 'giveaway',
    category: 'Clothing & Accessories',
    userId: NEIGHBORS.casey.uid,
    userDisplayName: NEIGHBORS.casey.name,
    userPhotoURL: NEIGHBORS.casey.photo,
    neighborhood: NEIGHBORS.casey.neighborhood,
    imageUrl: '/play-store-demo/clothes.jpg',
    details: 'Three puffy jackets and two fleece hoodies. Washed and ready for another kid to wear.',
    createdHoursAgo: 12,
  }),
  listing({
    id: 'demo-item-car-seat',
    title: 'Graco convertible car seat',
    type: 'giveaway',
    category: 'Baby & Kids',
    userId: NEIGHBORS.riley.uid,
    userDisplayName: NEIGHBORS.riley.name,
    userPhotoURL: NEIGHBORS.riley.photo,
    neighborhood: NEIGHBORS.riley.neighborhood,
    imageUrl: '/play-store-demo/car-seat.jpg',
    details: 'Rear-facing to booster, expires 2028. Never in an accident. Straps and buckles in good shape.',
    pickupNotes: 'Porch pickup in Land Park — bring a bag if it is raining.',
    createdHoursAgo: 15,
  }),
  listing({
    id: 'demo-item-car-tools',
    title: 'Jumper cables + roadside kit',
    type: 'giveaway',
    category: 'Tools & Hardware',
    userId: NEIGHBORS.morgan.uid,
    userDisplayName: NEIGHBORS.morgan.name,
    userPhotoURL: NEIGHBORS.morgan.photo,
    neighborhood: NEIGHBORS.morgan.neighborhood,
    imageUrl: '/play-store-demo/car-tools.jpg',
    details: 'Heavy-duty jumper cables, ice scraper, tire gauge, and a small first-aid pouch. Upgraded my kit.',
    createdHoursAgo: 18,
  }),
  listing({
    id: 'demo-item-microwave',
    title: 'Looking for a countertop microwave',
    type: 'looking',
    category: 'Appliances Needed',
    userId: PLAY_STORE_DEMO_PROFILE.uid,
    userDisplayName: PLAY_STORE_DEMO_PROFILE.displayName,
    userPhotoURL: PLAY_STORE_DEMO_PROFILE.photoURL,
    neighborhood: PLAY_STORE_DEMO_PROFILE.neighborhood,
    imageUrl: '/play-store-demo/microwave.jpg',
    details: 'Ours died mid-week. Happy to pick up anything that still heats evenly — Midtown or nearby.',
    createdHoursAgo: 5,
  }),
];

export const PLAY_STORE_DEMO_EVENTS: CommunityEvent[] = [
  {
    id: 'demo-event-picnic',
    title: 'Curtis Park porch-swap picnic',
    description: 'Bring one thing you no longer need and leave with something new. Always free — no selling at the table.',
    location: 'Curtis Park lawn, near the picnic tables',
    neighborhood: 'Curtis Park',
    eventStartAt: daysFromNow(5, 11),
    eventEndAt: daysFromNow(5, 14),
    userId: NEIGHBORS.morgan.uid,
    userDisplayName: NEIGHBORS.morgan.name,
    userPhotoURL: NEIGHBORS.morgan.photo,
    hostedBy: NEIGHBORS.morgan.name,
    locationLat: 38.5596,
    locationLng: -121.4714,
    isFree: true,
    status: 'upcoming',
    imageUrl: '/play-store-demo/event-picnic.jpg',
    viewCount: 41,
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(30),
  },
  {
    id: 'demo-event-books',
    title: 'Midtown book swap on the steps',
    description: 'Leave a book, take a book. Kids’ picture books especially welcome.',
    location: 'Midtown stoop library',
    neighborhood: 'Midtown',
    eventStartAt: daysFromNow(9, 16),
    eventEndAt: daysFromNow(9, 18),
    userId: NEIGHBORS.jordan.uid,
    userDisplayName: NEIGHBORS.jordan.name,
    userPhotoURL: NEIGHBORS.jordan.photo,
    hostedBy: NEIGHBORS.jordan.name,
    locationLat: 38.575,
    locationLng: -121.483,
    isFree: true,
    status: 'upcoming',
    viewCount: 12,
    createdAt: hoursAgo(50),
    updatedAt: hoursAgo(50),
  },
];

export const PLAY_STORE_DEMO_FEED_POSTS: FeedPost[] = [
  {
    id: 'demo-feed-hey',
    userId: NEIGHBORS.sam.uid,
    userDisplayName: NEIGHBORS.sam.name,
    userPhotoURL: NEIGHBORS.sam.photo,
    neighborhood: NEIGHBORS.sam.neighborhood,
    text: 'Hey guys — happy Saturday. Anyone else feeling grateful for this little corner of Sacramento lately?',
    imageUrls: [],
    status: 'active',
    createdAt: hoursAgo(1.5),
    updatedAt: hoursAgo(1.5),
    viewCount: 16,
  },
  {
    id: 'demo-feed-job-ask',
    userId: NEIGHBORS.casey.uid,
    userDisplayName: NEIGHBORS.casey.name,
    userPhotoURL: NEIGHBORS.casey.photo,
    neighborhood: NEIGHBORS.casey.neighborhood,
    text: 'Lost my retail job last week. If anyone hears of part-time front desk or admin work around Midtown, please message me. Trying to stay hopeful.',
    imageUrls: [],
    status: 'active',
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(5),
    viewCount: 9,
  },
  {
    id: 'demo-feed-resume-offer',
    userId: NEIGHBORS.jordan.uid,
    userDisplayName: NEIGHBORS.jordan.name,
    userPhotoURL: NEIGHBORS.jordan.photo,
    neighborhood: NEIGHBORS.jordan.neighborhood,
    text: 'Offering free resume reviews this week for neighbors who are job hunting. I have hired for nonprofits for years — happy to look at yours over coffee, no charge.',
    imageUrls: [],
    status: 'active',
    createdAt: hoursAgo(9),
    updatedAt: hoursAgo(9),
  },
  {
    id: 'demo-feed-support',
    userId: NEIGHBORS.avery.uid,
    userDisplayName: NEIGHBORS.avery.name,
    userPhotoURL: NEIGHBORS.avery.photo,
    neighborhood: NEIGHBORS.avery.neighborhood,
    text: 'Rough week — my mom is in the hospital and I am running on fumes. If you are free for a walk or coffee, I would love company. No advice needed, just people.',
    imageUrls: [],
    status: 'active',
    createdAt: hoursAgo(14),
    updatedAt: hoursAgo(14),
  },
  {
    id: 'demo-feed-checkin',
    userId: NEIGHBORS.riley.uid,
    userDisplayName: NEIGHBORS.riley.name,
    userPhotoURL: NEIGHBORS.riley.photo,
    neighborhood: NEIGHBORS.riley.neighborhood,
    text: 'New in Land Park and still learning the city. What do you wish someone had told you when you first moved to Sacramento?',
    imageUrls: [],
    status: 'active',
    createdAt: hoursAgo(22),
    updatedAt: hoursAgo(22),
  },
];

export const PLAY_STORE_DEMO_FEED_COMMENTS: Record<string, FeedPostComment[]> = {
  'demo-feed-hey': [
    {
      id: 'demo-feed-comment-hey-1',
      postId: 'demo-feed-hey',
      userId: NEIGHBORS.morgan.uid,
      userName: NEIGHBORS.morgan.name,
      userPhoto: NEIGHBORS.morgan.photo,
      userNeighborhood: NEIGHBORS.morgan.neighborhood,
      text: 'Same here, Sam. This group has been a bright spot.',
      createdAt: hoursAgo(1.2),
    },
  ],
  'demo-feed-job-ask': [
    {
      id: 'demo-feed-comment-job-1',
      postId: 'demo-feed-job-ask',
      userId: NEIGHBORS.jordan.uid,
      userName: NEIGHBORS.jordan.name,
      userPhoto: NEIGHBORS.jordan.photo,
      userNeighborhood: NEIGHBORS.jordan.neighborhood,
      text: 'Sending you good energy, Casey. I will ask around at work too.',
      createdAt: hoursAgo(4.5),
    },
    {
      id: 'demo-feed-comment-job-2',
      postId: 'demo-feed-job-ask',
      userId: NEIGHBORS.morgan.uid,
      userName: NEIGHBORS.morgan.name,
      userPhoto: NEIGHBORS.morgan.photo,
      userNeighborhood: NEIGHBORS.morgan.neighborhood,
      text: "My cousin's cafe on J Street might be hiring — I will check tomorrow.",
      createdAt: hoursAgo(4.2),
    },
  ],
  'demo-feed-support': [
    {
      id: 'demo-feed-comment-support-1',
      postId: 'demo-feed-support',
      userId: NEIGHBORS.sam.uid,
      userName: NEIGHBORS.sam.name,
      userPhoto: NEIGHBORS.sam.photo,
      userNeighborhood: NEIGHBORS.sam.neighborhood,
      text: 'Thinking of you, Avery. I can meet for a walk Sunday morning if that helps.',
      createdAt: hoursAgo(12),
    },
  ],
};

export const PLAY_STORE_DEMO_FEED_REACTIONS: FeedPostReaction[] = [
  { postId: 'demo-feed-hey', userId: NEIGHBORS.avery.uid, emoji: '🥹', createdAt: hoursAgo(1.4) },
  { postId: 'demo-feed-hey', userId: NEIGHBORS.jordan.uid, emoji: '🥹', createdAt: hoursAgo(1.3) },
  { postId: 'demo-feed-job-ask', userId: NEIGHBORS.sam.uid, emoji: '🥺', createdAt: hoursAgo(4.8) },
  { postId: 'demo-feed-job-ask', userId: NEIGHBORS.riley.uid, emoji: '🥺', createdAt: hoursAgo(4.6) },
  { postId: 'demo-feed-resume-offer', userId: NEIGHBORS.casey.uid, emoji: '🥹', createdAt: hoursAgo(8.5) },
  { postId: 'demo-feed-support', userId: NEIGHBORS.casey.uid, emoji: '🥺', createdAt: hoursAgo(13) },
  { postId: 'demo-feed-support', userId: NEIGHBORS.morgan.uid, emoji: '🥺', createdAt: hoursAgo(12.5) },
];

export const PLAY_STORE_DEMO_ITEM_VOTES: Record<
  string,
  { userVote: 'up' | 'down' | null; upvotes: number; downvotes: number }
> = {
  'demo-item-couch': { userVote: null, upvotes: 11, downvotes: 0 },
  'demo-item-tv': { userVote: 'up', upvotes: 14, downvotes: 0 },
  'demo-item-baby-toys': { userVote: null, upvotes: 8, downvotes: 0 },
  'demo-item-clothes': { userVote: null, upvotes: 6, downvotes: 0 },
  'demo-item-car-seat': { userVote: null, upvotes: 9, downvotes: 0 },
  'demo-item-car-tools': { userVote: null, upvotes: 4, downvotes: 0 },
  'demo-item-microwave': { userVote: null, upvotes: 3, downvotes: 0 },
};

export const PLAY_STORE_DEMO_ITEM_COMMENTS: Record<string, ItemComment[]> = {
  'demo-item-couch': [
    {
      id: 'demo-item-comment-couch',
      itemId: 'demo-item-couch',
      userId: NEIGHBORS.jordan.uid,
      userName: NEIGHBORS.jordan.name,
      userPhoto: NEIGHBORS.jordan.photo,
      userNeighborhood: NEIGHBORS.jordan.neighborhood,
      text: 'Would this fit through a standard doorway if we stand it on end?',
      createdAt: hoursAgo(1.5),
    },
  ],
  'demo-item-tv': [
    {
      id: 'demo-item-comment-tv',
      itemId: 'demo-item-tv',
      userId: NEIGHBORS.sam.uid,
      userName: NEIGHBORS.sam.name,
      userPhoto: NEIGHBORS.sam.photo,
      userNeighborhood: NEIGHBORS.sam.neighborhood,
      text: 'Does it have smart apps built in or need a streaming stick?',
      createdAt: hoursAgo(2),
    },
  ],
};

export const PLAY_STORE_DEMO_EVENT_RSVPS: Record<
  string,
  {
    userRsvp: EventRsvpStatus | null;
    going: number;
    maybe: number;
    notGoing: number;
    gone: number;
    missed: number;
  }
> = {
  'demo-event-picnic': {
    userRsvp: 'going',
    going: 12,
    maybe: 4,
    notGoing: 1,
    gone: 0,
    missed: 0,
  },
  'demo-event-books': {
    userRsvp: null,
    going: 7,
    maybe: 3,
    notGoing: 0,
    gone: 0,
    missed: 0,
  },
};

export const PLAY_STORE_DEMO_EVENT_VOTES: Record<
  string,
  {
    userVote: 'up' | 'down' | null;
    upvotes: number;
    downvotes: number;
  }
> = {
  'demo-event-picnic': {
    userVote: 'up',
    upvotes: 8,
    downvotes: 1,
  },
  'demo-event-books': {
    userVote: null,
    upvotes: 3,
    downvotes: 0,
  },
};

export const PLAY_STORE_DEMO_EVENT_COMMENTS: Record<string, EventComment[]> = {
  'demo-event-picnic': [
    {
      id: 'demo-event-comment-1',
      eventId: 'demo-event-picnic',
      userId: NEIGHBORS.avery.uid,
      userName: NEIGHBORS.avery.name,
      userPhoto: NEIGHBORS.avery.photo,
      userNeighborhood: NEIGHBORS.avery.neighborhood,
      text: 'Bringing a bag of kids clothes and a box of baby toys.',
      createdAt: hoursAgo(12),
    },
  ],
};

export const PLAY_STORE_DEMO_CHATS: Chat[] = [
  {
    ...buildGlobalCommunityChatRow(hoursAgo(1)),
    lastMessageText: 'Anyone have a spare microwave or toaster oven?',
    lastMessageSenderId: NEIGHBORS.sam.uid,
  },
  {
    id: 'demo-chat-couch',
    participantIds: [PLAY_STORE_DEMO_PROFILE.uid, NEIGHBORS.avery.uid],
    participantNames: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.displayName,
      [NEIGHBORS.avery.uid]: NEIGHBORS.avery.name,
    },
    participantPhotos: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.photoURL || '',
      [NEIGHBORS.avery.uid]: NEIGHBORS.avery.photo,
    },
    lastMessageText: 'Yes — I can help load the sectional Saturday morning.',
    lastMessageAt: hoursAgo(0.8),
    lastMessageSenderId: NEIGHBORS.avery.uid,
    itemId: 'demo-item-couch',
    itemTitle: 'Gray sectional couch — free',
  },
  {
    id: 'demo-chat-tv',
    participantIds: [PLAY_STORE_DEMO_PROFILE.uid, NEIGHBORS.jordan.uid],
    participantNames: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.displayName,
      [NEIGHBORS.jordan.uid]: NEIGHBORS.jordan.name,
    },
    participantPhotos: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.photoURL || '',
      [NEIGHBORS.jordan.uid]: NEIGHBORS.jordan.photo,
    },
    lastMessageText: 'TV is still on the porch — remote is in the kitchen drawer.',
    lastMessageAt: hoursAgo(3),
    lastMessageSenderId: NEIGHBORS.jordan.uid,
    itemId: 'demo-item-tv',
    itemTitle: '42" flat-screen TV + remote',
  },
  {
    id: 'demo-chat-car-seat',
    participantIds: [PLAY_STORE_DEMO_PROFILE.uid, NEIGHBORS.riley.uid],
    participantNames: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.displayName,
      [NEIGHBORS.riley.uid]: NEIGHBORS.riley.name,
    },
    participantPhotos: {
      [PLAY_STORE_DEMO_PROFILE.uid]: PLAY_STORE_DEMO_PROFILE.photoURL || '',
      [NEIGHBORS.riley.uid]: NEIGHBORS.riley.photo,
    },
    lastMessageText: 'Car seat is on the porch — straps are in the top bin.',
    lastMessageAt: hoursAgo(2),
    lastMessageSenderId: NEIGHBORS.riley.uid,
    itemId: 'demo-item-car-seat',
    itemTitle: 'Graco convertible car seat',
  },
];

export const PLAY_STORE_DEMO_STATS = {
  memberCount: 128,
  activeListings: PLAY_STORE_DEMO_ITEMS.filter((item) => item.status === 'active').length,
  itemsGiven: 2,
  requestsFulfilled: 1,
};

export const PLAY_STORE_DEMO_EVENTS_UNLOCK: AwardsUnlockStatus = {
  unlocked: true,
  memberCount: PLAY_STORE_DEMO_STATS.memberCount,
  target: 500,
  remaining: 0,
};
