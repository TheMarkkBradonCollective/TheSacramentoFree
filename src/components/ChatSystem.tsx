import { useBrowseOnly } from '../contexts/BrowseOnlyContext';

import { Chat, Message, UserProfile, ItemPost, MessageRequest, PendingChatCompose, SupportTicket } from '../types';
import {
  getSupabaseChats,
  getSupabaseChatById,
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
} from '../lib/communityChats';
import { canDeleteChatMessage, canDeleteDirectChat, canViewStaffReports, canViewStaffTicketInbox, isStaffRole } from '../lib/roles';
import { useStaffUserReports } from '../hooks/useStaffUserReports';
import type { SupportTicketLastMessage } from '../lib/supportChat';
import { useConfirm } from '../contexts/ConfirmContext';
import ChatSupportSection, { type ChatSupportView } from './ChatSupportSection';
import ChatFeedbackSection, { type ChatFeedbackPanel } from './ChatFeedbackSection';
import ChatInboxHeader from './ChatInboxHeader';
import ChatInboxList from './ChatInboxList';
import { buildInboxEntries } from '../lib/chatInbox';
import {
  getMessageGroupMeta,
  messageBubbleClass,
  messageGroupSpacing,
} from '../lib/chatMessageLayout';
import PageScrollFooter from './PageScrollFooter';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { PresenceUserAvatar } from './UserAvatar';
import { useTrackPresence } from '../contexts/PresenceContext';
import {
  MessageSquare,
  Send,
  AlertCircle,
  MapPin,
  Gift,
  ChevronLeft,
  Navigation,
  CheckCircle,
  Globe,
  Shield,
  Trash2,
  Undo2,
} from 'lucide-react';
import { formatPickupLocationMessage } from '../lib/itemLocation';
import { formatItemFulfilledChatMessage, formatTradeCompletedChatMessage } from '../lib/claims';
import {
  markItemFulfilledFromChat,
} from '../supabase';
import ChatClaimActions from './ChatClaimActions';
import { createGoGetSession, getActiveGoGetSession } from '../lib/goGetSessions';
import { confirmGoGetAsFulfiller } from './goget/goGetSafetyConfirm';
import { getChatCoordinationLabel } from '../lib/listingMapActions';
import { getItemMapDestination } from '../lib/itemLocation';
import type { GoGetSession } from '../types';
import { getLastLiveLatLng } from '../lib/liveGeolocation';
import { Navigation2 } from 'lucide-react';
import RoleBadge from './RoleBadge';
import { isStaffRole as isSenderStaff } from '../lib/roles';

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
  const browseOnly = useBrowseOnly();
  const [chats, setChats] = useState<Chat[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([]);
  const [requestBusyId, setRequestBusyId] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chatGoGetSession, setChatGoGetSession] = useState<GoGetSession | null>(null);
  const [startingGoGet, setStartingGoGet] = useState(false);
  const [supportView, setSupportView] = useState<ChatSupportView>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportPreviews, setSupportPreviews] = useState<Record<string, SupportTicketLastMessage>>({});
  const [supportTicketsLoading, setSupportTicketsLoading] = useState(false);
  const [supportOpenTicketId, setSupportOpenTicketId] = useState<string | null>(null);
  const [feedbackPanel, setFeedbackPanel] = useState<ChatFeedbackPanel>(null);
  const isStaffSupportInbox = canViewStaffTicketInbox(userProfile.role);
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, { displayName: string; photoURL?: string; role?: import('../types').UserProfile['role'] }>>({});
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [unsendingMessageId, setUnsendingMessageId] = useState<string | null>(null);
  const [deletingChat, setDeletingChat] = useState(false);
  const userIsStaff = isStaffRole(userProfile.role);
  const canStaffReports = canViewStaffReports(userProfile.role);
  const { reports: staffReports } = useStaffUserReports(canStaffReports, userProfile);
  const newStaffReportCount = staffReports.filter((report) => report.status === 'new').length;
  const { confirm, alert } = useConfirm();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setChatGoGetSession(null);
    if (!selectedChat || isCommunityChat(selectedChat.id)) return;
    const linkedItem = items.find((i) => i.id === selectedChat.itemId);
    if (!linkedItem || (linkedItem.type !== 'looking' && linkedItem.type !== 'trade')) return;
    let cancelled = false;
    void getActiveGoGetSession(linkedItem.id, userProfile.uid).then((s) => {
      if (!cancelled) setChatGoGetSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedChat?.id, selectedChat?.itemId, items, userProfile.uid]);

  useEffect(() => {
    if (!selectedChat || isCommunityChat(selectedChat.id)) return;
    const otherId = selectedChat.participantIds.find((id) => id !== userProfile.uid);
    if (otherId && blockedUserIds.has(otherId)) {
      setSelectedChat(null);
      setMessages([]);
    }
  }, [blockedUserIds, selectedChat, userProfile.uid]);

  useEffect(() => {
    if (!pendingChatCompose) return;
    if (blockedUserIds.has(pendingChatCompose.otherUserId)) {
      onClearPendingChatCompose?.();
      setSelectedChat(null);
    }
  }, [blockedUserIds, pendingChatCompose, onClearPendingChatCompose]);

  const handleStartGoGetFromChat = useCallback(
    async (linkedItem: ItemPost, otherUserId: string, otherUserName: string) => {
      const myLocation = getLastLiveLatLng();
      if (!myLocation) {
        setErrorMsg('Enable location to coordinate pickup.');
        return;
      }
      const isLooking = linkedItem.type === 'looking';
      const isTrade = linkedItem.type === 'trade';
      const dropOffDestination = getItemMapDestination(linkedItem, linkedItem.userId) ?? myLocation;
      const { ensureGoGetAllowed } = await import('../lib/goGetEligibility');
      const allowed = await ensureGoGetAllowed({
        self: userProfile,
        otherUserId,
        otherDisplayName: otherUserName,
        alert,
      });
      if (!allowed) return;
      const confirmed = await confirmGoGetAsFulfiller(
        confirm,
        otherUserName,
        linkedItem.title,
        isTrade ? 'trade' : 'looking',
      );
      if (!confirmed) return;
      setStartingGoGet(true);
      setErrorMsg('');
      // Keep roles aligned with listing/map: listing poster = fulfiller (waits),
      // the other neighbor = requester (navigates). Looking responders and trade
      // claimers are always the navigator.
      const posterIsMe = linkedItem.userId === userProfile.uid;
      const fulfillerUserId = linkedItem.userId;
      const fulfillerName = posterIsMe ? userProfile.displayName : otherUserName;
      const requesterUserId = posterIsMe ? otherUserId : userProfile.uid;
      const requesterName = posterIsMe ? otherUserName : userProfile.displayName;
      const result = await createGoGetSession({
        item: linkedItem,
        fulfillerUserId,
        fulfillerName,
        requesterUserId,
        requesterName,
        destination: dropOffDestination,
        destinationLabel: isLooking
          ? `${fulfillerName}'s area`
          : `Meetup: ${linkedItem.title}`,
      });
      setStartingGoGet(false);
      if (!result.ok || !result.session) {
        setErrorMsg(
          result.errorMessage ||
            (isLooking ? 'Could not start drop off.' : 'Could not start meet up.'),
        );
        return;
      }
      setChatGoGetSession(result.session);
      const navigatorName = requesterName;
      await createSupabaseMessage(
        selectedChat!.id,
        isLooking
          ? `📦 ${navigatorName} is dropping off "${linkedItem.title}" — heading to ${fulfillerName}'s area. Open the listing to follow along.`
          : `🔁 ${navigatorName} is heading to the meetup spot for "${linkedItem.title}". Open the listing to follow along.`,
        userProfile.uid,
        `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        { skipPush: true },
      );
      void getSupabaseMessages(selectedChat!.id).then(setMessages);
    },
    [alert, confirm, userProfile, selectedChat],
  );

  useEffect(() => {
    if (!initialChatSupportView) return;
    if (initialChatSupportView === 'list') {
      onClearInitialChatSupportView?.();
      return;
    }
    setSupportView(initialChatSupportView);
    setSelectedChat(null);
    onClearInitialChatSupportView?.();
  }, [initialChatSupportView, onClearInitialChatSupportView]);

  useEffect(() => {
    if (!initialChatFeedbackPanel) return;
    setFeedbackPanel(initialChatFeedbackPanel);
    onClearInitialChatFeedbackPanel?.();
  }, [initialChatFeedbackPanel, onClearInitialChatFeedbackPanel]);

  useEffect(() => {
    if (!initialSupportTicketId) return;
    setSupportOpenTicketId(initialSupportTicketId);
    setSupportView('thread');
    setSelectedChat(null);
    onClearInitialSupportTicket?.();
  }, [initialSupportTicketId, onClearInitialSupportTicket]);

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
          let target = visibleChats.find((c) => c.id === initialSelectedChatId);
          if (!target && isStaffRole(userProfile.role)) {
            const fetched = await getSupabaseChatById(initialSelectedChatId);
            if (fetched) {
              target = fetched;
              if (!isCommunityChat(fetched.id)) {
                setChats((prev) => (prev.some((c) => c.id === fetched.id) ? prev : [fetched, ...prev]));
              }
            }
          }
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

  const presenceUids = useMemo(() => {
    const ids = new Set<string>();
    for (const chat of chats) {
      if (isCommunityChat(chat.id)) continue;
      const otherId = chat.participantIds.find((id) => id !== userProfile.uid);
      if (otherId) ids.add(otherId);
    }
    for (const request of incomingRequests) ids.add(request.fromUserId);
    return [...ids];
  }, [chats, incomingRequests, userProfile.uid]);
  useTrackPresence(presenceUids);

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
    const nextView = view === 'list' ? null : view;
    setSupportView(nextView);
    setSelectedChat(null);
    onClearInitialChat();
    onClearPendingChatCompose?.();
    if (!nextView) {
      setSupportOpenTicketId(null);
    }
  };

  const openSupportTicket = (ticketId: string) => {
    setSupportOpenTicketId(ticketId);
    openSupport('thread');
  };

  const directChats = chats.filter((c) => !isCommunityChat(c.id));

  const inboxEntries = useMemo(
    () =>
      buildInboxEntries({
        chats,
        supportTickets,
        supportPreviews,
        incomingRequests,
      }),
    [chats, supportTickets, supportPreviews, incomingRequests],
  );

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

  return (
    <div
      id="chat_app_viewport"
      className={`flex h-full min-h-0 w-full overflow-hidden text-app ${className} ${
        fullBleed ? 'bg-app rounded-none border-0' : 'sbn-card overflow-hidden shadow-sm'
      }`}
    >
      {/* Conversation list */}
      <div
        id="chats_sidebar"
        className={`flex flex-col min-h-0 shrink-0 w-full md:w-80 lg:w-[22rem] md:border-r md:border-app/30 ${
          fullBleed ? 'bg-app' : 'bg-surface/80'
        } ${selectedChat || supportView ? 'hidden md:flex' : 'flex'}`}
      >
        <ChatInboxHeader
          userProfile={userProfile}
          onStartConversation={onStartDirectMessage}
          onNewSupport={!isStaffSupportInbox ? () => openSupport('new') : undefined}
          onOpenFeedbackPanel={setFeedbackPanel}
          staffReportCount={newStaffReportCount}
        />
        <div className="flex-1 min-h-0 overflow-y-auto" id="chat_rooms_scrollable">
          <ChatInboxList
            entries={inboxEntries}
            loading={isChatsLoading || supportTicketsLoading}
            isStaffSupportInbox={isStaffSupportInbox}
            selectedChatId={selectedChat?.id ?? null}
            supportOpenTicketId={supportOpenTicketId}
            supportActive={!!supportView}
            requestBusyId={requestBusyId}
            getFormattedChatTitle={getFormattedChatTitle}
            getRecipientInfo={getRecipientInfo}
            formatTime={formatTime}
            onViewProfile={onViewProfile}
            onSelectChat={selectChat}
            onOpenSupportTicket={openSupportTicket}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
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

            // Looking/Trade: only the non-poster starts coordination so they become the
            // navigator (requester). Poster waits as fulfiller — same as listing/map.
            const showStartGoGetBtn =
              !!linkedItem &&
              !isChatDisabled &&
              linkedItem.status === 'active' &&
              !isListingOwner &&
              (linkedItem.type === 'looking' || linkedItem.type === 'trade') &&
              !chatGoGetSession;

            return (
              <>
                <header
                  className="shrink-0 px-3 sm:px-4 py-3 chat-thread-header flex items-center gap-3"
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
                      <PresenceUserAvatar
                        uid={getRecipientInfo(selectedChat).otherId}
                        src={otherPhoto}
                        name={displayTitleHeader}
                        size="md"
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
                  className="chat-thread-bg flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4"
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
                    <div className="flex justify-center py-10 px-4">
                      <div className="chat-empty-card">
                        <MessageSquare className="w-8 h-8 text-accent mx-auto mb-2" />
                        <p className="text-sm font-display font-semibold text-app">Start the conversation</p>
                        <p className="text-xs text-muted mt-1.5 leading-relaxed">
                          Say hello to coordinate pickup, ask a question, or share details.
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, index) => {
                      const isUser = msg.senderId === userProfile.uid;
                      const senderInfo = senderNames[msg.senderId];
                      const senderLabel = senderInfo?.displayName || 'Neighbor';
                      const canDelete = canDeleteChatMessage(userProfile, msg, selectedChat.id);
                      const isUnsending = unsendingMessageId === msg.id;
                      const showUnsend = isUser && canDelete;
                      const showStaffRemove = !isUser && canDelete;
                      const groupMeta = getMessageGroupMeta(messages, index, userProfile.uid, {
                        showNames: isCommunity,
                      });
                      const { otherId, otherPhoto } = isCommunity
                        ? { otherId: msg.senderId, otherPhoto: senderInfo?.photoURL }
                        : getRecipientInfo(selectedChat);

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${messageGroupSpacing(groupMeta)} ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                          id={`message_item_${msg.id}`}
                        >
                          {!isUser ? (
                            <div className="mr-2 flex w-8 shrink-0 flex-col justify-end pb-0.5">
                              {groupMeta.showAvatar ? (
                                <button
                                  type="button"
                                  onClick={() => onViewProfile?.(msg.senderId)}
                                  className="rounded-full"
                                >
                                  {isCommunity ? (
                                    <PresenceUserAvatar
                                      uid={msg.senderId}
                                      src={senderInfo?.photoURL}
                                      name={senderLabel}
                                      size="sm"
                                    />
                                  ) : (
                                    <PresenceUserAvatar
                                      uid={otherId}
                                      src={otherPhoto}
                                      name={senderLabel}
                                      size="sm"
                                    />
                                  )}
                                </button>
                              ) : (
                                <span className="w-8" aria-hidden />
                              )}
                            </div>
                          ) : null}

                          <div
                            className={`flex min-w-0 max-w-[min(85%,24rem)] flex-col ${
                              isUser ? 'items-end' : 'items-start'
                            }`}
                          >
                            {groupMeta.showSenderName && (
                              <div className="flex items-center gap-1.5 mb-0.5 px-1 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => onViewProfile?.(msg.senderId)}
                                  className="text-[10px] font-semibold text-muted hover:text-accent"
                                >
                                  {senderLabel}
                                </button>
                                {isCommunity && isSenderStaff(senderInfo?.role) && (
                                  <span className="scale-[0.75] origin-left">
                                    <RoleBadge role={senderInfo?.role} />
                                  </span>
                                )}
                              </div>
                            )}
                            <div className={messageBubbleClass(isUser, groupMeta)}>
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                              {groupMeta.isLastInGroup && (
                                <div
                                  className={`mt-1 flex items-center gap-1 ${
                                    isUser ? 'justify-end' : 'justify-between'
                                  }`}
                                >
                                  {showUnsend && (
                                    <button
                                      type="button"
                                      onClick={() => void handleUnsendMessage(msg)}
                                      disabled={isUnsending}
                                      className="shrink-0 rounded-full p-1 text-white/75 hover:bg-white/15 hover:text-white disabled:opacity-50"
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
                                      className="shrink-0 rounded-full p-1 text-subtle hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
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
                              )}
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
                  className="shrink-0 p-3 sm:px-4 sm:pb-4 chat-compose-tray flex flex-col gap-2.5 sbn-input-tray"
                  id="input_tray"
                >
                  {!isCommunity &&
                  (showSendLocationBtn ||
                    showMarkPendingPickupBtn ||
                    showRequestHoldBtn ||
                    showMarkTradedBtn ||
                    showMarkFulfilledBtn ||
                    showStartGoGetBtn) ? (
                    <div className="chat-action-chips">
                      {showSendLocationBtn ? (
                        <button
                          type="button"
                          onClick={handleSendPickupLocation}
                          disabled={isSending}
                          className="chat-action-chip"
                          id="chat_send_pickup_location_btn"
                        >
                          <Navigation className="w-3.5 h-3.5 shrink-0" />
                          Send location
                        </button>
                      ) : null}
                      {showMarkPendingPickupBtn ? (
                        <button
                          type="button"
                          onClick={handleMarkPendingPickup}
                          disabled={isSending}
                          className="chat-action-chip"
                          id="chat_mark_pending_pickup_btn"
                        >
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Pending pickup
                        </button>
                      ) : null}
                      {showRequestHoldBtn ? (
                        <button
                          type="button"
                          onClick={handleRequestHold}
                          disabled={isSending}
                          className="chat-action-chip"
                          id="chat_request_hold_btn"
                        >
                          Request hold
                        </button>
                      ) : null}
                      {showMarkTradedBtn ? (
                        <button
                          type="button"
                          onClick={handleMarkTraded}
                          disabled={isSending}
                          className="chat-action-chip"
                          id="chat_mark_traded_btn"
                        >
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Trade done
                        </button>
                      ) : null}
                      {showMarkFulfilledBtn ? (
                        <button
                          type="button"
                          onClick={handleMarkFulfilled}
                          disabled={isSending}
                          className="chat-action-chip"
                          id="chat_mark_fulfilled_btn"
                        >
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          Fulfilled
                        </button>
                      ) : null}
                      {showStartGoGetBtn && linkedItem ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleStartGoGetFromChat(linkedItem, claimerUserId ?? '', otherName)
                          }
                          disabled={isSending || startingGoGet || !claimerUserId}
                          className="chat-action-chip chat-action-chip--primary"
                          id="chat_start_go_get_btn"
                          title={
                            linkedItem?.type === 'looking'
                              ? 'Navigate to drop off at their area'
                              : 'Navigate to the meetup spot'
                          }
                        >
                          <Navigation2 className="w-3.5 h-3.5 shrink-0" />
                          {startingGoGet
                            ? 'Starting…'
                            : linkedItem
                              ? getChatCoordinationLabel(linkedItem)
                              : 'Go Get'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!isCommunity && showMarkClaimedBtn && claimerUserId ? (
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
                  ) : null}
                  {!isCommunity && chatGoGetSession && !isChatDisabled && (
                    <p className="text-[11px] text-muted text-center">
                      Go Get in progress — open "{linkedItem?.title}" to follow along.
                    </p>
                  )}
                  {isChatDisabled && (
                    <div
                      className="p-2.5 bg-inset/80 border border-app/60 text-muted text-xs rounded-xl flex items-center gap-2"
                      id="chat_disabled_status_banner"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>This listing is closed — chat is read-only.</span>
                    </div>
                  )}
                  <div className="chat-compose-field">
                    <input
                      type="text"
                      id="message_input_box"
                      ref={messageInputRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onFocus={scrollToBottom}
                      placeholder={
                        browseOnly
                          ? 'View-only review account'
                          : isStaffCommunityChat(selectedChat.id) && !userIsStaff
                          ? 'Staff only'
                          : isChatDisabled
                            ? 'This chat is read-only'
                            : isCommunity
                              ? 'Message everyone…'
                              : 'Message…'
                      }
                      maxLength={2000}
                      required
                      disabled={
                        browseOnly ||
                        !!isChatDisabled ||
                        (isStaffCommunityChat(selectedChat.id) && !userIsStaff)
                      }
                      className="min-w-0 flex-1 border-0 bg-transparent text-sm py-2 focus:outline-none focus:ring-0 disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      id="message_send_btn"
                      disabled={
                        browseOnly ||
                        !inputText.trim() ||
                        isSending ||
                        !!isChatDisabled ||
                        (isStaffCommunityChat(selectedChat.id) && !userIsStaff)
                      }
                      className="sbn-btn sbn-btn-primary shrink-0 rounded-full px-3 py-2 disabled:opacity-40"
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
            <div className="chat-empty-card max-w-sm">
              <MessageSquare className="w-10 h-10 text-accent mx-auto mb-3" />
              <h3 className="font-display font-bold text-app">Your messages</h3>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Pick a conversation to chat with neighbors, coordinate pickups, or reach support.
              </p>
            </div>
          </div>
        )}
      </div>

      <ChatFeedbackSection
        userProfile={userProfile}
        showList={false}
        panel={feedbackPanel}
        onPanelChange={setFeedbackPanel}
      />
    </div>
  );
}
