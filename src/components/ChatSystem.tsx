import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, query, where, orderBy, onSnapshot, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { MessageSquare, Send, AlertCircle, MapPin, Gift, Box, ChevronLeft } from 'lucide-react';

interface ChatSystemProps {
  userProfile: UserProfile;
  initialSelectedChatId: string | null;
  onClearInitialChat: () => void;
}

export default function ChatSystem({ userProfile, initialSelectedChatId, onClearInitialChat }: ChatSystemProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isChatsLoading, setIsChatsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll messages viewport to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedChat]);

  // Sync / Subscribe to client's Chat Rooms
  useEffect(() => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participantIds', 'array-contains', userProfile.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedChats: Chat[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedChats.push({
          id: docSnap.id,
          participantIds: data.participantIds || [],
          participantNames: data.participantNames || {},
          participantPhotos: data.participantPhotos || {},
          lastMessageText: data.lastMessageText || '',
          lastMessageAt: data.lastMessageAt || null,
          lastMessageSenderId: data.lastMessageSenderId || '',
          itemId: data.itemId || '',
          itemTitle: data.itemTitle || ''
        });
      });

      // Sort chats by lastMessageAt descending
      loadedChats.sort((a, b) => {
        const timeA = a.lastMessageAt?.seconds ? a.lastMessageAt.seconds : (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
        const timeB = b.lastMessageAt?.seconds ? b.lastMessageAt.seconds : (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0);
        return timeB - timeA;
      });

      setChats(loadedChats);
      setIsChatsLoading(false);

      // Handle selecting initial chat if passed down
      if (initialSelectedChatId) {
        const target = loadedChats.find(c => c.id === initialSelectedChatId);
        if (target) {
          setSelectedChat(target);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile.uid, initialSelectedChatId]);

  // Subscribe to Selected Chat Messages Subcollection
  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return;
    }

    const messagesRef = collection(db, 'chats', selectedChat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedMessages.push({
          id: docSnap.id,
          senderId: data.senderId,
          text: data.text,
          createdAt: data.createdAt
        });
      });
      setMessages(loadedMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${selectedChat.id}/messages`);
    });

    return () => {
      unsubscribe();
    };
  }, [selectedChat]);

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !inputText.trim() || isSending) return;

    setIsSending(true);
    setErrorMsg('');
    const typedText = inputText.trim();
    setInputText('');

    try {
      const messagesRef = collection(db, 'chats', selectedChat.id, 'messages');
      const chatDocRef = doc(db, 'chats', selectedChat.id);

      // Generate doc for message
      const msgDocRef = doc(messagesRef);
      const messagePayload = {
        id: msgDocRef.id,
        senderId: userProfile.uid,
        text: typedText,
        createdAt: new Date()
      };

      // Create message & update chat header atomically
      const batch = writeBatch(db);
      batch.set(msgDocRef, messagePayload);
      batch.update(chatDocRef, {
        lastMessageText: typedText,
        lastMessageSenderId: userProfile.uid,
        lastMessageAt: new Date()
      });

      await batch.commit();
    } catch (err) {
      setInputText(typedText); // restore text on error
      try {
        handleFirestoreError(err, OperationType.WRITE, `chats/${selectedChat.id}/messages`);
      } catch (authError: any) {
        setErrorMsg('Access denied. Security rules prevents writing to this chat.');
      }
    } finally {
      setIsSending(false);
    }
  };

  // Helper to extract neighbor display variables
  const getRecipientInfo = (chat: Chat) => {
    const otherId = chat.participantIds.find(id => id !== userProfile.uid) || '';
    const otherName = chat.participantNames[otherId] || 'Neighbor';
    const otherPhoto = chat.participantPhotos[otherId] || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(otherName)}`;
    return { otherId, otherName, otherPhoto };
  };

  return (
    <div className="glass rounded-3xl overflow-hidden h-[calc(100vh-12rem)] flex shadow-lg border border-white/40 mb-2" id="chat_app_viewport">
      
      {/* Sidebar List - Responsive collapse */}
      <div 
        className={`w-full md:w-80 border-r border-white/30 flex flex-col shrink-0 ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
        id="chats_sidebar"
      >
        <div className="p-4 border-b border-white/30 bg-white/40 flex items-center justify-between backdrop-blur-xs">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Active Exchanges</h3>
          <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[10px] font-bold text-emerald-800 font-mono">
            {chats.length} active
          </span>
        </div>

        {/* Chat Channels list container */}
        <div className="flex-1 overflow-y-auto space-y-0.5 p-2" id="chat_rooms_scrollable">
          {isChatsLoading ? (
            <div className="p-4 text-center text-xs text-slate-500 font-bold">Scanning threads...</div>
          ) : chats.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-bold text-slate-650">No active conversations</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Click 'Message Member' on any post to coordinate!</p>
            </div>
          ) : (
            chats.map((chat) => {
              const { otherName, otherPhoto } = getRecipientInfo(chat);
              const isSelected = selectedChat?.id === chat.id;

              return (
                <div
                  key={chat.id}
                  id={`chat_row_${chat.id}`}
                  onClick={() => {
                    setSelectedChat(chat);
                    onClearInitialChat();
                  }}
                  className={`p-3 rounded-xl flex items-start space-x-3 cursor-pointer select-none transition-all ${
                    isSelected 
                      ? 'bg-white/60 shadow-sm border border-white/50' 
                      : 'hover:bg-white/20 border border-transparent'
                  }`}
                >
                  <img
                    src={otherPhoto}
                    referrerPolicy="no-referrer"
                    alt={otherName}
                    className="w-9 h-9 rounded-xl border border-white/40 shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 truncate">{otherName}</p>
                      {chat.lastMessageAt && (
                        <span className="text-[9px] text-slate-500 font-mono font-bold">
                          {new Date(chat.lastMessageAt.seconds ? chat.lastMessageAt.seconds * 1000 : chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    {/* Item Post Context */}
                    {chat.itemTitle && (
                      <span className="inline-flex mt-1 items-center space-x-1 text-[9px] font-bold text-emerald-800 bg-emerald-500/15 px-1.5 py-0.5 rounded-sm uppercase tracking-wide truncate max-w-full">
                        <Box className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{chat.itemTitle}</span>
                      </span>
                    )}

                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 truncate font-bold">
                      {chat.lastMessageText || 'Chat created'}
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
        className={`flex-1 flex flex-col bg-transparent ${
          !selectedChat ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
        id="conversations_body_viewport"
      >
        {selectedChat ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-white/30 bg-white/40 flex items-center justify-between shadow-xs backdrop-blur-xs" id="chat_panel_header">
              <div className="flex items-center space-x-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  id="mobile_chat_back_btn"
                  onClick={() => {
                    setSelectedChat(null);
                    onClearInitialChat();
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-850 hover:bg-white/40 rounded-lg md:hidden shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <img
                  src={getRecipientInfo(selectedChat).otherPhoto}
                  referrerPolicy="no-referrer"
                  alt={getRecipientInfo(selectedChat).otherName}
                  className="w-10 h-10 rounded-xl border border-white/40 shrink-0"
                />
                
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">
                    {getRecipientInfo(selectedChat).otherName}
                  </h4>
                  {selectedChat.itemTitle ? (
                    <div className="flex items-center space-x-1 text-[10px] text-emerald-800 font-bold tracking-tight uppercase block mt-0.5 truncate">
                      <Gift className="w-3.5 h-3.5" />
                      <span>Coordinating: {selectedChat.itemTitle}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-0.5 font-bold">
                      <MapPin className="w-3 h-3 text-emerald-600" />
                      <span>Sacramento Local Group</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Log viewport */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" id="messages_scroller">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 text-red-700 text-xs font-semibold rounded-lg border border-red-500/20 flex items-center space-x-1.5" id="chat_error_card">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-500 font-bold">
                  <MessageSquare className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <span>Say hello to start coordinating the exchange! Keep meets in public locations.</span>
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
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-xs font-semibold shadow-xs ${
                          isUser
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white/60 border border-white/50 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap breakdown-words">{msg.text}</p>
                        <span 
                          className={`text-[8.5px] font-mono mt-1 block text-right font-bold ${
                            isUser ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          {msg.createdAt?.seconds 
                            ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'sending...'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input tray */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/30 border-t border-white/30 backdrop-blur-xs flex items-center space-x-3" id="input_tray">
              <input
                type="text"
                id="message_input_box"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                maxLength={2000}
                required
                className="flex-1 px-4 py-2 search-glass rounded-xl text-xs text-slate-900 placeholder-slate-500 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="submit"
                id="message_send_btn"
                disabled={!inputText.trim() || isSending}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-16 px-4" id="messages_not_selected_state">
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Your Inbox Conversations</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto mt-1 leading-relaxed">
              Select an existing thread from the left menu panel or explore listings to propose an item swap or give.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
