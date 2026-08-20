import { Box, CalendarDays, Globe, LifeBuoy, MessageSquare, Shield, Sparkles, UserPlus } from 'lucide-react';
import type { Chat, MessageRequest } from '../types';
import { communityChatSubtitle, communityChatTitle, isCommunityChat, isGlobalCommunityChat } from '../lib/communityChats';
import { chatInboxRowClass, type InboxEntry } from '../lib/chatInbox';
import { supportMessagePreview } from '../lib/supportChat';
import { PresenceUserAvatar } from './UserAvatar';
import ChatSectionEmptyState from './ChatSectionEmptyState';

interface ChatInboxListProps {
  entries: InboxEntry[];
  loading: boolean;
  isStaffSupportInbox: boolean;
  selectedChatId: string | null;
  supportOpenTicketId: string | null;
  supportActive: boolean;
  requestBusyId: string | null;
  emptyTitle: string;
  emptyDescription: string;
  getFormattedChatTitle: (chat: Chat) => string;
  getRecipientInfo: (chat: Chat) => { otherId: string; otherName: string; otherPhoto: string };
  formatTime: (value: unknown) => string;
  onViewProfile?: (userId: string) => void;
  onSelectChat: (chat: Chat) => void;
  onOpenSupportTicket: (ticketId: string) => void;
  onAcceptRequest: (request: MessageRequest) => void;
  onDeclineRequest: (request: MessageRequest) => void;
}

export default function ChatInboxList({
  entries,
  loading,
  isStaffSupportInbox,
  selectedChatId,
  supportOpenTicketId,
  supportActive,
  requestBusyId,
  emptyTitle,
  emptyDescription,
  getFormattedChatTitle,
  getRecipientInfo,
  formatTime,
  onViewProfile,
  onSelectChat,
  onOpenSupportTicket,
  onAcceptRequest,
  onDeclineRequest,
}: ChatInboxListProps) {
  if (loading) {
    return <p className="text-sm text-muted text-center px-4 py-12">Loading conversations…</p>;
  }

  if (entries.length === 0) {
    return (
      <div className="sbn-card text-center py-12 px-6 border-dashed mx-3 mt-2" id="empty_chat_inbox_state">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-soft border border-accent/25 text-accent mb-3">
          <MessageSquare className="w-7 h-7" aria-hidden />
        </span>
        <p className="text-xs font-bold text-accent uppercase tracking-wider flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Chat
        </p>
        <ChatSectionEmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div id="chat_inbox_list" className="chat-inbox-scroll">
      {entries.map((entry) => {
        if (entry.kind === 'request') {
          const request = entry.request;
          const busy = requestBusyId === request.id;
          const photo =
            request.fromUserPhoto ||
            `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(request.fromUserName)}`;

          return (
            <div key={entry.id} className="chat-inbox-request item-feed-card" id={`inbox_request_${request.id}`}>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(request.fromUserId)}
                  aria-label={`View ${request.fromUserName || 'neighbor'}'s profile`}
                  className="shrink-0 rounded-full"
                >
                  <PresenceUserAvatar uid={request.fromUserId} src={photo} name={request.fromUserName} size="md" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-accent shrink-0" />
                    <p className="font-semibold text-sm text-app truncate">{request.fromUserName}</p>
                  </div>
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {request.message || 'Wants to message you'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onAcceptRequest(request)}
                      className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onDeclineRequest(request)}
                      className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        if (entry.kind === 'chat') {
          const chat = entry.chat;
          const isSelected = selectedChatId === chat.id && !supportActive;
          const isCommunity = isCommunityChat(chat.id);
          const isGlobal = isGlobalCommunityChat(chat.id);

          if (isCommunity) {
            const title = communityChatTitle(chat.id);
            return (
              <button
                key={entry.id}
                type="button"
                id={`chat_row_${chat.id}`}
                onClick={() => onSelectChat(chat)}
                className={chatInboxRowClass(isSelected)}
              >
                <span
                  className={`chat-inbox-row__media ${
                    isGlobal ? 'text-emerald-500' : 'text-violet-500'
                  }`}
                >
                  {isGlobal ? <Globe className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                </span>
                <div className="chat-inbox-row__body">
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-display font-bold text-app truncate">{title}</p>
                      {chat.lastMessageAt ? (
                        <span className="text-[10px] text-subtle shrink-0">{formatTime(chat.lastMessageAt)}</span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {chat.lastMessageText || communityChatSubtitle(chat.id)}
                    </p>
                  </div>
                </div>
              </button>
            );
          }

          const { otherId, otherPhoto } = getRecipientInfo(chat);
          const displayTitle = getFormattedChatTitle(chat);

          return (
            <button
              key={entry.id}
              type="button"
              id={`chat_row_${chat.id}`}
              onClick={() => onSelectChat(chat)}
              className={chatInboxRowClass(isSelected)}
            >
              <span className="chat-inbox-row__media">
                <PresenceUserAvatar uid={otherId} src={otherPhoto} name={displayTitle} size="md" />
              </span>
              <div className="chat-inbox-row__body">
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-display font-bold text-app truncate" title={displayTitle}>
                      {displayTitle}
                    </p>
                    {chat.lastMessageAt ? (
                      <span className="text-[10px] text-subtle shrink-0">{formatTime(chat.lastMessageAt)}</span>
                    ) : null}
                  </div>
                  {chat.itemTitle ? (
                    <p className="text-[10px] text-accent truncate mt-0.5 flex items-center gap-1">
                      <Box className="w-3 h-3 shrink-0" />
                      {chat.itemTitle}
                    </p>
                  ) : chat.eventTitle ? (
                    <p className="text-[10px] text-accent truncate mt-0.5 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {chat.eventTitle}
                    </p>
                  ) : null}
                  <p className="text-[10px] sm:text-xs text-muted truncate mt-0.5">
                    {chat.lastMessageText || 'Start the conversation'}
                  </p>
                </div>
              </div>
            </button>
          );
        }

        const { ticket, preview } = entry;
        const isSelected = supportActive && supportOpenTicketId === ticket.id;
        const title = isStaffSupportInbox ? ticket.openerName : ticket.subject;

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => onOpenSupportTicket(ticket.id)}
            className={chatInboxRowClass(isSelected)}
          >
            <span className="chat-inbox-row__media text-sky-500">
              <LifeBuoy className="w-5 h-5" />
            </span>
            <div className="chat-inbox-row__body">
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-display font-bold text-app truncate">{title}</p>
                  <span className="text-[10px] text-subtle shrink-0">
                    {formatTime(preview?.createdAt || ticket.updatedAt)}
                  </span>
                </div>
                <p className="text-[10px] text-muted truncate mt-0.5">
                  {isStaffSupportInbox ? ticket.subject : 'Support chat'}
                </p>
                <p className="text-[10px] sm:text-xs text-muted truncate mt-0.5">{supportMessagePreview(preview)}</p>
              </div>
              {ticket.status === 'open' ? (
                <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-400" title="Open" />
              ) : (
                <span className="shrink-0 text-[9px] font-bold uppercase text-muted" title="Closed">
                  Closed
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
