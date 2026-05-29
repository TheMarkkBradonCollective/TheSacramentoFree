import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, UserProfile, ItemPost } from '../types';
import { getSupabaseChats, getSupabaseMessages, createSupabaseMessage } from '../supabase';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import {
  MessageSquare,
  Send,
  AlertCircle,
  MapPin,
  Gift,
  Box,
  ChevronLeft,
  Navigation,
  CheckCircle,
} from 'lucide-react';
import { IN_APP } from '../siteContent';
import { formatPickupLocationMessage } from '../lib/itemLocation';
import { formatItemClaimedChatMessage, formatItemFulfilledChatMessage } from '../lib/claims';
import {
  markItemFulfilledFromChat,
  recordItemClaimInChat,
} from '../supabase';

interface ChatSystemProps {
  userProfile: UserProfile;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  items: ItemPost[];
  className?: string;
  /** Edge-to-edge layout (mobile tab) — no outer card chrome */
  fullBleed?: boolean;
  onViewProfile?: (userId: string) => void;
  onItemsChanged?: () => void;
}

export default function ChatSystem({
  userProfile,
  initialSelectedChatId,
  onClearInitialChat,
  items,
  className = '',
  fullBleed = false,
  onViewProfile,
  onItemsChanged,
}: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (value: unknown) => {
    if (!value) return '';
    try {
      if (typeof value === 'string') {
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (value && typeof value === 'object' && 'seconds' in value) {
        return new Date((value as { seconds: number }).seconds * 1000).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(value as string | number).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  useEffect(() => {
    let active = true;

    const loadChats = async () => {
      try {
        const loadedChats = await getSupabaseChats(userProfile.uid);
        if (!active) return;

        loadedChats.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });

        setChats(loadedChats);
        setIsChatsLoading(false);

        if (initialSelectedChatId) {
          const target = loadedChats.find((c) => c.id === initialSelectedChatId);
          if (target) {
            setSelectedChat((prev) => prev ?? target);
          }
        }
      } catch (err) {
        console.warn('Failed to load chats from Supabase:', err);
        if (active) setIsChatsLoading(false);
      }
    };

    loadChats();

    const refreshChats = debounceRealtime(() => {
      if (active) void loadChats();
    }, 200);

    const unsubChats = subscribePostgresChanges(
      { channelName: `live-chats-${userProfile.uid}`, table: 'chats', event: '*' },
      () => refreshChats(),
    );

    const unsubMessagesForInbox = subscribePostgresChanges(
      { channelName: `live-messages-inbox-${userProfile.uid}`, table: 'messages', event: 'INSERT' },
      () => refreshChats(),
    );

    return () => {
      active = false;
      unsubChats();
      unsubMessagesForInbox();
    };
  }, [userProfile.uid, initialSelectedChatId]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    let active = true;
    const chatId = selectedChat.id;

    const refreshChatMeta = debounceRealtime(() => {
      void getSupabaseChats(userProfile.uid).then((loadedChats) => {
        if (!active) return;
        loadedChats.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
        setChats(loadedChats);
        setSelectedChat((prev) => {
          if (!prev) return prev;
          return loadedChats.find((c) => c.id === prev.id) ?? prev;
        });
      });
    }, 200);

    const loadMessages = async () => {
      try {
        const loadedMessages = await getSupabaseMessages(chatId);
        if (!active) return;
        setMessages(loadedMessages);
      } catch (err) {
        console.warn('Failed to load messages from Supabase:', err);
      }
    };

    loadMessages();

    const unsubMessages = subscribePostgresChanges<Message>(
      {
        channelName: `live-messages-${chatId}`,
        table: 'messages',
        event: 'INSERT',
        filter: `chatId=eq.${chatId}`,
      },
      (payload) => {
        const row = payload.new as Message | null;
        if (!row?.id || !active) return;
        // Own sends are added optimistically in sendChatText — skip to avoid duplicates.
        if (row.senderId === userProfile.uid) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
        refreshChatMeta();
      },
    );

    return () => {
      active = false;
      unsubMessages();
    };
  }, [selectedChat?.id, userProfile.uid]);

  const sendChatText = async (text: string) => {
    if (!selectedChat || !text.trim() || isSending) return false;

    setIsSending(true);
    setErrorMsg('');
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const trimmed = text.trim();
    const optimistic: Message = {
      id: messageId,
      senderId: userProfile.uid,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) return prev;
      return [...prev, optimistic];
    });

    try {
      const success = await createSupabaseMessage(
        selectedChat.id,
        trimmed,
        userProfile.uid,
        messageId,
      );
      if (success) {
        return true;
      }
      throw new Error('Supabase message write failed');
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      setErrorMsg('Failed to send message. Please try again.');
      console.error(err);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPickupLocation = async () => {
    const linkedItem = items.find((i) => i.id === selectedChat?.itemId);
    if (!linkedItem) return;
    await sendChatText(formatPickupLocationMessage(linkedItem));
  };

  const handleMarkClaimedByThisNeighbor = async () => {
    if (!selectedChat) return;
    const linkedItem = items.find((i) => i.id === selectedChat.itemId);
    if (!linkedItem || linkedItem.userId !== userProfile.uid) return;

    const claimerUserId = selectedChat.participantIds.find((id) => id !== userProfile.uid);
    if (!claimerUserId) {
      setErrorMsg('Could not identify the neighbor in this chat.');
      return;
    }

    if (
      !confirm(
        'Mark this item as claimed by the neighbor in this chat? The feed will show "Claimed" only — their name stays private on the listing.',
      )
    ) {
      return;
    }

    setIsSending(true);
    setErrorMsg('');
    const result = await recordItemClaimInChat({
      itemId: linkedItem.id,
      giverUserId: userProfile.uid,
      claimerUserId,
      chatId: selectedChat.id,
      claimMessage: formatItemClaimedChatMessage(linkedItem.title),
    });
    setIsSending(false);

    if (result.ok) {
      onItemsChanged?.();
      const loadedMessages = await getSupabaseMessages(selectedChat.id);
      setMessages(loadedMessages);
    } else {
      setErrorMsg(result.errorMessage || 'Could not mark as claimed.');
    }
  };

  const handleMarkFulfilled = async () => {
    if (!selectedChat) return;
    const linkedItem = items.find((i) => i.id === selectedChat.itemId);
    if (!linkedItem || linkedItem.userId !== userProfile.uid) return;

    const helperUserId = selectedChat.participantIds.find((id) => id !== userProfile.uid);
    if (!helperUserId) {
      setErrorMsg('Could not identify the neighbor who helped in this chat.');
      return;
    }

    const helperName =
      selectedChat.participantNames[helperUserId] || getRecipientInfo(selectedChat).otherName;

    if (
      !confirm(
        `Mark this request as fulfilled with help from ${helperName}? They get credit for giving an item, and you get +1 Items claimed.`,
      )
    ) {
      return;
    }

    setIsSending(true);
    setErrorMsg('');
    const result = await markItemFulfilledFromChat({
      itemId: linkedItem.id,
      ownerUserId: userProfile.uid,
      helperUserId,
      chatId: selectedChat.id,
      message: formatItemFulfilledChatMessage(linkedItem.title, helperName),
    });
    setIsSending(false);

    if (result.ok) {
      onItemsChanged?.();
      const loadedMessages = await getSupabaseMessages(selectedChat.id);
      setMessages(loadedMessages);
    } else {
      setErrorMsg(result.errorMessage || 'Could not mark as fulfilled.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !inputText.trim() || isSending) return;

    const typedText = inputText.trim();
    setInputText('');
    const ok = await sendChatText(typedText);
    if (!ok) setInputText(typedText);
  };

  const getRecipientInfo = (chat: Chat) => {
    const otherId = chat.participantIds.find((id) => id !== userProfile.uid) || '';
    const otherName = chat.participantNames[otherId] || 'Neighbor';
    const otherPhoto =
      chat.participantPhotos[otherId] ||
      `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(otherName)}`;
    return { otherId, otherName, otherPhoto };
  };

  const getFormattedChatTitle = (chat: Chat) => {
    if (!chat.itemId || !chat.itemTitle) {
      return getRecipientInfo(chat).otherName;
    }
    const item = items.find((i) => i.id === chat.itemId);
    const ownerId = item ? item.userId : '';
    const messengerId = ownerId
      ? chat.participantIds.find((id) => id !== ownerId)
      : chat.participantIds.find((id) => id !== userProfile.uid);

    const finalMessengerId =
      messengerId || chat.participantIds.find((id) => id !== userProfile.uid) || userProfile.uid;
    const messengerName = chat.participantNames[finalMessengerId] || 'Neighbor';
    return `${chat.itemTitle} · ${messengerName}`;
  };

  const mobileConversationRowBase = fullBleed
    ? 'item-feed-card rounded-2xl border border-app'
    : 'border-b border-app';

  const mobileMessageCardBase = fullBleed
    ? 'item-feed-card rounded-2xl border border-app'
    : 'rounded-2xl';

  return (
    <div
      id="chat_app_viewport"
      className={`flex h-full min-h-0 w-full overflow-hidden text-app ${className} ${
        fullBleed
          ? 'bg-app rounded-none border-0'
          : 'bg-surface border border-app rounded-2xl'
      }`}
    >
      {/* Conversation list */}
      <div
        id="chats_sidebar"
        className={`flex flex-col min-h-0 shrink-0 border-r border-app w-full md:w-72 lg:w-80 ${
          fullBleed ? 'bg-app' : 'bg-surface'
        } ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="shrink-0 px-4 py-3 border-b border-app flex items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-sm text-app">Messages</h3>
          <span className="sbn-badge text-[10px]">{chats.length}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto" id="chat_rooms_scrollable">
          {isChatsLoading ? (
            <div className="p-6 text-center text-sm text-muted">Loading conversations…</div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="font-semibold text-app text-sm">No messages yet</p>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{IN_APP.chatsDescription}</p>
            </div>
          ) : (
            chats.map((chat) => {
              const { otherId, otherName, otherPhoto } = getRecipientInfo(chat);
              const isSelected = selectedChat?.id === chat.id;
              const displayTitle = getFormattedChatTitle(chat);

              return (
                <button
                  key={chat.id}
                  type="button"
                  id={`chat_row_${chat.id}`}
                  onClick={() => {
                    setSelectedChat(chat);
                    onClearInitialChat();
                  }}
                  className={`text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    mobileConversationRowBase
                  } ${
                    isSelected
                      ? 'bg-accent-soft border-l-[3px] border-l-accent'
                      : 'hover:bg-surface-hover border-l-[3px] border-l-transparent'
                  } ${
                    fullBleed ? 'mx-3 mt-2 first:mt-3 mb-0 w-auto' : 'w-full'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProfile?.(otherId);
                    }}
                    className="shrink-0 rounded-full"
                  >
                    <img
                      src={otherPhoto}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="w-10 h-10 rounded-full border border-app object-cover hover:ring-2 hover:ring-accent/40"
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-app truncate" title={displayTitle}>
                        {displayTitle}
                      </p>
                      {chat.lastMessageAt && (
                        <span className="text-[10px] text-subtle shrink-0">
                          {formatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    {chat.itemTitle && (
                      <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-medium text-accent bg-accent-soft border border-accent/20 px-2 py-0.5 rounded-full truncate max-w-full">
                        <Box className="w-3 h-3 shrink-0" />
                        <span className="truncate">{chat.itemTitle}</span>
                      </span>
                    )}

                    <p className="text-xs text-muted mt-1 line-clamp-2">
                      {chat.lastMessageText || 'Start the conversation'}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Active thread */}
      <div
        id="conversations_body_viewport"
        className={`flex-1 flex flex-col min-h-0 min-w-0 bg-app ${
          !selectedChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {selectedChat ? (
          (() => {
            const linkedItem = items.find((i) => i.id === selectedChat.itemId);
            const isChatDisabled = linkedItem && linkedItem.status !== 'active';
            const displayTitleHeader = getFormattedChatTitle(selectedChat);
            const { otherName, otherPhoto } = getRecipientInfo(selectedChat);
            const isListingOwner = linkedItem?.userId === userProfile.uid;
            const showSendLocationBtn = !!linkedItem && !isChatDisabled && isListingOwner;

            const showMarkClaimedBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              linkedItem.type === 'giveaway' &&
              linkedItem.status === 'active';

            const showMarkFulfilledBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              linkedItem.type === 'looking' &&
              linkedItem.status === 'active';

            return (
              <>
                <header
                  className="shrink-0 px-3 sm:px-4 py-3 border-b border-app bg-surface flex items-center gap-3"
                  id="chat_panel_header"
                >
                  <button
                    type="button"
                    id="mobile_chat_back_btn"
                    onClick={() => {
                      setSelectedChat(null);
                      onClearInitialChat();
                    }}
                    className="p-2 rounded-full text-muted hover:text-app hover:bg-inset md:hidden shrink-0 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewProfile?.(getRecipientInfo(selectedChat).otherId)}
                    className="shrink-0 rounded-full cursor-pointer hover:opacity-90"
                    title="View neighbor profile"
                  >
                    <img
                      src={otherPhoto}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="w-10 h-10 rounded-full border border-app object-cover"
                    />
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(getRecipientInfo(selectedChat).otherId)}
                      className="font-display font-semibold text-sm text-app truncate text-left hover:text-accent cursor-pointer w-full"
                      title={displayTitleHeader}
                    >
                      {otherName}
                    </button>
                    {selectedChat.itemTitle ? (
                      <p className="text-xs text-accent truncate flex items-center gap-1 mt-0.5">
                        <Gift className="w-3.5 h-3.5 shrink-0" />
                        <span>{selectedChat.itemTitle}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>Sacramento neighbor</span>
                      </p>
                    )}
                  </div>
                </header>

                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-3"
                  id="messages_scroller"
                >
                  {errorMsg && (
                    <div
                      className="p-3 bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-medium rounded-xl flex items-center gap-2"
                      id="chat_error_card"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center py-12 px-4">
                      <MessageSquare className="w-8 h-8 text-muted mx-auto mb-2" />
                      <p className="text-sm text-muted">Say hello to coordinate pickup.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isUser = msg.senderId === userProfile.uid;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                          id={`message_item_${msg.id}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 text-sm ${mobileMessageCardBase} ${
                              isUser
                                ? fullBleed
                                  ? 'bg-surface text-app border-accent/40'
                                  : 'bg-accent text-on-accent rounded-br-md'
                                : fullBleed
                                  ? 'bg-surface text-app'
                                  : 'bg-surface border border-app text-app rounded-bl-md'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <span
                              className={`text-[10px] mt-1 block text-right ${
                                isUser ? (fullBleed ? 'text-subtle' : 'text-white/75') : 'text-subtle'
                              }`}
                            >
                              {formatTime(msg.createdAt) || 'Sending…'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 p-3 sm:p-4 bg-surface border-t border-app flex flex-col gap-2 safe-area-pb"
                  id="input_tray"
                >
                  {showSendLocationBtn && (
                    <button
                      type="button"
                      onClick={handleSendPickupLocation}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_send_pickup_location_btn"
                    >
                      <Navigation className="w-4 h-4" />
                      Send pickup location / address
                    </button>
                  )}
                  {showMarkClaimedBtn && (
                    <button
                      type="button"
                      onClick={handleMarkClaimedByThisNeighbor}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_mark_claimed_btn"
                    >
                      <CheckCircle className="w-4 h-4" />
                      This neighbor claimed it
                    </button>
                  )}
                  {showMarkFulfilledBtn && (
                    <button
                      type="button"
                      onClick={handleMarkFulfilled}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_mark_fulfilled_btn"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark request fulfilled
                    </button>
                  )}
                  {isChatDisabled && (
                    <div
                      className="p-2.5 bg-inset border border-app text-muted text-xs rounded-xl flex items-center gap-2"
                      id="chat_disabled_status_banner"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>This listing is completed — chat is read-only.</span>
                    </div>
                  )}
                  <div className="flex items-end gap-2 w-full">
                    <input
                      type="text"
                      id="message_input_box"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={
                        isChatDisabled ? 'This chat is read-only' : 'Type a message…'
                      }
                      maxLength={2000}
                      required
                      disabled={!!isChatDisabled}
                      className="sbn-input flex-1 min-w-0 text-sm py-2.5 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      id="message_send_btn"
                      disabled={!inputText.trim() || isSending || !!isChatDisabled}
                      className="sbn-btn sbn-btn-primary shrink-0 px-4 py-2.5 disabled:opacity-40"
                      aria-label="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            );
          })()
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12"
            id="messages_not_selected_state"
          >
            <MessageSquare className="w-12 h-12 text-muted mb-3" />
            <h3 className="font-display font-semibold text-app">Select a conversation</h3>
            <p className="text-sm text-muted max-w-xs mt-2 leading-relaxed">{IN_APP.chatsDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}
