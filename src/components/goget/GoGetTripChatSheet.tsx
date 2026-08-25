import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import type { Message, UserProfile } from '../../types';
import { createSupabaseMessage, getSupabaseMessages } from '../../supabase';
import { subscribePostgresChanges } from '../../lib/supabaseRealtime';
import { isPlayStoreDemo } from '../../preview/playStoreDemo';

interface GoGetTripChatSheetProps {
  chatId: string;
  userProfile: UserProfile;
  otherName: string;
  onClose: () => void;
}

export default function GoGetTripChatSheet({
  chatId,
  userProfile,
  otherName,
  onClose,
}: GoGetTripChatSheetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getSupabaseMessages(chatId).then((rows) => {
      if (!cancelled) setMessages(rows.slice(-40));
    });
    if (isPlayStoreDemo()) return () => { cancelled = true; };

    const unsubscribe = subscribePostgresChanges<Message>(
      {
        channelName: `go-get-trip-chat-${chatId}`,
        table: 'messages',
        event: 'INSERT',
        filter: `chatId=eq.${chatId}`,
      },
      (payload) => {
        const row = payload.new as Message | undefined;
        if (!row?.id) return;
        setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row].slice(-40)));
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ok = await createSupabaseMessage(chatId, trimmed, userProfile.uid, id);
    setBusy(false);
    if (!ok) return;
    setText('');
    setMessages((prev) => [
      ...prev,
      { id, senderId: userProfile.uid, text: trimmed, createdAt: new Date().toISOString() },
    ]);
  };

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${otherName}`}
      id="go_get_trip_chat_sheet"
    >
      <button type="button" className="flex-1 min-h-0" aria-label="Close chat" onClick={onClose} />
      <div className="sbn-card rounded-b-none rounded-t-3xl max-h-[70vh] flex flex-col safe-area-pb">
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-app">
          <p className="text-sm font-bold text-app truncate">Message {otherName}</p>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-inset text-muted" aria-label="Close chat">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[8rem]">
          {messages.length === 0 ? (
            <p className="text-xs text-muted">No messages yet — say you’re on the way or share a meetup note.</p>
          ) : (
            messages.map((message) => {
              const mine = message.senderId === userProfile.uid;
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <p
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                      mine ? 'bg-accent text-white' : 'bg-inset text-app'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex items-center gap-2 px-4 pb-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={`Message ${otherName}`}
            className="sbn-input flex-1 text-sm"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="sbn-btn sbn-btn-primary p-2.5 disabled:opacity-50"
            aria-label="Send"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
