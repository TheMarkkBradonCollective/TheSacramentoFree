import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, UserProfile } from '../types';
import { collection, doc, query, where, orderBy, onSnapshot, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { createSupabaseMessage } from '../supabase';
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

      // Sync message to Supabase
      try {
        await createSupabaseMessage(selectedChat.id, typedText, userProfile.uid, msgDocRef.id);
      } catch (sbErr) {
        console.warn('Supabase message creation bypassed or failed:', sbErr);
      }

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
    <div className="bg-white rounded-none overflow-hidden h-[calc(100vh-12rem)] flex shadow-xs border border-zinc-200 mb-2 font-sans" id="chat_app_viewport">
      
      {/* Sidebar List - Responsive collapse */}
      <div 
        className={`w-full md:w-80 border-r border-zinc-200 flex flex-col shrink-0 ${
          selectedChat ? 'hidden md:flex' : 'flex'
        }`}
        id="chats_sidebar"
      >
        <div className="p-4 border-b border-zinc-200 bg-zinc-55 flex items-center justify-between">
          <h3 className="text-xs font-black text-black tracking-widest uppercase">DISPATCH INDEX</h3>
          <span className="px-2.5 py-0.5 bg-black border border-black text-white text-[9px] font-black uppercase tracking-widest">
            {chats.length} active
          </span>
        </div>

        {/* Chat Channels list container */}
        <div className="flex-1 overflow-y-auto space-y-0 p-0" id="chat_rooms_scrollable">
          {isChatsLoading ? (
            <div className="p-4 text-center text-xs text-zinc-550 font-black uppercase tracking-wider">CONNECTING THREADS...</div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
              <p className="font-bold text-zinc-900 uppercase tracking-widest text-[10px]">No matches routed</p>
              <p className="text-[10px] text-zinc-450 mt-1.5 font-semibold">Select 'Send Dispatch' on any product listing to open channels.</p>
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
                  className={`p-4 flex items-start space-x-3.5 cursor-pointer select-none transition-all border-b border-zinc-100 ${
                    isSelected 
                      ? 'bg-zinc-100 border-l-[3px] border-l-[#276EF1]' 
                      : 'hover:bg-zinc-50 border-l-[3px] border-l-transparent'
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
                      <p className="text-xs font-black text-black uppercase tracking-tight truncate">{otherName}</p>
                      {chat.lastMessageAt && (
                        <span className="text-[8.5px] text-zinc-400 font-mono font-bold">
                          {new Date(chat.lastMessageAt.seconds ? chat.lastMessageAt.seconds * 1000 : chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    
                    {/* Item Post Context */}
                    {chat.itemTitle && (
                      <span className="inline-flex mt-1.5 items-center space-x-1 text-[8.5px] font-black text-black bg-zinc-100 border border-zinc-200 px-2 py-0.5 uppercase tracking-widest truncate max-w-full">
                        <Box className="w-2.5 h-2.5 text-[#276EF1]" />
                        <span>{chat.itemTitle}</span>
                      </span>
                    )}

                    <p className="text-xs text-zinc-500 mt-1.5 line-clamp-1 truncate font-semibold">
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
        className={`flex-1 flex flex-col bg-zinc-50 ${
          !selectedChat ? 'hidden md:flex items-center justify-center bg-[#F6F6F6]' : 'flex'
        }`}
        id="conversations_body_viewport"
      >
        {selectedChat ? (
          <>
            {/* Thread Header */}
            <div className="px-5 py-4 border-b border-zinc-200 bg-white flex items-center justify-between shadow-3xs" id="chat_panel_header">
              <div className="flex items-center space-x-3.5 min-w-0">
                {/* Back button on mobile */}
                <button
                  id="mobile_chat_back_btn"
                  onClick={() => {
                    setSelectedChat(null);
                    onClearInitialChat();
                  }}
                  className="p-1.5 text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-none md:hidden shrink-0 cursor-pointer"
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
                  <h4 className="text-xs font-black text-black truncate uppercase tracking-widest">
                    {getRecipientInfo(selectedChat).otherName}
                  </h4>
                  {selectedChat.itemTitle ? (
                    <div className="flex items-center space-x-1.5 text-[9px] text-[#276EF1] font-black tracking-widest uppercase block mt-1 truncate">
                      <Gift className="w-3.5 h-3.5" />
                      <span>MATCHING cargo: {selectedChat.itemTitle}</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-black">
                      <MapPin className="w-3 h-3 text-[#276EF1]" />
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
                <div className="text-center py-16 text-xs text-zinc-400 font-semibold uppercase tracking-wider space-y-2.5">
                  <MessageSquare className="w-7 h-7 text-zinc-300 mx-auto" />
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
                            ? 'bg-black text-white'
                            : 'bg-white border border-zinc-200 text-black'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        <span 
                          className={`text-[8px] font-mono mt-1 w-full block text-right font-black uppercase tracking-wider ${
                            isUser ? 'text-zinc-400' : 'text-zinc-450'
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
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-zinc-200 flex items-center space-x-3" id="input_tray">
              <input
                type="text"
                id="message_input_box"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type transmission coordinates..."
                maxLength={2000}
                required
                className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-none text-xs text-black placeholder-zinc-400 font-semibold focus:bg-white"
              />
              <button
                type="submit"
                id="message_send_btn"
                disabled={!inputText.trim() || isSending}
                className="px-5 py-3 bg-black hover:bg-zinc-800 text-white rounded-none font-black text-xs uppercase tracking-widest shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-20 px-4 bg-[#F6F6F6] h-full flex flex-col justify-center items-center" id="messages_not_selected_state">
            <MessageSquare className="w-12 h-12 text-zinc-300 mb-4" />
            <h3 className="text-xs font-black text-black tracking-widest uppercase">TRANSMISSION CHANNEL VACANT</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2 font-semibold leading-relaxed">
              Select any active routing thread on the sidebar index, or select 'Send Dispatch' on live directory postings to coordinate contactless porch handover actions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
