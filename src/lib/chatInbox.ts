import type { Chat, MessageRequest, SupportTicket } from '../types';
import type { SupportTicketLastMessage } from './supportChat';
import { isCommunityChat, isGlobalCommunityChat } from './communityChats';

export type InboxEntry =
  | { kind: 'request'; id: string; sortAt: number; request: MessageRequest }
  | { kind: 'chat'; id: string; sortAt: number; chat: Chat }
  | { kind: 'support'; id: string; sortAt: number; ticket: SupportTicket; preview?: SupportTicketLastMessage };

function toTimestamp(value: unknown): number {
  if (!value) return 0;
  try {
    if (typeof value === 'string') return new Date(value).getTime();
    if (value && typeof value === 'object' && 'seconds' in value) {
      return new Date((value as { seconds: number }).seconds * 1000).getTime();
    }
    return new Date(value as string | number).getTime();
  } catch {
    return 0;
  }
}

export function buildInboxEntries(options: {
  chats: Chat[];
  supportTickets: SupportTicket[];
  supportPreviews: Record<string, SupportTicketLastMessage>;
  incomingRequests: MessageRequest[];
}): InboxEntry[] {
  const { chats, supportTickets, supportPreviews, incomingRequests } = options;
  const entries: InboxEntry[] = [];

  for (const request of incomingRequests) {
    entries.push({
      kind: 'request',
      id: request.id,
      sortAt: Number.MAX_SAFE_INTEGER,
      request,
    });
  }

  for (const chat of chats) {
    entries.push({
      kind: 'chat',
      id: chat.id,
      sortAt: toTimestamp(chat.lastMessageAt),
      chat,
    });
  }

  for (const ticket of supportTickets) {
    const preview = supportPreviews[ticket.id];
    entries.push({
      kind: 'support',
      id: ticket.id,
      sortAt: toTimestamp(preview?.createdAt || ticket.updatedAt),
      ticket,
      preview,
    });
  }

  entries.sort((a, b) => {
    if (a.kind === 'request' && b.kind !== 'request') return -1;
    if (b.kind === 'request' && a.kind !== 'request') return 1;
    return b.sortAt - a.sortAt;
  });

  return entries;
}

export function chatInboxRowClass(isSelected: boolean): string {
  return [
    'w-full text-left px-4 py-3 flex items-center gap-3 transition-colors cursor-pointer border-b border-app/25',
    isSelected ? 'bg-accent-soft' : 'hover:bg-surface-hover active:bg-surface-hover',
  ].join(' ');
}

export function isGroupChatEntry(chat: Chat): boolean {
  return isCommunityChat(chat.id);
}

export function isGlobalGroupChat(chat: Chat): boolean {
  return isGlobalCommunityChat(chat.id);
}
