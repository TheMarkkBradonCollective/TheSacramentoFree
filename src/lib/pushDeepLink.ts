import type { AppTab } from './appTabs';

export interface PushDeepLinkTarget {
  tab?: AppTab;
  listingId?: string;
  eventId?: string;
  conversationId?: string;
  requestId?: string;
  feedPostId?: string;
  /** Open Chat inbox focused on pending message requests (not a chat id). */
  messageRequests?: boolean;
  notifications?: boolean;
  notificationsTab?: 'announcements' | 'updates' | 'notifications' | 'alerts' | 'listings' | 'awards';
  staffPanel?: 'tickets' | 'reports';
  chatFeedbackPanel?: 'reviews' | 'report' | 'staffReports';
  /** Neighbor staff application page. */
  staffApply?: boolean;
  /** @deprecated tickets — opens Messages → Support inbox */
  directorOverview?: boolean;
  supportTicketId?: string;
  chatSupportView?: 'list' | 'new';
}

/** Normalize push/inbox URL to an app path (no origin, leading slash). */
export function normalizeNotificationPath(raw: string): string {
  if (!raw) return '/';
  let path = raw.trim();
  try {
    const parsed = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'https://www.sacramentobuynothing.com');
    path = parsed.pathname + parsed.search + parsed.hash;
  } catch {
    // keep as-is
  }
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

export function parsePushDeepLink(raw: string): PushDeepLinkTarget | null {
  if (!raw) return null;

  let path = normalizeNotificationPath(raw);
  if (path !== '/' && path.endsWith('/')) {
    path = path.replace(/\/+$/, '') || '/';
  }

  path = path.replace(/^\/+/, '');

  if (path === '' || path === '/') return { tab: 'map' };

  if (path === 'feed' || path === 'stuff' || path === 'events' || path === 'map' || path === 'chats' || path === 'profile') {
    return { tab: path as AppTab };
  }

  const feedPostMatch = path.match(/^feed\/post\/([^/]+)/);
  if (feedPostMatch) return { tab: 'feed', feedPostId: feedPostMatch[1] };

  if (path === 'notifications' || path === 'notifications/listings') return { notificationsTab: 'notifications' };
  if (path === 'notifications/alerts' || path === 'alerts') return { notificationsTab: 'alerts' };
  if (path === 'updates' || path === 'notifications/updates') return { notificationsTab: 'updates' };
  if (path === 'notifications/awards' || path === 'awards') return { notificationsTab: 'awards' };
  if (
    path === 'help/announcements' ||
    path === 'announcements' ||
    path === 'news' ||
    path === 'notifications/announcements'
  ) {
    return { notificationsTab: 'announcements' };
  }
  if (path === 'staff/tickets') return { tab: 'chats', chatSupportView: 'list' };
  if (path === 'staff/reports') return { tab: 'chats', chatFeedbackPanel: 'staffReports' };
  if (path === 'staff/apply' || path === 'profile/apply') return { tab: 'profile', staffApply: true };
  if (path === 'director/overview') return { tab: 'profile', directorOverview: true };

  const listingMatch = path.match(/^listing\/([^/]+)/);
  if (listingMatch) return { tab: 'stuff', listingId: listingMatch[1] };

  const eventMatch = path.match(/^events\/([^/]+)/);
  if (eventMatch) return { tab: 'events', eventId: eventMatch[1] };

  if (path === 'messages/requests') return { tab: 'chats', messageRequests: true };
  if (path === 'messages') return { tab: 'chats' };
  if (path === 'support' || path === 'support/tickets') return { tab: 'chats', chatSupportView: 'list' };
  if (path === 'support/new') return { tab: 'chats', chatSupportView: 'new' };

  const supportTicketMatch = path.match(/^support\/([^/]+)/);
  if (supportTicketMatch && supportTicketMatch[1] !== 'new' && supportTicketMatch[1] !== 'tickets') {
    return { tab: 'chats', supportTicketId: supportTicketMatch[1] };
  }

  if (path === 'messages/community-global') {
    return { tab: 'chats', conversationId: 'community-global' };
  }
  if (path === 'messages/community-staff') {
    return { tab: 'chats', conversationId: 'community-staff' };
  }

  const messageMatch = path.match(/^messages\/([^/]+)/);
  if (messageMatch && messageMatch[1] !== 'requests') {
    return { tab: 'chats', conversationId: messageMatch[1] };
  }

  const requestMatch = path.match(/^requests\/([^/]+)/);
  if (requestMatch) return { tab: 'chats', requestId: requestMatch[1] };

  return null;
}

/** True when the URL should survive last-tab replaceState (Updates, News, listing, chat, …). */
export function shouldPreservePushDeepLink(target: PushDeepLinkTarget | null): boolean {
  if (!target) return false;
  return Boolean(
    target.notificationsTab ||
      target.notifications ||
      target.listingId ||
      target.eventId ||
      target.conversationId ||
      target.requestId ||
      target.feedPostId ||
      target.messageRequests ||
      target.staffPanel ||
      target.chatFeedbackPanel ||
      target.directorOverview ||
      target.staffApply ||
      target.supportTicketId ||
      target.chatSupportView,
  );
}

export function pushUrlForListing(listingId: string): string {
  return `/listing/${listingId}`;
}

export function pushUrlForFeedPost(postId: string): string {
  return `/feed/post/${postId}`;
}

export function pushUrlForEvent(eventId: string): string {
  return `/events/${eventId}`;
}

export function pushUrlForConversation(conversationId: string): string {
  return `/messages/${conversationId}`;
}

export function pushUrlForMessageRequests(): string {
  return '/messages/requests';
}

export function pushUrlForRequest(requestId: string): string {
  return `/requests/${requestId}`;
}

export function pushUrlForStaffTickets(): string {
  return '/staff/tickets';
}

export function pushUrlForSupportTickets(): string {
  return '/support';
}

export function pushUrlForSupportTicket(ticketId: string): string {
  return `/support/${ticketId}`;
}

export function pushUrlForStaffReports(): string {
  return '/staff/reports';
}

export function pushUrlForStaffApply(): string {
  return '/staff/apply';
}

export function pushUrlForDirectorOverview(): string {
  return '/director/overview';
}

export function pushUrlForProfile(): string {
  return '/profile';
}

export function pushUrlForNotificationsInbox(): string {
  return '/notifications';
}
