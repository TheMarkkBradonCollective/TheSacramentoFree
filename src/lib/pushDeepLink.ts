import type { AppTab } from './appTabs';

export interface PushDeepLinkTarget {
  tab?: AppTab;
  listingId?: string;
  conversationId?: string;
  requestId?: string;
  profile?: boolean;
  notifications?: boolean;
}

export function parsePushDeepLink(raw: string): PushDeepLinkTarget | null {
  if (!raw) return null;

  let path = raw.trim();
  try {
    const parsed = new URL(path, window.location.origin);
    path = parsed.pathname;
  } catch {
    // keep as-is
  }

  path = path.replace(/^\/+/, '');

  if (path === 'notifications') return { tab: 'menu', notifications: true };
  if (path === 'profile') return { tab: 'profile', profile: true };

  const listingMatch = path.match(/^listing\/([^/]+)/);
  if (listingMatch) return { tab: 'feed', listingId: listingMatch[1] };

  const messageMatch = path.match(/^messages\/([^/]+)/);
  if (messageMatch) return { tab: 'chats', conversationId: messageMatch[1] };

  const requestMatch = path.match(/^requests\/([^/]+)/);
  if (requestMatch) return { tab: 'feed', requestId: requestMatch[1] };

  return null;
}

export function pushUrlForListing(listingId: string): string {
  return `/listing/${listingId}`;
}

export function pushUrlForConversation(conversationId: string): string {
  return `/messages/${conversationId}`;
}

export function pushUrlForRequest(requestId: string): string {
  return `/requests/${requestId}`;
}
