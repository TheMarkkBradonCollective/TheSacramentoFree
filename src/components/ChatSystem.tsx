import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, UserProfile, ItemPost } from '../types';
import { getSupabaseChats, getSupabaseMessages, createSupabaseMessage } from '../supabase';
import { MessageSquare, Send, AlertCircle, MapPin, Gift, Box, ChevronLeft, Navigation } from 'lucide-react';
import { IN_APP } from '../siteContent';
import {
  formatPickupLocationMessage,
  hasStoredGps,
  isLocationPrivate,
} from '../lib/itemLocation';

interface ChatSystemProps {
  userProfile: UserProfile;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
  items: ItemPost[];
}

export default function ChatSystem({ userProfile, initialSelectedChatId, onClearInitialChat, items }: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (value: any) => {
    if (!value) return '';
    try {
      if (typeof value === 'string') {
        return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (value?.seconds) {
        return new Date(value.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Scroll messages viewport to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  // Sync / Subscribe to client's Chat Rooms
  useEffect(() => {
    let active = true;

    const loadChats = async () => {
      try {
        const loadedChats = await getSupabaseChats(userProfile.uid);
        if (!active) return;

        // Sort chats by lastMessageAt descending
        loadedChats.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });

        setChats(loadedChats);
        setIsChatsLoading(false);

        // Handle selecting initial chat if passed down
        if (initialSelectedChatId) {
          const target = loadedChats.find(c => c.id === initialSelectedChatId);
          if (target && !selectedChat) {
            setSelectedChat(target);
          }
        }
      } catch (err) {
        console.warn('Failed to load chats from Supabase:', err);
      }
    };

    loadChats();
    // Poll chats every 5 seconds for updates
    const interval = setInterval(loadChats, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userProfile.uid, initialSelectedChatId]);

  // Subscribe to Selected Chat Messages Subcollection
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        const loadedMessages = await getSupabaseMessages(selectedChat.id);
        if (!active) return;
        setMessages(loadedMessages);
      } catch (err) {
        console.warn('Failed to load messages from Supabase:', err);
      }
    };

    loadMessages();
    // Poll messages every 2.5 seconds for instant threads
    const interval = setInterval(loadMessages, 2500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedChat]);

  const sendChatText = async (text: string) => {
    if (!selectedChat || !text.trim() || isSending) return false;

    setIsSending(true);
    setErrorMsg('');
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      const success = await createSupabaseMessage(selectedChat.id, text.trim(), userProfile.uid, messageId);
      if (success) {
        setMessages((prev) => [
          ...prev,
          {
            id: messageId,
            senderId: userProfile.uid,
            text: text.trim(),
            createdAt: new Date().toISOString(),
          },
        ]);
        return true;
      }
      throw new Error('Supabase message write failed');
    } catch (err) {
      setErrorMsg('Failed to send message.');
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

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !inputText.trim() || isSending) return;

    const typedText = inputText.trim();
    setInputText('');
    const ok = await sendChatText(typedText);
    if (!ok) setInputText(typedText);
  };

  // Helper to extract neighbor display variables
  const getRecipientInfo = (chat: Chat) => {
    const otherId = chat.participantIds.find(id => id !== userProfile.uid) || '';
    const otherName = chat.participantNames[otherId] || 'Neighbor';
    const otherPhoto = chat.participantPhotos[otherId] || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(otherName)}`;
    return { otherId, otherName, otherPhoto };
  };

  // Get custom chat title: 'item name | Messangers Name'
  const getFormattedChatTitle = (chat: Chat) => {
    if (!chat.itemId || !chat.itemTitle) {
      return getRecipientInfo(chat).otherName;
    }
    const item = items.find(i => i.id === chat.itemId);
    const ownerId = item ? item.userId : '';
    const messengerId = ownerId 
      ? chat.participantIds.find(id => id !== ownerId) 
      : chat.participantIds.find(id => id !== userProfile.uid); 
    
    const finalMessengerId = messengerId || chat.participantIds.find(id => id !== userProfile.uid) || userProfile.uid;
    const messengerName = chat.participantNames[finalMessengerId] || 'Neighbor';
    return `${chat.itemTitle} | ${messengerName}`;
  };

  return (
    <div className="bg-surface rounded-2xl overflow-hidden h-[calc(100vh-12rem)] min-h-[420px] flex border border-app text-app" id="chat_app_viewport">
      
      {/* Sidebar List - Responsive collapse */}
      <div 
        className={`w-full md:w-80 border-r border-app flex flex-col shrink-0 ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
        id="chats_sidebar"
      >
        <div className="p-4 border-b border-app bg-inset flex items-center justify-between">
          <h3 className="text-xs font-black text-app tracking-widest uppercase">ACTIVE CHATS</h3>
          <span className="px-2.5 py-0.5 bg-accent border border-accent text-on-accent text-[9px] font-black uppercase tracking-widest">
            {chats.length} active
          </span>
        </div>
 
         {/* Chat Channels list container */}
         <div className="flex-1 overflow-y-auto space-y-0 p-0" id="chat_rooms_scrollable">
           {isChatsLoading ? (
             <div className="p-4 text-center text-xs text-subtle font-black uppercase tracking-wider">CONNECTING THREADS...</div>
           ) : chats.length === 0 ? (
             <div className="p-8 text-center text-xs text-muted">
               <MessageSquare className="w-8 h-8 text-muted mx-auto mb-3" />
               <p className="font-bold text-app uppercase tracking-widest text-[10px]">No matches routed</p>
               <p className="text-[10px] text-subtle mt-1.5 font-semibold">{IN_APP.chatsDescription}</p>
             </div>
           ) : (
             chats.map((chat) => {
               const { otherName, otherPhoto } = getRecipientInfo(chat);
               const isSelected = selectedChat?.id === chat.id;
               const displayTitle = getFormattedChatTitle(chat);
 
               return (
                 <div
                   key={chat.id}
                   id={`chat_row_${chat.id}`}
                   onClick={() => {
                     setSelectedChat(chat);
                     onClearInitialChat();
                   }}
                   className={`p-4 flex items-start space-x-3.5 cursor-pointer select-none transition-all border-b border-app ${
                     isSelected 
                       ? 'bg-accent-soft border-l-[3px] border-l-brand-orange' 
                       : 'hover:bg-surface-hover border-l-[3px] border-l-transparent'
                   }`}
                 >
                   <img
                     src={otherPhoto}
                     referrerPolicy="no-referrer"
                     alt={otherName}
                     className="w-9 h-9 rounded-none border border-zinc-150 shrink-0 mt-0.5"
                   />
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between">
                       <p className="text-xs font-black text-app uppercase tracking-tight truncate" title={displayTitle}>{displayTitle}</p>
                       {chat.lastMessageAt && (
                        <span className="text-[8.5px] text-muted font-mono font-bold">
                          {new Date(chat.lastMessageAt.seconds ? chat.lastMessageAt.seconds * 1000 : chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    {/* Item Post Context */}
                    {chat.itemTitle && (
                      <span className="inline-flex mt-1.5 items-center space-x-1 text-[8.5px] font-black text-app bg-inset border border-app px-2 py-0.5 uppercase tracking-widest truncate max-w-full">
                        <Box className="w-2.5 h-2.5 text-brand-orange" />
                        <span>{chat.itemTitle}</span>
                      </span>
                    )}

                    <p className="text-xs text-subtle mt-1.5 line-clamp-1 truncate font-semibold">
                      {chat.lastMessageText || 'Communication open.'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Primary Conversation pane */}
      <div 
        className={`flex-1 flex flex-col bg-app ${
          !selectedChat ? 'hidden md:flex items-center justify-center bg-app-secondary' : 'flex'
        }`}
        id="conversations_body_viewport"
      >
        {selectedChat ? (
          (() => {
            const linkedItem = items.find(i => i.id === selectedChat.itemId);
            const isChatDisabled = linkedItem && linkedItem.status !== 'active';
            const displayTitleHeader = getFormattedChatTitle(selectedChat);
            const isListingOwner = linkedItem?.userId === userProfile.uid;
            const showSendLocationBtn =
              !!linkedItem &&
              !isChatDisabled &&
              isListingOwner &&
              (!hasStoredGps(linkedItem.description) || isLocationPrivate(linkedItem.description));

            return (
              <>
                {/* Thread Header */}
                <div className="px-5 py-4 border-b border-app bg-surface flex items-center justify-between shadow-3xs" id="chat_panel_header">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Back button on mobile */}
                    <button
                      id="mobile_chat_back_btn"
                      onClick={() => {
                        setSelectedChat(null);
                        onClearInitialChat();
                      }}
                      className="p-1.5 text-muted hover:text-app hover:bg-surface-hover rounded-none md:hidden shrink-0 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <img
                      src={getRecipientInfo(selectedChat).otherPhoto}
                      referrerPolicy="no-referrer"
                      alt={getRecipientInfo(selectedChat).otherName}
                      className="w-10 h-10 rounded-none border border-zinc-250 shrink-0"
                    />
                    
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-app truncate uppercase tracking-widest" title={displayTitleHeader}>
                        {displayTitleHeader}
                      </h4>
                      {selectedChat.itemTitle ? (
                        <div className="flex items-center space-x-1.5 text-[9px] text-brand-orange font-black tracking-widest uppercase block mt-1 truncate">
                          <Gift className="w-3.5 h-3.5" />
                          <span>MATCHING cargo: {selectedChat.itemTitle}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-[9px] text-subtle mt-1 uppercase tracking-widest font-black">
                          <MapPin className="w-3 h-3 text-brand-sage" />
                          <span>ROUTED METROPOLITAN COMMUNICATOR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Log viewport */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4" id="messages_scroller">
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-none flex items-center space-x-1.5" id="chat_error_card">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-xs text-muted font-semibold uppercase tracking-wider space-y-2.5">
                      <MessageSquare className="w-7 h-7 text-muted mx-auto" />
                      <p>Send an initial transmission to initiate porch pickup logistics.</p>
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
                            className={`max-w-[70%] rounded-none px-4 py-3 text-xs font-semibold shadow-3xs ${
                              isUser
                                ? 'bg-accent text-on-accent'
                                : 'bg-surface border border-app text-app'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            <span 
                              className={`text-[8px] font-mono mt-1 w-full block text-right font-black uppercase tracking-wider ${
                                isUser ? 'text-white/80' : 'text-subtle'
                              }`}
                            >
                              {formatTime(msg.createdAt) || 'sending...'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input tray */}
                <form onSubmit={handleSendMessage} className="p-4 bg-surface border-t border-app flex flex-col space-y-2" id="input_tray">
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
                  {isChatDisabled && (
                    <div className="p-2.5 bg-inset border border-app text-subtle text-[10px] font-bold uppercase tracking-wider flex items-center space-x-2 select-none" id="chat_disabled_status_banner">
                      <AlertCircle className="w-4 h-4 text-muted shrink-0" />
                      <span>This listing has been claimed/completed. This chat is now read-only.</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 w-full">
                    <input
                      type="text"
                      id="message_input_box"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={isChatDisabled ? "This chat is archived and read-only" : "Type your message here..."}
                      maxLength={2000}
                      required
                      disabled={!!isChatDisabled}
                      className="flex-1 px-4 py-3 bg-inset border border-app rounded-none text-xs text-app placeholder:text-subtle font-semibold focus:border-accent disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      id="message_send_btn"
                      disabled={!inputText.trim() || isSending || !!isChatDisabled}
                      className="px-5 py-3 bg-accent hover:bg-accent-hover text-on-accent rounded-none font-black text-xs uppercase tracking-widest shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              </>
            );
          })()
        ) : (
          <div className="text-center py-20 px-4 bg-app-secondary h-full flex flex-col justify-center items-center" id="messages_not_selected_state">
            <MessageSquare className="w-12 h-12 text-muted mb-4" />
            <h3 className="text-xs font-black text-app tracking-widest uppercase">NO ACTIVE CHAT SELECTED</h3>
            <p className="text-xs text-subtle max-w-sm mx-auto mt-2 font-semibold leading-relaxed">
              {IN_APP.chatsDescription}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
