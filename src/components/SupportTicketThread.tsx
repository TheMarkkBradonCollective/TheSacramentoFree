import { useCallback, useEffect, useRef, useState } from 'react';
import { UserProfile, SupportTicket, SupportTicketMessage } from '../types';
import {
  addSupportTicketMessage,
  closeSupportTicket,
  getSupportTicketMessages,
} from '../supabase';
import { canViewerAccessTicket } from '../lib/roles';
import RoleBadge from './RoleBadge';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

interface SupportTicketThreadProps {
  ticket: SupportTicket;
  viewer: UserProfile;
  onClosed?: () => void;
  onUpdated?: () => void;
}

export default function SupportTicketThread({
  ticket,
  viewer,
  onClosed,
  onUpdated,
}: SupportTicketThreadProps) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [err, setErr] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const canAccess = canViewerAccessTicket(viewer, ticket);
  const isOpen = ticket.status === 'open';

  const reload = useCallback(async () => {
    setLoading(true);
    const rows = await getSupportTicketMessages(ticket.id);
    setMessages(rows);
    setLoading(false);
  }, [ticket.id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const refreshTicket = debounceRealtime(() => {
      onUpdated?.();
    }, 100);

    const unsubMessages = subscribePostgresChanges<SupportTicketMessage>(
      {
        channelName: `live-ticket-msgs-${ticket.id}`,
        table: 'support_ticket_messages',
        event: 'INSERT',
        filter: `ticketId=eq.${ticket.id}`,
      },
      (payload) => {
        const row = payload.new as SupportTicketMessage | null;
        if (!row?.id) return;
        if (row.senderUserId === viewer.uid) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
      },
    );

    const unsubTicket = subscribePostgresChanges(
      {
        channelName: `live-ticket-${ticket.id}`,
        table: 'support_tickets',
        event: 'UPDATE',
        filter: `id=eq.${ticket.id}`,
      },
      () => refreshTicket(),
    );

    return () => {
      unsubMessages();
      unsubTicket();
    };
  }, [ticket.id, viewer.uid, onUpdated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = reply.trim();
    if (!text) return;
    setSending(true);
    setErr('');
    const result = await addSupportTicketMessage({
      ticketId: ticket.id,
      sender: viewer,
      text,
    });
    setSending(false);
    if (result.ok) {
      setReply('');
      await reload();
      onUpdated?.();
    } else {
      setErr(result.errorMessage || 'Could not send message.');
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this ticket? You can open a new one later if you still need help.')) return;
    setClosing(true);
    setErr('');
    const result = await closeSupportTicket({ ticketId: ticket.id, user: viewer });
    setClosing(false);
    if (result.ok) {
      onClosed?.();
    } else {
      setErr(result.errorMessage || 'Could not close ticket.');
    }
  };

  if (!canAccess) {
    return (
      <p className="p-4 text-sm text-muted text-center">You do not have access to this ticket.</p>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 py-3 border-b border-app bg-inset/30 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
              isOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted/20 text-muted'
            }`}
          >
            {isOpen ? 'Open' : 'Closed'}
          </span>
          {ticket.openerRole && ticket.openerRole !== 'user' && (
            <RoleBadge role={ticket.openerRole} />
          )}
        </div>
        <p className="text-xs text-muted">
          Opened by <span className="text-app font-medium">{ticket.openerName}</span>
          {' · '}
          {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>

      {err && <p className="px-4 py-2 text-xs font-semibold text-red-400">{err}</p>}

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted text-center py-6">Loading messages…</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderUserId === viewer.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isMine
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-surface border border-app text-app rounded-bl-md'
                  }`}
                >
                  {!isMine && (
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-70 mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="leading-snug whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-[9px] mt-1 ${isMine ? 'text-white/70' : 'text-muted'}`}>
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isOpen && (
        <div className="shrink-0 p-4 border-t border-app bg-surface space-y-2">
          <textarea
            className="sbn-input text-sm min-h-[4rem] resize-none"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={sending}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing || sending}
              className="sbn-btn sbn-btn-secondary flex-1 text-sm"
            >
              {closing ? 'Closing…' : 'Close ticket'}
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !reply.trim()}
              className="sbn-btn sbn-btn-primary flex-1 text-sm"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
