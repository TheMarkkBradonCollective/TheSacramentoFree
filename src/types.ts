export type PostStatus = 'active' | 'pending_pickup' | 'on_hold' | 'completed' | 'withdrawn';
export type PostType = 'giveaway' | 'looking';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  neighborhood: string;
  bio?: string;
  role?: 'user' | 'city_moderator' | 'city_administrator' | 'city_manager' | 'director';
  accountStatus?: AccountStatus;
  suspendedUntil?: string | null;
  createdAt: any;
}

export interface StaffUserRow extends UserProfile {
  accountStatus: AccountStatus;
}

export interface ModerationAuditEntry {
  id: string;
  actorUserId: string;
  actorName: string;
  targetUserId: string;
  targetName: string;
  action: string;
  detail?: string | null;
  createdAt: string;
}

export type ReportStatus = 'new' | 'reviewed';

export interface UserReport {
  id: string;
  reporterUserId: string;
  reporterName: string;
  subject: string;
  body: string;
  reportedUserId?: string | null;
  reportedUserName?: string | null;
  proofImageUrl?: string | null;
  source?: 'manual' | 'block';
  status: ReportStatus;
  createdAt: string;
}

export type TicketStatus = 'open' | 'closed';

export interface SupportTicket {
  id: string;
  openerUserId: string;
  openerName: string;
  openerRole: UserProfile['role'];
  minStaffRank: number;
  subject: string;
  status: TicketStatus;
  closedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderUserId: string;
  senderName: string;
  text: string;
  imageUrl?: string | null;
  createdAt: string;
}

export interface ItemPost {
  id: string;
  title: string;
  description: string;
  type: PostType;
  category: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  neighborhood: string;
  status: PostStatus;
  createdAt: any;
  updatedAt: any;
  imageUrl?: string;
  /** All photos (first matches imageUrl). Parsed from description when not set. */
  imageUrls?: string[];
}

export interface Chat {
  id: string;
  participantIds: string[];
  participantNames: { [uid: string]: string };
  participantPhotos: { [uid: string]: string };
  lastMessageText?: string;
  lastMessageAt: any;
  lastMessageSenderId?: string;
  itemId?: string;
  itemTitle?: string;
}

/** Compose UI before the chat row exists in the database (first outbound message creates it). */
export interface PendingChatCompose {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto?: string;
  itemId?: string;
  itemTitle?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface ItemVote {
  itemId: string;
  userId: string;
  voteType: 'up' | 'down';
}

export interface ItemComment {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userNeighborhood: string;
  text: string;
  createdAt: any;
}

export type SubItemStatus = 'available' | 'claimed';

export interface ListingSubItem {
  id: string;
  itemId: string;
  label: string;
  sortOrder: number;
  status: SubItemStatus;
  claimedAt?: string | null;
}

export type ClaimRequestStatus = 'pending' | 'confirmed' | 'rejected';

export interface ItemClaimRequest {
  id: string;
  itemId: string;
  giverUserId: string;
  claimerUserId: string;
  claimerName: string;
  subItemIds: string[];
  status: ClaimRequestStatus;
  chatId: string;
  createdAt: string;
}

export type MessageRequestStatus = 'pending' | 'accepted' | 'declined';

export interface MessageRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  message?: string;
  status: MessageRequestStatus;
  createdAt: any;
}

export interface UserBlock {
  blockerUserId: string;
  blockedUserId: string;
  createdAt?: any;
}

export type EventStatus = 'active' | 'cancelled';
export type EventRsvpStatus = 'going' | 'maybe' | 'not_going';

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  neighborhood: string;
  eventStartAt: string;
  eventEndAt?: string | null;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  /** Community events must always be free — enforced in DB and on create. */
  isFree: true;
  status: EventStatus;
  imageUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface EventRsvp {
  eventId: string;
  userId: string;
  rsvpStatus: EventRsvpStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userNeighborhood: string;
  text: string;
  createdAt: any;
}

export interface DirectorMessageContent {
  id: string;
  directorName: string;
  directorTitle: string;
  headline: string;
  goal: string;
  promises: string[];
  closing: string;
  updatedAt: string;
  updatedByUserId?: string | null;
}

/** App rating — 0 to 5 in 0.5 steps */
export type AppReviewRating = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5;

export interface AppReview {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userNeighborhood: string;
  rating: number;
  text?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SACRAMENTO_NEIGHBORHOODS = [
  'Midtown',
  'Downtown',
  'East Sacramento',
  'McKinley',
  'River Park',
  'Oak Park',
  'Tahoe Park',
  'Colonial Heights',
  'Land Park',
  'Curtis Park',
  'Hollywood Park',
  'South Sacramento',
  'North Sacramento',
  'Natomas',
  'Rosemont',
  'Carmichael',
  'Arden Arcade',
  'Del Paso Heights',
  'Citrus Heights',
  'Greenhaven',
  'Pocket',
  'South Land Park',
  'Antelope',
  'Auburn',
  'Davis',
  'El Dorado Hills',
  'Elk Grove',
  'Fair Oaks',
  'Folsom',
  'Foothill Farms',
  'Old Foothill Farms',
  'La Riviera',
  'North Highlands',
  'Orangevale',
  'Rancho Cordova',
  'Rio Linda',
  'Roseville',
  'West Sacramento',
  'Woodland',
] as const;

export const ITEM_CATEGORIES = [
  'Curb Alert',
  'Porch Pickup',
  'Free Pile / Box',
  'Furniture',
  'Kitchen & Dining',
  'Appliances',
  'Clothing & Accessories',
  'Baby & Kids',
  'Books & Education',
  'Electronics & Media',
  'Garden & Outdoors',
  'Tools & Hardware',
  'Sports & Fitness',
  'Toys & Games',
  'Food & Pantry',
  'Health & Beauty',
  'Pet Supplies',
  'Labor & Services',
  'Other / Custom'
];

export const ISO_CATEGORIES = [
  'Borrow Request',
  'Household Needed',
  'Furniture Wanted',
  'Appliances Needed',
  'Groceries & Food Needed',
  'Baby & Kids ISO',
  'Garden & Tools ISO',
  'Clothing Needed',
  'Electronics / Media Wanted',
  'Pet Supplies Needed',
  'Labor & Services Needed',
  'Help / Labor Request',
  'Other Seeking Support'
];

export const ISO_DELIVERY_PREFS = [
  'Willing to pick up (I have transport)',
  'No vehicle, needs drop-off help',
  'Can meet halfway in public spot',
  'Flexible / Open to pick up or delivery'
];

// Coordinate converter helper
export function extractGPSCoordinates(description: string): { x: number; y: number } | null {
  if (!description) return null;
  const match = description.match(/\[GPS:\s*([\d.-]+),\s*([\d.-]+)\]/);
  if (match) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    if (!isNaN(x) && !isNaN(y)) {
      return { x, y };
    }
  }
  return null;
}

/** Leaflet map + stored [GPS: x,y] percent coords — must match the post form mini-map grid. */
export const MAP_PICKUP_BOUNDS = {
  latMin: 38.35,
  latMax: 38.75,
  lngMin: -121.6,
  lngMax: -121.3,
} as const;

/** Wider Sacramento metro — neighborhood name lookup only, not pickup pin math. */
export const MAP_REGION_BOUNDS = {
  latMin: 38.35,
  latMax: 38.92,
  lngMin: -121.78,
  lngMax: -121.05,
} as const;

// Approximate center points for each area
export const NEIGHBORHOOD_LAT_LONGS: Record<string, { lat: number; lng: number }> = {
  'Midtown': { lat: 38.5724, lng: -121.4784 },
  'Downtown': { lat: 38.5816, lng: -121.4944 },
  'East Sacramento': { lat: 38.5674, lng: -121.4429 },
  'McKinley': { lat: 38.5608, lng: -121.4693 },
  'River Park': { lat: 38.5624, lng: -121.4325 },
  'Oak Park': { lat: 38.5447, lng: -121.4614 },
  'Tahoe Park': { lat: 38.5455, lng: -121.4326 },
  'Colonial Heights': { lat: 38.5324, lng: -121.4472 },
  'Land Park': { lat: 38.5432, lng: -121.4975 },
  'Curtis Park': { lat: 38.5484, lng: -121.4795 },
  'Hollywood Park': { lat: 38.534, lng: -121.492 },
  'South Sacramento': { lat: 38.4952, lng: -121.4468 },
  'North Sacramento': { lat: 38.606, lng: -121.457 },
  'Natomas': { lat: 38.6368, lng: -121.5034 },
  'Rosemont': { lat: 38.547, lng: -121.41 },
  'Carmichael': { lat: 38.6171, lng: -121.3283 },
  'Arden Arcade': { lat: 38.6013, lng: -121.3916 },
  'Del Paso Heights': { lat: 38.625, lng: -121.455 },
  'Citrus Heights': { lat: 38.7071, lng: -121.2811 },
  'Greenhaven': { lat: 38.4907, lng: -121.5365 },
  'Pocket': { lat: 38.465, lng: -121.505 },
  'South Land Park': { lat: 38.525, lng: -121.51 },
  'Antelope': { lat: 38.7082, lng: -121.3299 },
  'Auburn': { lat: 38.8966, lng: -121.077 },
  'Davis': { lat: 38.5449, lng: -121.7402 },
  'El Dorado Hills': { lat: 38.685, lng: -121.082 },
  'Elk Grove': { lat: 38.4088, lng: -121.3716 },
  'Fair Oaks': { lat: 38.6446, lng: -121.272 },
  'Folsom': { lat: 38.6779, lng: -121.176 },
  'Foothill Farms': { lat: 38.678, lng: -121.346 },
  'Old Foothill Farms': { lat: 38.662, lng: -121.362 },
  'La Riviera': { lat: 38.568, lng: -121.366 },
  'North Highlands': { lat: 38.6681, lng: -121.3726 },
  'Orangevale': { lat: 38.6785, lng: -121.2254 },
  'Rancho Cordova': { lat: 38.5891, lng: -121.3027 },
  'Rio Linda': { lat: 38.69, lng: -121.4486 },
  'Roseville': { lat: 38.7521, lng: -121.288 },
  'West Sacramento': { lat: 38.5805, lng: -121.5302 },
  'Woodland': { lat: 38.6785, lng: -121.773 },
  // Legacy names still on older listings/profiles
  'Arden': { lat: 38.6013, lng: -121.3916 },
  'Pocket-Greenhaven': { lat: 38.4907, lng: -121.5365 },
};

// Bounding box for mapping real GPS to percentage coordinates (pickup pins on the live map)
export function mapGPSToPercent(lat: number, lng: number): { x: number; y: number } {
  const { latMin, latMax, lngMin, lngMax } = MAP_PICKUP_BOUNDS;

  const clampedLat = Math.max(latMin, Math.min(latMax, lat));
  const clampedLng = Math.max(lngMin, Math.min(lngMax, lng));

  const x = ((clampedLng - lngMin) / (lngMax - lngMin)) * 100;
  const y = (1 - (clampedLat - latMin) / (latMax - latMin)) * 100;

  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

export function convertPercentToLatLng(x: number, y: number): { lat: number; lng: number } {
  const { latMin, latMax, lngMin, lngMax } = MAP_PICKUP_BOUNDS;
  const lng = lngMin + (x / 100) * (lngMax - lngMin);
  const lat = latMin + (1 - y / 100) * (latMax - latMin);
  return { lat, lng };
}

/** Hand-tuned sector centers for the post mini-map grid (fallback when no GPS pin). */
const LEGACY_NEIGHBORHOOD_MAP_COORDS: Record<string, { x: number; y: number }> = {
  Natomas: { x: 48, y: 16 },
  Arden: { x: 74, y: 25 },
  Carmichael: { x: 82, y: 22 },
  'Citrus Heights': { x: 90, y: 10 },
  'Fair Oaks': { x: 88, y: 20 },
  Orangevale: { x: 93, y: 15 },
  'Rancho Cordova': { x: 90, y: 45 },
  'East Sacramento': { x: 64, y: 38 },
  Midtown: { x: 53, y: 40 },
  Downtown: { x: 41, y: 40 },
  'West Sacramento': { x: 22, y: 40 },
  'Land Park': { x: 38, y: 56 },
  'Curtis Park': { x: 50, y: 55 },
  'Oak Park': { x: 63, y: 56 },
  'Tahoe Park': { x: 75, y: 56 },
  'Pocket-Greenhaven': { x: 24, y: 72 },
  'South Sacramento': { x: 55, y: 74 },
  'Elk Grove': { x: 58, y: 91 },
};

// Map percent coords derived from lat/lng centers, with legacy tuned overrides
export const NEIGHBORHOOD_COORDS: Record<string, { x: number; y: number }> = {
  ...Object.fromEntries(
    Object.entries(NEIGHBORHOOD_LAT_LONGS).map(([name, { lat, lng }]) => [name, mapGPSToPercent(lat, lng)]),
  ),
  ...LEGACY_NEIGHBORHOOD_MAP_COORDS,
};

// Help find the closest neighborhood based on custom coordinates
export function findClosestNeighborhood(x: number, y: number): string {
  let closestName = SACRAMENTO_NEIGHBORHOODS[0];
  let minDistance = Infinity;

  for (const name of SACRAMENTO_NEIGHBORHOODS) {
    const coord = NEIGHBORHOOD_COORDS[name];
    if (!coord) continue;
    const dx = x - coord.x;
    const dy = y - coord.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }
  return closestName;
}

export function findClosestNeighborhoodByLatLng(lat: number, lng: number): string {
  let closestName = SACRAMENTO_NEIGHBORHOODS[0];
  let minDistance = Infinity;

  for (const name of SACRAMENTO_NEIGHBORHOODS) {
    const coords = NEIGHBORHOOD_LAT_LONGS[name];
    if (!coords) continue;
    const dLat = lat - coords.lat;
    const dLng = lng - coords.lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distance < minDistance) {
      minDistance = distance;
      closestName = name;
    }
  }
  return closestName;
}
