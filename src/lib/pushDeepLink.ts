import type { AppTab } from './appTabs';

export interface PushDeepLinkTarget {
  tab?: AppTab;
  listingId?: string;
  conversationId?: string;
  requestId?: string;
  profile?: boolean;
  notifications?: boolean;
  staffPanel?: 'tickets' | 'reports';
  directorOverview?: boolean;
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
  if (path === 'staff/tickets') return { tab: 'menu', staffPanel: 'tickets' };
  if (path === 'staff/reports') return { tab: 'menu', staffPanel: 'reports' };
  if (path === 'director/overview') return { tab: 'menu', directorOverview: true };

  const listingMatch = path.match(/^listing\/([^/]+)/);
  if (listingMatch) return { tab: 'feed', listingId: listingMatch[1] };

  if (path === 'messages') return { tab: 'chats' };

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

export function pushUrlForMessageRequests(): string {
  return '/messages';
}

export function pushUrlForRequest(requestId: string): string {
  return `/requests/${requestId}`;
}

export function pushUrlForStaffTickets(): string {
  return '/staff/tickets';
}

export function pushUrlForStaffReports(): string {
  return '/staff/reports';
}

export function pushUrlForDirectorOverview(): string {
  return '/director/overview';
}
