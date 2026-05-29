export type PostStatus = 'active' | 'completed' | 'withdrawn';
export type PostType = 'giveaway' | 'looking';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  neighborhood: string;
  bio?: string;
  role?: 'user' | 'moderator' | 'admin' | 'director';
  createdAt: any;
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

export const SACRAMENTO_NEIGHBORHOODS = [
  'Midtown',
  'Downtown',
  'East Sacramento',
  'Land Park',
  'Oak Park',
  'Natomas',
  'Elk Grove',
  'Arden',
  'Citrus Heights',
  'Rancho Cordova',
  'West Sacramento',
  'South Sacramento',
  'Pocket-Greenhaven',
  'Curtis Park',
  'Tahoe Park'
];

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

// Bounding box for mapping real GPS to percentage coordinates
export function mapGPSToPercent(lat: number, lng: number): { x: number; y: number } {
  const latMin = 38.35;
  const latMax = 38.75;
  const lngMin = -121.60;
  const lngMax = -121.30;
  
  // Clamp to Sacramento bounding box
  const clampedLat = Math.max(latMin, Math.min(latMax, lat));
  const clampedLng = Math.max(lngMin, Math.min(lngMax, lng));
  
  const x = ((clampedLng - lngMin) / (lngMax - lngMin)) * 100;
  const y = (1 - (clampedLat - latMin) / (latMax - latMin)) * 100;
  
  return {
    x: Math.max(5, Math.min(95, x)), // margin safety
    y: Math.max(5, Math.min(95, y))
  };
}

// Map each neighborhood coordinates
export const NEIGHBORHOOD_COORDS: Record<string, { x: number; y: number }> = {
  'Natomas': { x: 48, y: 16 },
  'Arden': { x: 74, y: 25 },
  'Citrus Heights': { x: 90, y: 10 },
  'Rancho Cordova': { x: 90, y: 45 },
  'East Sacramento': { x: 64, y: 38 },
  'Midtown': { x: 53, y: 40 },
  'Downtown': { x: 41, y: 40 },
  'West Sacramento': { x: 22, y: 40 },
  'Land Park': { x: 38, y: 56 },
  'Curtis Park': { x: 50, y: 55 },
  'Oak Park': { x: 63, y: 56 },
  'Tahoe Park': { x: 75, y: 56 },
  'Pocket-Greenhaven': { x: 24, y: 72 },
  'South Sacramento': { x: 55, y: 74 },
  'Elk Grove': { x: 58, y: 91 }
};

// Help find the closest neighborhood based on custom coordinates
export function findClosestNeighborhood(x: number, y: number): string {
  let closestName = 'Midtown';
  let minDistance = Infinity;
  
  for (const [name, coord] of Object.entries(NEIGHBORHOOD_COORDS)) {
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


