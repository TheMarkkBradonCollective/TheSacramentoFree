import type { Chat } from '../types';

/** Everyone in the community can read and post here. */
export const GLOBAL_COMMUNITY_CHAT_ID = 'community-global';

/** Staff-only lounge — hidden from neighbors. */
export const STAFF_COMMUNITY_CHAT_ID = 'community-staff';

export function isGlobalCommunityChat(chatId: string): boolean {
  return chatId === GLOBAL_COMMUNITY_CHAT_ID;
}

export function isStaffCommunityChat(chatId: string): boolean {
  return chatId === STAFF_COMMUNITY_CHAT_ID;
}

export function isCommunityChat(chatId: string): boolean {
  return isGlobalCommunityChat(chatId) || isStaffCommunityChat(chatId);
}

export function communityChatTitle(chatId: string): string {
  if (isGlobalCommunityChat(chatId)) return 'Community chat';
  if (isStaffCommunityChat(chatId)) return 'Staff chat';
  return 'Chat';
}

export function communityChatSubtitle(chatId: string): string {
  if (isGlobalCommunityChat(chatId)) return 'All neighbors — say hello and share local tips';
  if (isStaffCommunityChat(chatId)) return 'Staff only — team coordination';
  return '';
}

export function buildGlobalCommunityChatRow(lastMessageAt = ''): Chat {
  return {
    id: GLOBAL_COMMUNITY_CHAT_ID,
    participantIds: [],
    participantNames: {},
    participantPhotos: {},
    lastMessageText: 'Welcome — introduce yourself!',
    lastMessageAt: lastMessageAt || new Date(0).toISOString(),
    itemId: '',
    itemTitle: '',
  };
}

export function buildStaffCommunityChatRow(lastMessageAt = ''): Chat {
  return {
    id: STAFF_COMMUNITY_CHAT_ID,
    participantIds: [],
    participantNames: {},
    participantPhotos: {},
    lastMessageText: 'Staff lounge — coordinate here.',
    lastMessageAt: lastMessageAt || new Date(0).toISOString(),
    itemId: '',
    itemTitle: '',
  };
}

/** Community channels stay pinned above direct messages. */
export function sortChatsForInbox(chats: Chat[], isStaff: boolean): Chat[] {
  const global = chats.find((c) => c.id === GLOBAL_COMMUNITY_CHAT_ID);
  const staff = isStaff ? chats.find((c) => c.id === STAFF_COMMUNITY_CHAT_ID) : null;
  const rest = chats.filter(
    (c) => c.id !== GLOBAL_COMMUNITY_CHAT_ID && c.id !== STAFF_COMMUNITY_CHAT_ID,
  );
  rest.sort((a, b) => {
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });
  const pinned: Chat[] = [];
  if (global) pinned.push(global);
  if (staff) pinned.push(staff);
  return [...pinned, ...rest];
}
