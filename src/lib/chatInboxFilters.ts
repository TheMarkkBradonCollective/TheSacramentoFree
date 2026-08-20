import type { Chat, CommunityEvent, ItemPost, SupportTicket } from '../types';
import { isCommunityChat } from './communityChats';
import { isEventPostChatReadOnly, isListingPostChatReadOnly } from './roles';
import type { InboxEntry } from './chatInbox';
import { inboxArchiveKey } from './chatInboxArchive';

export type ChatCategoryFilter = 'everyone' | 'dm' | 'support' | 'groups';

export type ChatStatusFilter = 'all' | 'live' | 'closed' | 'archived';

/** Status sub-tabs (All / Live / Closed / Archived) apply only to DM and Support inboxes. */
export function categoryHasStatusTabs(category: ChatCategoryFilter): boolean {
  return category === 'dm' || category === 'support';
}

const CATEGORY_FILTER_KEY = 'sbn_chat_category_filter_v1';
const STATUS_FILTER_KEY = 'sbn_chat_status_filter_v1';

export function readChatCategoryFilter(): ChatCategoryFilter {
  try {
    const raw = localStorage.getItem(CATEGORY_FILTER_KEY);
    if (raw === 'everyone' || raw === 'dm' || raw === 'support' || raw === 'groups') return raw;
  } catch {
    /* ignore */
  }
  return 'everyone';
}

export function writeChatCategoryFilter(value: ChatCategoryFilter): void {
  try {
    localStorage.setItem(CATEGORY_FILTER_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readChatStatusFilter(): ChatStatusFilter {
  try {
    const raw = localStorage.getItem(STATUS_FILTER_KEY);
    if (raw === 'all' || raw === 'live' || raw === 'closed' || raw === 'archived') return raw;
  } catch {
    /* ignore */
  }
  return 'all';
}

export function writeChatStatusFilter(value: ChatStatusFilter): void {
  try {
    localStorage.setItem(STATUS_FILTER_KEY, value);
  } catch {
    /* ignore */
  }
}

export type InboxFilterContext = {
  archivedKeys: Set<string>;
  items: ItemPost[];
  events: CommunityEvent[];
};

function isChatClosed(chat: Chat, items: ItemPost[], events: CommunityEvent[]): boolean {
  if (isCommunityChat(chat.id)) return false;
  if (chat.itemId) {
    const item = items.find((row) => row.id === chat.itemId);
    return item ? isListingPostChatReadOnly(item.status) : false;
  }
  if (chat.eventId) {
    const event = events.find((row) => row.id === chat.eventId);
    return event ? isEventPostChatReadOnly(event.status) : false;
  }
  return false;
}

export function getInboxEntryCategory(entry: InboxEntry): ChatCategoryFilter | 'request' {
  if (entry.kind === 'request') return 'request';
  if (entry.kind === 'support') return 'support';
  if (isCommunityChat(entry.chat.id)) return 'groups';
  return 'dm';
}

export function isInboxEntryArchived(entry: InboxEntry, archivedKeys: Set<string>): boolean {
  if (entry.kind === 'chat' && !isCommunityChat(entry.chat.id)) {
    return archivedKeys.has(inboxArchiveKey('chat', entry.chat.id));
  }
  if (entry.kind === 'support') {
    return archivedKeys.has(inboxArchiveKey('support', entry.ticket.id));
  }
  return false;
}

export function isInboxEntryLive(
  entry: InboxEntry,
  context: Pick<InboxFilterContext, 'items' | 'events'>,
): boolean {
  if (entry.kind === 'request') return true;
  if (entry.kind === 'support') return entry.ticket.status === 'open';
  if (isCommunityChat(entry.chat.id)) return true;
  return !isChatClosed(entry.chat, context.items, context.events);
}

export function isInboxEntryClosed(
  entry: InboxEntry,
  context: Pick<InboxFilterContext, 'items' | 'events'>,
): boolean {
  if (entry.kind === 'request') return false;
  if (entry.kind === 'support') return entry.ticket.status === 'closed';
  if (isCommunityChat(entry.chat.id)) return false;
  return isChatClosed(entry.chat, context.items, context.events);
}

export function matchesCategoryFilter(entry: InboxEntry, filter: ChatCategoryFilter): boolean {
  if (filter === 'everyone') return true;
  const category = getInboxEntryCategory(entry);
  if (filter === 'dm') return category === 'dm' || category === 'request';
  if (filter === 'support') return category === 'support';
  return category === 'groups';
}

export function matchesStatusFilter(
  entry: InboxEntry,
  filter: ChatStatusFilter,
  context: InboxFilterContext,
): boolean {
  const archived = isInboxEntryArchived(entry, context.archivedKeys);

  if (filter === 'archived') return archived;

  if (archived) return false;

  if (filter === 'all') return true;
  if (filter === 'live') return isInboxEntryLive(entry, context);
  return isInboxEntryClosed(entry, context);
}

export function filterInboxEntries(
  entries: InboxEntry[],
  categoryFilter: ChatCategoryFilter,
  statusFilter: ChatStatusFilter,
  context: InboxFilterContext,
): InboxEntry[] {
  const effectiveStatusFilter = categoryHasStatusTabs(categoryFilter) ? statusFilter : 'all';
  return entries.filter(
    (entry) =>
      matchesCategoryFilter(entry, categoryFilter) &&
      matchesStatusFilter(entry, effectiveStatusFilter, context),
  );
}

export function emptyInboxFilterMessage(
  categoryFilter: ChatCategoryFilter,
  statusFilter: ChatStatusFilter,
): { title: string; description: string } {
  const effectiveStatusFilter = categoryHasStatusTabs(categoryFilter) ? statusFilter : 'all';
  if (effectiveStatusFilter === 'archived') {
    return {
      title: 'Nothing archived',
      description: 'Archived chats and closed support tickets will appear here.',
    };
  }
  if (effectiveStatusFilter === 'closed') {
    return {
      title: 'No closed conversations',
      description: 'Closed support tickets and finished listing or event chats show up here.',
    };
  }
  if (effectiveStatusFilter === 'live') {
    return {
      title: 'No live conversations',
      description: 'Open chats and support tickets will appear here.',
    };
  }
  if (categoryFilter === 'groups') {
    return {
      title: 'No group chats',
      description: 'Community group channels appear here.',
    };
  }
  if (categoryFilter === 'support') {
    return {
      title: 'No support chats',
      description: 'Contact support from the header to start a ticket.',
    };
  }
  if (categoryFilter === 'dm') {
    return {
      title: 'No direct messages',
      description: 'Tap New to message a neighbor or accept a pending request.',
    };
  }
  return {
    title: 'No chats yet',
    description: 'Browse Stuff or Events and message a neighbor from any listing, or tap New to start a chat.',
  };
}

/** Whether this entry can be archived (non-group chat or support). */
export function canArchiveInboxEntry(entry: InboxEntry): boolean {
  if (entry.kind === 'chat' && !isCommunityChat(entry.chat.id)) return true;
  return entry.kind === 'support';
}
