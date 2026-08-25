import type { AppTab } from './appTabs';

export interface PushDeepLinkTarget {
  tab?: AppTab;
  listingId?: string;
  pickupSessionId?: string;
  eventId?: string;
  conversationId?: string;
  requestId?: string;
  feedPostId?: string;
  viewProfileUid?: string;
  awardsPanel?: boolean;
  announcementId?: string;
  updateId?: string;
  /** Open Chat inbox focused on pending message requests (not a chat id). */
  messageRequests?: boolean;
  notifications?: boolean;
  notificationsTab?: 'announcements' | 'updates' | 'notifications' | 'alerts' | 'listings';
  staffPanel?: 'tickets' | 'reports';
  chatFeedbackPanel?: 'reviews' | 'report' | 'staffReports';
  /** Neighbor staff application page. */
  staffApply?: boolean;
  /** Open Go Get session (native Android pickup coordination). */
  goGetSessionId?: string;
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
  const qIndex = path.indexOf('?');
  const pathOnly = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const query = qIndex >= 0 ? path.slice(qIndex + 1) : '';
  const params = new URLSearchParams(query);
  const pickupSessionId = params.get('pickup') || undefined;

  if (pathOnly === '' || pathOnly === '/') return { tab: 'map' };

  if (pathOnly === 'feed' || pathOnly === 'stuff' || pathOnly === 'events' || pathOnly === 'map' || pathOnly === 'chats' || pathOnly === 'profile') {
    return { tab: pathOnly as AppTab };
  }

  const feedPostMatch = pathOnly.match(/^feed\/post\/([^/]+)/);
  if (feedPostMatch) return { tab: 'feed', feedPostId: feedPostMatch[1] };

  if (pathOnly === 'notifications' || pathOnly === 'notifications/listings') return { notificationsTab: 'notifications' };
  if (pathOnly === 'notifications/alerts' || pathOnly === 'alerts') return { notificationsTab: 'alerts' };
  if (pathOnly === 'updates' || pathOnly === 'notifications/updates') return { notificationsTab: 'updates' };
  if (pathOnly === 'notifications/awards' || pathOnly === 'awards') return { awardsPanel: true };

  const updateIdMatch = pathOnly.match(/^updates\/([^/]+)/);
  if (updateIdMatch) return { notificationsTab: 'updates', updateId: updateIdMatch[1] };

  const newsIdMatch = pathOnly.match(/^help\/announcements\/([^/]+)/);
  if (newsIdMatch) return { notificationsTab: 'announcements', announcementId: newsIdMatch[1] };

  const neighborMatch = pathOnly.match(/^profile\/([^/]+)/);
  if (neighborMatch && neighborMatch[1] !== 'apply') {
    return { tab: 'profile', viewProfileUid: neighborMatch[1] };
  }
  if (
    pathOnly === 'help/announcements' ||
    pathOnly === 'announcements' ||
    pathOnly === 'news' ||
    pathOnly === 'notifications/announcements'
  ) {
    return { notificationsTab: 'announcements' };
  }
  if (pathOnly === 'staff/tickets') return { tab: 'chats', chatSupportView: 'list' };
  if (pathOnly === 'staff/reports') return { tab: 'chats', chatFeedbackPanel: 'staffReports' };
  if (pathOnly === 'staff/apply' || pathOnly === 'profile/apply') return { tab: 'profile', staffApply: true };
  if (pathOnly === 'director/overview') return { tab: 'profile', directorOverview: true };

  const listingMatch = pathOnly.match(/^listing\/([^/]+)/);
  if (listingMatch) return { tab: 'stuff', listingId: listingMatch[1], pickupSessionId };

  const goGetMatch = pathOnly.match(/^go-get\/([^/]+)/);
  if (goGetMatch) return { tab: 'stuff', goGetSessionId: goGetMatch[1] };

  const pickupMatch = pathOnly.match(/^pickup\/([^/]+)/);
  if (pickupMatch) return { tab: 'stuff', goGetSessionId: pickupMatch[1] };

  const eventMatch = pathOnly.match(/^events\/([^/]+)/);
  if (eventMatch) return { tab: 'events', eventId: eventMatch[1] };

  if (pathOnly === 'messages/requests') return { tab: 'chats', messageRequests: true };
  if (pathOnly === 'messages') return { tab: 'chats' };
  if (pathOnly === 'support' || pathOnly === 'support/tickets') return { tab: 'chats', chatSupportView: 'list' };
  if (pathOnly === 'support/new') return { tab: 'chats', chatSupportView: 'new' };

  const supportTicketMatch = pathOnly.match(/^support\/([^/]+)/);
  if (supportTicketMatch && supportTicketMatch[1] !== 'new' && supportTicketMatch[1] !== 'tickets') {
    return { tab: 'chats', supportTicketId: supportTicketMatch[1] };
  }

  if (pathOnly === 'messages/community-global') {
    return { tab: 'chats', conversationId: 'community-global' };
  }
  if (pathOnly === 'messages/community-staff') {
    return { tab: 'chats', conversationId: 'community-staff' };
  }

  const messageMatch = pathOnly.match(/^messages\/([^/]+)/);
  if (messageMatch && messageMatch[1] !== 'requests') {
    return { tab: 'chats', conversationId: messageMatch[1] };
  }

  const requestMatch = pathOnly.match(/^requests\/([^/]+)/);
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
      target.pickupSessionId ||
      target.eventId ||
      target.conversationId ||
      target.requestId ||
      target.feedPostId ||
      target.viewProfileUid ||
      target.awardsPanel ||
      target.announcementId ||
      target.updateId ||
      target.messageRequests ||
      target.staffPanel ||
      target.chatFeedbackPanel ||
      target.directorOverview ||
      target.staffApply ||
      target.supportTicketId ||
      target.chatSupportView ||
      target.goGetSessionId,
  );
}

export function pushUrlForGoGetSession(sessionId: string): string {
  return `/go-get/${sessionId}`;
}

export function pushUrlForListing(listingId: string): string {
  return `/listing/${listingId}`;
}

export function pushUrlForPickup(listingId: string, sessionId: string): string {
  return `/listing/${listingId}?pickup=${encodeURIComponent(sessionId)}`;
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

export function pushUrlForNeighborProfile(userId: string): string {
  return `/profile/${userId}`;
}

export function pushUrlForAwards(): string {
  return '/awards';
}

export function pushUrlForAnnouncement(announcementId: string): string {
  return `/help/announcements/${announcementId}`;
}

export function pushUrlForAppUpdate(updateId: string): string {
  return `/updates/${updateId}`;
}

export function pushUrlForNotificationsInbox(): string {
  return '/notifications';
}
