export type PostStatus = 'active' | 'completed' | 'withdrawn';
export type PostType = 'giveaway' | 'looking';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email: string;
  neighborhood: string;
  bio?: string;
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

