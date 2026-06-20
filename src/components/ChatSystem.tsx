import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat, Message, UserProfile, ItemPost, MessageRequest, PendingChatCompose, SupportTicket } from '../types';
import {
  getSupabaseChats,
  getSupabaseMessages,
  createSupabaseMessage,
  deleteSupabaseMessage,
  deleteSupabaseDirectChat,
  getOrCreateSupabaseChat,
  filterChatsByBlocked,
  getIncomingMessageRequests,
  acceptMessageRequest,
  declineMessageRequest,
  updateSupabaseItemStatus,
  getUserDisplayInfoByIds,
  getSupportTicketsForUser,
  getSupportTicketsForStaff,
  getSupportTicketLastMessages,
} from '../supabase';
import {
  isCommunityChat,
  isGlobalCommunityChat,
  isStaffCommunityChat,
  communityChatTitle,
  communityChatSubtitle,
  GROUP_CHATS_SECTION_LABEL,
} from '../lib/communityChats';
import { canDeleteChatMessage, canDeleteDirectChat, canViewStaffTicketInbox, isStaffRole } from '../lib/roles';
import SupportTicketRow from './SupportTicketRow';
import type { SupportTicketLastMessage } from '../lib/supportChat';
import { useConfirm } from '../contexts/ConfirmContext';
import ChatSupportSection, { type ChatSupportView } from './ChatSupportSection';
import ChatSectionEmptyState from './ChatSectionEmptyState';
import ChatFeedbackSection, { type ChatFeedbackPanel } from './ChatFeedbackSection';
import ChatSidebarRow, { chatSidebarRowClass } from './ChatSidebarRow';
import PageScrollFooter from './PageScrollFooter';
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
  UserPlus,
  Globe,
  Shield,
  LifeBuoy,
  Trash2,
  Undo2,
} from 'lucide-react';
import { IN_APP } from '../siteContent';
import { formatPickupLocationMessage } from '../lib/itemLocation';
import { formatItemFulfilledChatMessage, formatTradeCompletedChatMessage } from '../lib/claims';
import {
  markItemFulfilledFromChat,
} from '../supabase';
import ChatClaimActions from './ChatClaimActions';

interface ChatSystemProps {
  userProfile: UserProfile;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  initialSupportTicketId?: string | null;
  onClearInitialSupportTicket?: () => void;
  initialChatSupportView?: 'list' | 'new' | null;
  onClearInitialChatSupportView?: () => void;
  initialChatFeedbackPanel?: ChatFeedbackPanel;
  onClearInitialChatFeedbackPanel?: () => void;
  pendingChatCompose?: PendingChatCompose | null;
  onClearPendingChatCompose?: () => void;
  items: ItemPost[];
  blockedUserIds?: Set<string>;
  className?: string;
  /** Edge-to-edge layout (mobile tab) — no outer card chrome */
  fullBleed?: boolean;
  onViewProfile?: (userId: string) => void;
  onItemsChanged?: () => void;
  onOpenGoFundMe?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  onStartDirectMessage?: () => void;
}

export default function ChatSystem({
  userProfile,
  initialSelectedChatId,
  onClearInitialChat,
  initialSupportTicketId = null,
  onClearInitialSupportTicket,
  initialChatSupportView = null,
  onClearInitialChatSupportView,
  initialChatFeedbackPanel = null,
  onClearInitialChatFeedbackPanel,
  pendingChatCompose = null,
  onClearPendingChatCompose,
  items,
  blockedUserIds = new Set(),
  className = '',
  fullBleed = false,
  onViewProfile,
  onItemsChanged,
  onOpenGoFundMe,
  onOpenPrivacy,
  onOpenTerms,
  onStartDirectMessage,
}: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([]);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [supportView, setSupportView] = useState<ChatSupportView>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportPreviews, setSupportPreviews] = useState<Record<string, SupportTicketLastMessage>>({});
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);
  const [supportOpenTicketId, setSupportOpenTicketId] = useState<string | null>(null);
  const [showAllDirectMessages, setShowAllDirectMessages] = useState(false);
  const isStaffSupportInbox = canViewStaffTicketInbox(userProfile.role);
  const CHAT_SIDEBAR_PREVIEW = 3;
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, { displayName: string; photoURL?: string }>>({});
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [unsendingMessageId, setUnsendingMessageId] = useState<string | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  const userIsStaff = isStaffRole(userProfile.role);
  const { confirm } = useConfirm();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!initialChatSupportView) return;
    setSupportView(initialChatSupportView);
    setSelectedChat(null);
    onClearInitialChatSupportView?.();
  }, [initialChatSupportView, onClearInitialChatSupportView]);

  useEffect(() => {
    if (!initialSupportTicketId) return;
    setSupportOpenTicketId(initialSupportTicketId);
    setSupportView('thread');
    setSelectedChat(null);
  }, [initialSupportTicketId]);

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
    setInputText('');
    setErrorMsg('');
  }, [selectedChat?.id]);

  useEffect(() => {
    let active = true;

    const loadChats = async () => {
      try {
        const [loadedChats, requests] = await Promise.all([
          getSupabaseChats(userProfile.uid, { userRole: userProfile.role }),
          getIncomingMessageRequests(userProfile.uid),
        ]);
        if (!active) return;

        const visibleChats = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
        visibleChats.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });

        const visibleRequests = requests.filter((r) => !blockedUserIds.has(r.fromUserId));

        setChats(visibleChats);
        setIncomingRequests(visibleRequests);
        setIsChatsLoading(false);

        if (initialSelectedChatId) {
          const target = visibleChats.find((c) => c.id === initialSelectedChatId);
          if (target) {
            setSelectedChat((prev) => prev ?? target);
            setSupportView(null);
          }
        } else if (pendingChatCompose) {
          const existing = visibleChats.find((c) => c.id === pendingChatCompose.chatId);
          if (existing) {
            setSelectedChat((prev) => prev ?? existing);
            onClearPendingChatCompose?.();
          } else {
            const c = pendingChatCompose;
            const draft: Chat = {
              id: c.chatId,
              participantIds: [userProfile.uid, c.otherUserId].sort(),
              participantNames: {
                [userProfile.uid]: userProfile.displayName,
                [c.otherUserId]: c.otherUserName,
              },
              participantPhotos: {
                [userProfile.uid]: userProfile.photoURL || '',
                [c.otherUserId]: c.otherUserPhoto || '',
              },
              lastMessageAt: '',
              itemId: c.itemId || '',
              itemTitle: c.itemTitle || '',
            };
            setSelectedChat((prev) => prev ?? draft);
            setMessages([]);
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

    const unsubRequests = subscribePostgresChanges(
      { channelName: `live-dm-requests-${userProfile.uid}`, table: 'message_requests', event: '*' },
      () => refreshChats(),
    );

    return () => {
      active = false;
      unsubChats();
      unsubMessagesForInbox();
      unsubRequests();
    };
  }, [userProfile.uid, userProfile.role, initialSelectedChatId, pendingChatCompose, blockedUserIds, onClearPendingChatCompose, userProfile.displayName, userProfile.photoURL]);

  useEffect(() => {
    if (!pendingChatCompose || initialSelectedChatId) return;
    const c = pendingChatCompose;
    const draft: Chat = {
      id: c.chatId,
      participantIds: [userProfile.uid, c.otherUserId].sort(),
      participantNames: {
        [userProfile.uid]: userProfile.displayName,
        [c.otherUserId]: c.otherUserName,
      },
      participantPhotos: {
        [userProfile.uid]: userProfile.photoURL || '',
        [c.otherUserId]: c.otherUserPhoto || '',
      },
      lastMessageAt: '',
      itemId: c.itemId || '',
      itemTitle: c.itemTitle || '',
    };
    setSelectedChat(draft);
    setMessages([]);
  }, [pendingChatCompose, initialSelectedChatId, userProfile.uid, userProfile.displayName, userProfile.photoURL]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    let active = true;
    const chatId = selectedChat.id;

    const refreshChatMeta = debounceRealtime(() => {
      void getSupabaseChats(userProfile.uid, { userRole: userProfile.role }).then((loadedChats) => {
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
        if (isCommunityChat(chatId)) {
          const ids = loadedMessages.map((m) => m.senderId);
          const info = await getUserDisplayInfoByIds(ids);
          if (active) setSenderNames(info);
        } else {
          setSenderNames({});
        }
      } catch (err) {
        console.warn('Failed to load messages from Supabase:', err);
      }
    };

    loadMessages();

    const unsubMessages = subscribePostgresChanges<Message>(
      {
        channelName: `live-messages-${chatId}`,
        table: 'messages',
        event: '*',
        filter: `chatId=eq.${chatId}`,
      },
      (payload) => {
        if (!active) return;

        if (payload.eventType === 'DELETE') {
          const removed = payload.old as Message | null;
          if (!removed?.id) return;
          setMessages((prev) => prev.filter((m) => m.id !== removed.id));
          refreshChatMeta();
          return;
        }

        if (payload.eventType !== 'INSERT') return;

        const row = payload.new as Message | null;
        if (!row?.id) return;
        // Own sends are added optimistically in sendChatText — skip to avoid duplicates.
        if (row.senderId === userProfile.uid) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
        if (isCommunityChat(chatId) && row.senderId) {
          void getUserDisplayInfoByIds([row.senderId]).then((info) => {
            if (active) setSenderNames((prev) => ({ ...prev, ...info }));
          });
        }
        refreshChatMeta();
      },
    );

    return () => {
      active = false;
      unsubMessages();
    };
  }, [selectedChat?.id, userProfile.uid, userProfile.role]);

  const ensureChatExists = async (firstMessageText: string): Promise<boolean> => {
    if (!selectedChat) return false;
    if (isCommunityChat(selectedChat.id)) return true;

    const inList = chats.some((c) => c.id === selectedChat.id);
    if (inList && !pendingChatCompose) return true;

    if (!pendingChatCompose || pendingChatCompose.chatId !== selectedChat.id) {
      return true;
    }

    const c = pendingChatCompose;
    const participants = [userProfile.uid, c.otherUserId].sort();
    const payload = {
      id: c.chatId,
      participantIds: participants,
      participantNames: {
        [userProfile.uid]: userProfile.displayName,
        [c.otherUserId]: c.otherUserName,
      },
      participantPhotos: {
        [userProfile.uid]: userProfile.photoURL || '',
        [c.otherUserId]: c.otherUserPhoto || '',
      },
      lastMessageText: firstMessageText,
      lastMessageAt: new Date().toISOString(),
      lastMessageSenderId: userProfile.uid,
      itemId: c.itemId || '',
      itemTitle: c.itemTitle || '',
    };

    const ok = await getOrCreateSupabaseChat(c.chatId, payload);
    if (!ok) return false;

    onClearPendingChatCompose?.();
    const loadedChats = await getSupabaseChats(userProfile.uid);
    const visible = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
    visible.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return timeB - timeA;
    });
    setChats(visible);
    const created = visible.find((chat) => chat.id === c.chatId);
    if (created) setSelectedChat(created);
    return true;
  };

  const handleDeleteChat = async (linkedItem?: ItemPost) => {
    if (!selectedChat || deletingChat || isCommunityChat(selectedChat.id)) return;
    const listingContext = linkedItem
      ? { userId: linkedItem.userId, status: linkedItem.status }
      : null;
    if (!canDeleteDirectChat(userProfile, selectedChat, listingContext)) return;

    const isPostChat = Boolean(selectedChat.itemId?.trim());
    const confirmed = await confirm({
      message: isPostChat
        ? 'Delete this post chat for both neighbors? The listing thread will be removed from Messages.'
        : 'Delete this conversation for both neighbors? You will need to send a new message request to chat again.',
      confirmLabel: 'Delete conversation',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeletingChat(true);
    setErrorMsg('');
    const chatId = selectedChat.id;
    const result = await deleteSupabaseDirectChat(chatId, userProfile);
    setDeletingChat(false);

    if (!result.ok) {
      setErrorMsg(result.errorMessage || 'Could not delete conversation.');
      return;
    }

    setSelectedChat(null);
    setMessages([]);
    onClearPendingChatCompose?.();
    const loadedChats = await getSupabaseChats(userProfile.uid, { userRole: userProfile.role });
    const visible = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
    setChats(visible);
  };

  const restoreUnsentMessageToInput = (text: string) => {
    setInputText(text);
    requestAnimationFrame(() => {
      const input = messageInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(0, text.length);
    });
  };

  const handleUnsendMessage = async (message: Message) => {
    if (!selectedChat || unsendingMessageId) return;
    if (message.senderId !== userProfile.uid) return;
    if (!canDeleteChatMessage(userProfile, message, selectedChat.id)) return;

    setUnsendingMessageId(message.id);
    setErrorMsg('');

    const previousMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const result = await deleteSupabaseMessage(message.id, selectedChat.id, userProfile);
    if (!result.ok) {
      setMessages(previousMessages);
      setErrorMsg(result.errorMessage || 'Could not unsend message.');
    } else {
      restoreUnsentMessageToInput(message.text);
      const loadedChats = await getSupabaseChats(userProfile.uid, { userRole: userProfile.role });
      const visible = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
      setChats(visible);
      setSelectedChat((prev) => {
        if (!prev) return prev;
        return visible.find((c) => c.id === prev.id) ?? prev;
      });
    }

    setUnsendingMessageId(null);
  };

  const handleRemoveMessage = async (message: Message) => {
    if (!selectedChat || unsendingMessageId) return;
    if (!canDeleteChatMessage(userProfile, message, selectedChat.id)) return;
    if (message.senderId === userProfile.uid) return;

    const confirmed = await confirm({
      message: 'Remove this message from community chat?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;

    setUnsendingMessageId(message.id);
    setErrorMsg('');

    const previousMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const result = await deleteSupabaseMessage(message.id, selectedChat.id, userProfile);
    if (!result.ok) {
      setMessages(previousMessages);
      setErrorMsg(result.errorMessage || 'Could not remove message.');
    } else {
      const loadedChats = await getSupabaseChats(userProfile.uid, { userRole: userProfile.role });
      const visible = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
      setChats(visible);
      setSelectedChat((prev) => {
        if (!prev) return prev;
        return visible.find((c) => c.id === prev.id) ?? prev;
      });
    }

    setUnsendingMessageId(null);
  };

  const sendChatText = async (text: string) => {
    if (!selectedChat || !text.trim() || isSending) return false;
    if (isStaffCommunityChat(selectedChat.id) && !userIsStaff) {
      setErrorMsg('Staff chat is for team members only.');
      return false;
    }

    setIsSending(true);
    setErrorMsg('');
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const trimmed = text.trim();

    const chatReady = await ensureChatExists(trimmed);
    if (!chatReady) {
      setIsSending(false);
      setErrorMsg('Could not start conversation. Please try again.');
      return false;
    }
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

    const confirmed = await confirm({
      message: `Mark this request as fulfilled with help from ${helperName}? They get credit for giving an item, and you get +1 Items claimed.`,
      confirmLabel: 'Mark fulfilled',
    });
    if (!confirmed) return;

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

  const handleMarkTraded = async () => {
    if (!selectedChat) return;
    const linkedItem = items.find((i) => i.id === selectedChat.itemId);
    if (!linkedItem || linkedItem.userId !== userProfile.uid || linkedItem.type !== 'trade') return;

    const partnerUserId = selectedChat.participantIds.find((id) => id !== userProfile.uid);
    if (!partnerUserId) {
      setErrorMsg('Could not identify your trade partner in this chat.');
      return;
    }

    const partnerName =
      selectedChat.participantNames[partnerUserId] || getRecipientInfo(selectedChat).otherName;

    const confirmed = await confirm({
      message: `Mark this trade as completed with ${partnerName}?`,
      confirmLabel: 'Mark traded',
    });
    if (!confirmed) return;

    setIsSending(true);
    setErrorMsg('');
    const statusOk = await updateSupabaseItemStatus(linkedItem.id, 'completed', userProfile.uid);
    setIsSending(false);

    if (statusOk) {
      await sendChatText(formatTradeCompletedChatMessage(linkedItem.title, partnerName));
      onItemsChanged?.();
    } else {
      setErrorMsg('Could not mark trade as completed.');
    }
  };

  const handleMarkPendingPickup = async () => {
    if (!selectedChat) return;
    const linkedItem = items.find((i) => i.id === selectedChat.itemId);
    if (!linkedItem || linkedItem.userId !== userProfile.uid) return;

    setIsSending(true);
    setErrorMsg('');
    const statusOk = await updateSupabaseItemStatus(linkedItem.id, 'pending_pickup', userProfile.uid);
    setIsSending(false);
    if (statusOk) {
      await sendChatText('Marked this listing as pending pickup.');
      onItemsChanged?.();
    } else {
      setErrorMsg('Could not set listing to pending pickup.');
    }
  };

  const handleRequestHold = async () => {
    await sendChatText('Could you place this on hold for me? I can confirm pickup timing shortly.');
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

  const selectChat = (chat: Chat) => {
    setSelectedChat(chat);
    setSupportView(null);
    onClearInitialChat();
  };

  const reloadSupportTickets = useCallback(async () => {
    setSupportTicketsLoading(true);
    const rows = isStaffSupportInbox
      ? await getSupportTicketsForStaff(userProfile)
      : await getSupportTicketsForUser(userProfile.uid);
    setSupportTickets(rows);
    const previews = await getSupportTicketLastMessages(rows.map((ticket) => ticket.id));
    setSupportPreviews(previews);
    setSupportTicketsLoading(false);
  }, [isStaffSupportInbox, userProfile]);

  useEffect(() => {
    void reloadSupportTickets();
  }, [reloadSupportTickets]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reloadSupportTickets();
    }, 150);

    const unsubs = isStaffSupportInbox
      ? [
          subscribePostgresChanges(
            { channelName: `chat-sidebar-staff-tickets-${userProfile.uid}`, table: 'support_tickets', event: '*' },
            refresh,
          ),
          subscribePostgresChanges(
            {
              channelName: `chat-sidebar-staff-ticket-msgs-${userProfile.uid}`,
              table: 'support_ticket_messages',
              event: '*',
            },
            refresh,
          ),
        ]
      : [
          subscribePostgresChanges(
            {
              channelName: `chat-sidebar-support-tickets-${userProfile.uid}`,
              table: 'support_tickets',
              event: '*',
              filter: `openerUserId=eq.${userProfile.uid}`,
            },
            refresh,
          ),
          subscribePostgresChanges(
            {
              channelName: `chat-sidebar-support-msgs-${userProfile.uid}`,
              table: 'support_ticket_messages',
              event: '*',
            },
            refresh,
          ),
        ];

    return () => unsubs.forEach((u) => u());
  }, [userProfile.uid, isStaffSupportInbox, reloadSupportTickets]);

  const openSupport = (view: ChatSupportView) => {
    setSupportView(view);
    setSelectedChat(null);
    onClearInitialChat();
    onClearPendingChatCompose?.();
    if (!view) {
      setSupportOpenTicketId(null);
    }
  };

  const openSupportTicket = (ticketId: string) => {
    setSupportOpenTicketId(ticketId);
    openSupport('thread');
  };

  const communityChats = chats.filter((c) => isCommunityChat(c.id));
  const directChats = chats.filter((c) => !isCommunityChat(c.id));
  const previewSupportTickets = supportTickets.slice(0, CHAT_SIDEBAR_PREVIEW);
  const hasMoreSupportTickets = supportTickets.length > CHAT_SIDEBAR_PREVIEW;
  const visibleDirectChats = showAllDirectMessages
    ? directChats
    : directChats.slice(0, CHAT_SIDEBAR_PREVIEW);
  const hasMoreDirectChats = directChats.length > CHAT_SIDEBAR_PREVIEW && !showAllDirectMessages;

  const getFormattedChatTitle = (chat: Chat) => {
    if (isCommunityChat(chat.id)) return communityChatTitle(chat.id);
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

  const handleAcceptRequest = async (request: MessageRequest) => {
    setRequestBusyId(request.id);
    setErrorMsg('');
    try {
      const result = await acceptMessageRequest(request.id, userProfile);
      if (!result.ok) {
        setErrorMsg(result.errorMessage || 'Could not accept request.');
        return;
      }
      const loadedChats = await getSupabaseChats(userProfile.uid, { userRole: userProfile.role });
      const visible = filterChatsByBlocked(loadedChats, userProfile.uid, blockedUserIds);
      visible.sort((a, b) => {
        const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return timeB - timeA;
      });
      setChats(visible);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
      if (result.chatId) {
        const target = visible.find((c) => c.id === result.chatId);
        if (target) setSelectedChat(target);
      }
    } finally {
      setRequestBusyId(null);
    }
  };

  const handleDeclineRequest = async (request: MessageRequest) => {
    setRequestBusyId(request.id);
    setErrorMsg('');
    try {
      const result = await declineMessageRequest(request.id, userProfile.uid);
      if (!result.ok) {
        setErrorMsg(result.errorMessage || 'Could not decline request.');
        return;
      }
      setIncomingRequests((prev) => prev.filter((r) => r.id !== request.id));
    } finally {
      setRequestBusyId(null);
    }
  };

  const messageBubbleClass = (isUser: boolean) =>
    [
      'max-w-[min(85%,20rem)] sm:max-w-[min(75%,24rem)] px-3.5 py-2 text-sm rounded-2xl shadow-sm',
      isUser
        ? 'bg-accent text-on-accent rounded-br-md'
        : 'bg-surface border border-app text-app rounded-bl-md',
    ].join(' ');

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
          selectedChat || supportView ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex-1 min-h-0 overflow-y-auto" id="chat_rooms_scrollable">
          {incomingRequests.length > 0 && (
            <div className="border-b border-app">
              <div className="px-4 py-2 flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wide">
                <UserPlus className="w-3.5 h-3.5" />
                Message requests
              </div>
              {incomingRequests.map((request) => {
                const busy = requestBusyId === request.id;
                const photo =
                  request.fromUserPhoto ||
                  `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(request.fromUserName)}`;
                return (
                  <div
                    key={request.id}
                    className="w-full p-3 flex flex-col gap-2 border-b border-app bg-surface/50"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onViewProfile?.(request.fromUserId)}
                        className="shrink-0 rounded-full"
                      >
                        <img
                          src={photo}
                          referrerPolicy="no-referrer"
                          alt=""
                          className="w-10 h-10 rounded-full border border-app object-cover"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-app truncate">{request.fromUserName}</p>
                        {request.message ? (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">{request.message}</p>
                        ) : (
                          <p className="text-xs text-muted mt-0.5 italic">Wants to message you</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleAcceptRequest(request)}
                        className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDeclineRequest(request)}
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-b border-app">
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Direct messages
            </div>

            <ChatSidebarRow
              id="chat_row_start_dm"
              icon={UserPlus}
              iconClassName="bg-accent-soft text-accent"
              title="Start conversation"
              subtitle="Message a neighbor"
              preview="Browse Stuff and tap Message on a listing, or message from a neighbor profile."
              onClick={() => onStartDirectMessage?.()}
            />

            {isChatsLoading ? (
              <p className="text-xs text-muted text-center px-4 py-6">Loading conversations…</p>
            ) : directChats.length === 0 && incomingRequests.length === 0 ? (
              <ChatSectionEmptyState
                icon={MessageSquare}
                title="No direct messages yet"
                description="Start conversation above, or message a neighbor from a listing."
              />
            ) : (
              <>
                {visibleDirectChats.map((chat) => {
                  const { otherId, otherPhoto } = getRecipientInfo(chat);
                  const isSelected = selectedChat?.id === chat.id && !supportView;
                  const displayTitle = getFormattedChatTitle(chat);

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      id={`chat_row_${chat.id}`}
                      onClick={() => selectChat(chat)}
                      className={chatSidebarRowClass(isSelected)}
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
                })}
                {hasMoreDirectChats ? (
                  <button
                    type="button"
                    onClick={() => setShowAllDirectMessages(true)}
                    className="w-full px-4 py-2.5 text-[11px] font-semibold text-accent hover:bg-inset text-left border-t border-app/60"
                  >
                    View all {directChats.length} direct messages
                  </button>
                ) : showAllDirectMessages && directChats.length > CHAT_SIDEBAR_PREVIEW ? (
                  <button
                    type="button"
                    onClick={() => setShowAllDirectMessages(false)}
                    className="w-full px-4 py-2.5 text-[11px] font-semibold text-muted hover:bg-inset text-left border-t border-app/60"
                  >
                    Show fewer
                  </button>
                ) : null}
              </>
            )}
          </div>

          {communityChats.length > 0 && (
            <div className="border-b border-app">
              <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide">
                {GROUP_CHATS_SECTION_LABEL}
              </div>
              {communityChats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id && !supportView;
                const isGlobal = isGlobalCommunityChat(chat.id);
                return (
                  <button
                    key={chat.id}
                    type="button"
                    id={`chat_row_${chat.id}`}
                    onClick={() => selectChat(chat)}
                    className={chatSidebarRowClass(isSelected)}
                  >
                    <span
                      className={`shrink-0 w-10 h-10 rounded-full border border-app flex items-center justify-center ${
                        isGlobal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-violet-500/10 text-violet-500'
                      }`}
                    >
                      {isGlobal ? <Globe className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-app truncate">
                          {communityChatTitle(chat.id)}
                        </p>
                        {chat.lastMessageAt && (
                          <span className="text-[10px] text-subtle shrink-0">
                            {formatTime(chat.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted mt-0.5">{communityChatSubtitle(chat.id)}</p>
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        {chat.lastMessageText || 'Say hello'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-b border-app">
            <div className="px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-2">
              <LifeBuoy className="w-3.5 h-3.5" />
              {isStaffSupportInbox ? 'Support inbox' : 'Support'}
            </div>
            {!isStaffSupportInbox ? (
              <ChatSidebarRow
                id="chat_row_new_support"
                icon={LifeBuoy}
                iconClassName="bg-sky-500/10 text-sky-400"
                title="Open new support chat"
                subtitle="Two-way chat with staff"
                preview="Ask for help — staff will reply in this thread."
                selected={supportView === 'new'}
                onClick={() => openSupport('new')}
              />
            ) : null}
            {supportTicketsLoading ? (
              <p className="text-xs text-muted text-center px-4 py-6">Loading…</p>
            ) : supportTickets.length === 0 ? (
              <ChatSectionEmptyState
                icon={LifeBuoy}
                title={isStaffSupportInbox ? 'Inbox is clear' : 'No conversations yet'}
                description={
                  isStaffSupportInbox
                    ? 'When neighbors open tickets, they will appear here.'
                    : 'Open new support chat above to talk with staff.'
                }
              />
            ) : (
              <>
                <ul>
                  {previewSupportTickets.map((ticket) => (
                    <li key={ticket.id}>
                      <SupportTicketRow
                        ticket={ticket}
                        preview={supportPreviews[ticket.id]}
                        selected={!!supportView && supportOpenTicketId === ticket.id}
                        showOpener={isStaffSupportInbox}
                        onClick={() => openSupportTicket(ticket.id)}
                      />
                    </li>
                  ))}
                </ul>
                {hasMoreSupportTickets ? (
                  <button
                    type="button"
                    onClick={() => openSupport('list')}
                    className="w-full px-4 py-2.5 text-[11px] font-semibold text-accent hover:bg-inset text-left border-t border-app/60"
                  >
                    View all {supportTickets.length}{' '}
                    {isStaffSupportInbox ? 'support conversations' : 'support tickets'}
                  </button>
                ) : null}
              </>
            )}
          </div>

          <ChatFeedbackSection
            userProfile={userProfile}
            initialPanel={initialChatFeedbackPanel}
            onClearInitialPanel={onClearInitialChatFeedbackPanel}
          />
          {fullBleed && !selectedChat && !supportView && (
            <PageScrollFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />
          )}
        </div>
      </div>

      {/* Active thread */}
      <div
        id="conversations_body_viewport"
        className={`flex-1 flex flex-col min-h-0 min-w-0 bg-app ${
          !selectedChat && !supportView ? 'hidden md:flex' : 'flex'
        }`}
      >
        {supportView ? (
          <ChatSupportSection
            user={userProfile}
            view={supportView}
            onViewChange={openSupport}
            onBackToChat={() => setSupportView(null)}
            onOpenGoFundMe={onOpenGoFundMe}
            onOpenPrivacy={onOpenPrivacy}
            onOpenTerms={onOpenTerms}
            initialTicketId={supportOpenTicketId ?? initialSupportTicketId}
            onClearInitialTicketId={() => {
              setSupportOpenTicketId(null);
              onClearInitialSupportTicket?.();
            }}
            className="h-full"
          />
        ) : selectedChat ? (
          (() => {
            const isCommunity = isCommunityChat(selectedChat.id);
            const linkedItem = isCommunity ? undefined : items.find((i) => i.id === selectedChat.itemId);
            const isChatDisabled =
              !isCommunity &&
              linkedItem &&
              (linkedItem.status === 'completed' || linkedItem.status === 'withdrawn');
            const displayTitleHeader = getFormattedChatTitle(selectedChat);
            const { otherName, otherPhoto } = isCommunity
              ? { otherName: communityChatTitle(selectedChat.id), otherPhoto: '' }
              : getRecipientInfo(selectedChat);
            const isListingOwner = linkedItem?.userId === userProfile.uid;
            const showSendLocationBtn = !!linkedItem && !isChatDisabled && isListingOwner;
            const showMarkPendingPickupBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              linkedItem.type === 'giveaway' &&
              linkedItem.status === 'active';
            const showRequestHoldBtn =
              !!linkedItem && !isChatDisabled && !isListingOwner && linkedItem.status === 'active';

            const showMarkTradedBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              linkedItem.type === 'trade' &&
              linkedItem.status === 'active';

            const showMarkClaimedBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              linkedItem.type === 'giveaway' &&
              linkedItem.status === 'active';

            const claimerUserId = selectedChat.participantIds.find((id) => id !== userProfile.uid);

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
                      setSupportView(null);
                      onClearInitialChat();
                      onClearPendingChatCompose?.();
                    }}
                    className="p-2 rounded-full text-muted hover:text-app hover:bg-inset md:hidden shrink-0 cursor-pointer"
                    aria-label="Back to conversations"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {isCommunity ? (
                    <span
                      className={`shrink-0 w-10 h-10 rounded-full border border-app flex items-center justify-center ${
                        isGlobalCommunityChat(selectedChat.id)
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-violet-500/10 text-violet-500'
                      }`}
                    >
                      {isGlobalCommunityChat(selectedChat.id) ? (
                        <Globe className="w-5 h-5" />
                      ) : (
                        <Shield className="w-5 h-5" />
                      )}
                    </span>
                  ) : (
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
                  )}

                  <div className="min-w-0 flex-1">
                    {isCommunity ? (
                      <>
                        <p className="font-display font-semibold text-sm text-app truncate">
                          {displayTitleHeader}
                        </p>
                        <p className="text-xs text-muted mt-0.5">{communityChatSubtitle(selectedChat.id)}</p>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {!isCommunity && canDeleteDirectChat(userProfile, selectedChat, linkedItem ?? null) ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteChat(linkedItem)}
                      disabled={deletingChat}
                      className="p-2 rounded-full text-muted hover:text-red-400 hover:bg-inset shrink-0 disabled:opacity-50"
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </header>

                <div
                  className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-2"
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
                      const senderInfo = senderNames[msg.senderId];
                      const senderLabel = senderInfo?.displayName || 'Neighbor';
                      const canDelete = canDeleteChatMessage(userProfile, msg, selectedChat.id);
                      const isUnsending = unsendingMessageId === msg.id;
                      const showUnsend = isUser && canDelete;
                      const showStaffRemove = !isUser && canDelete;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                          id={`message_item_${msg.id}`}
                        >
                          {isCommunity && !isUser && (
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(msg.senderId)}
                              className="text-[10px] font-semibold text-muted mb-0.5 px-1 hover:text-accent"
                            >
                              {senderLabel}
                            </button>
                          )}
                          <div className={messageBubbleClass(isUser)}>
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <div
                              className={`flex items-center gap-1 mt-1 ${
                                isUser ? 'justify-end' : 'justify-between'
                              }`}
                            >
                              {showUnsend && (
                                <button
                                  type="button"
                                  onClick={() => void handleUnsendMessage(msg)}
                                  disabled={isUnsending}
                                  className="p-1 rounded-full shrink-0 disabled:opacity-50 text-white/75 hover:text-white hover:bg-white/15"
                                  title="Unsend and edit"
                                  aria-label="Unsend and edit"
                                >
                                  <Undo2 className="w-3 h-3" />
                                </button>
                              )}
                              {showStaffRemove && (
                                <button
                                  type="button"
                                  onClick={() => void handleRemoveMessage(msg)}
                                  disabled={isUnsending}
                                  className="p-1 rounded-full shrink-0 disabled:opacity-50 text-subtle hover:text-red-400 hover:bg-red-500/10"
                                  title="Remove message"
                                  aria-label="Remove message"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                              <span
                                className={`text-[10px] ${isUser ? 'text-white/75' : 'text-subtle'}`}
                              >
                                {formatTime(msg.createdAt) || 'Sending…'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 p-3 sm:p-4 bg-surface border-t border-app flex flex-col gap-2 sbn-input-tray"
                  id="input_tray"
                >
                  {!isCommunity && showSendLocationBtn && (
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
                  {!isCommunity && showMarkPendingPickupBtn && (
                    <button
                      type="button"
                      onClick={handleMarkPendingPickup}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_mark_pending_pickup_btn"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark pending pickup
                    </button>
                  )}
                  {!isCommunity && showRequestHoldBtn && (
                    <button
                      type="button"
                      onClick={handleRequestHold}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_request_hold_btn"
                    >
                      Request hold
                    </button>
                  )}
                  {!isCommunity && showMarkClaimedBtn && claimerUserId && (
                    <ChatClaimActions
                      chatId={selectedChat.id}
                      linkedItem={linkedItem}
                      viewer={userProfile}
                      claimerUserId={claimerUserId}
                      disabled={isSending}
                      onChanged={() => {
                        onItemsChanged?.();
                        void getSupabaseMessages(selectedChat.id).then(setMessages);
                      }}
                    />
                  )}
                  {!isCommunity && showMarkTradedBtn && (
                    <button
                      type="button"
                      onClick={handleMarkTraded}
                      disabled={isSending}
                      className="w-full sbn-btn sbn-btn-secondary sbn-btn-sm justify-center"
                      id="chat_mark_traded_btn"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark trade completed
                    </button>
                  )}
                  {!isCommunity && showMarkFulfilledBtn && (
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
                      <span>This listing is closed — chat is read-only.</span>
                    </div>
                  )}
                  <div className="flex items-end gap-2 w-full">
                    <input
                      type="text"
                      id="message_input_box"
                      ref={messageInputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={scrollToBottom}
                      placeholder={
                        isStaffCommunityChat(selectedChat.id) && !userIsStaff
                          ? 'Staff only'
                          : isChatDisabled
                            ? 'This chat is read-only'
                            : isCommunity
                              ? 'Message everyone…'
                              : 'Type a message…'
                      }
                      maxLength={2000}
                      required
                      disabled={
                        !!isChatDisabled ||
                        (isStaffCommunityChat(selectedChat.id) && !userIsStaff)
                      }
                      className="sbn-input flex-1 min-w-0 text-sm py-2.5 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      id="message_send_btn"
                      disabled={
                        !inputText.trim() ||
                        isSending ||
                        !!isChatDisabled ||
                        (isStaffCommunityChat(selectedChat.id) && !userIsStaff)
                      }
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
