import { useCallback, useEffect, useState } from 'react';
import { UserProfile, SupportTicket } from '../types';
import {
  createSupportTicket,
  getSupportTicketsForUser,
  getSupportTicketById,
} from '../supabase';
import SupportTicketThread from './SupportTicketThread';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { LifeBuoy, MessageSquarePlus, ChevronRight, ChevronLeft } from 'lucide-react';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import PageScrollFooter from './PageScrollFooter';

export type ChatSupportView = 'list' | 'new' | 'thread' | null;

interface ChatSupportSectionProps {
  user: UserProfile;
  view: ChatSupportView;
  onViewChange: (view: ChatSupportView) => void;
  onBackToChat?: () => void;
  onOpenGoFundMe?: () => void;
  initialTicketId?: string | null;
  onClearInitialTicketId?: () => void;
  /** Compact rows for the chat sidebar */
  compact?: boolean;
  className?: string;
}

export default function ChatSupportSection({
  user,
  view,
  onViewChange,
  onBackToChat,
  onOpenGoFundMe,
  initialTicketId = null,
  onClearInitialTicketId,
  compact = false,
  className = '',
}: ChatSupportSectionProps) {
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCreating, setTicketCreating] = useState(false);
  const ticketImage = useImageAttachment();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [err, setErr] = useState('');

  const reloadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const rows = await getSupportTicketsForUser(user.uid);
    setTickets(rows);
    setTicketsLoading(false);
  }, [user.uid]);

  useEffect(() => {
    void reloadTickets();
  }, [reloadTickets]);

  useEffect(() => {
    if (!initialTicketId) return;
    void getSupportTicketById(initialTicketId).then((ticket) => {
      if (ticket) {
        setActiveTicket(ticket);
        onViewChange('thread');
      }
      onClearInitialTicketId?.();
    });
  }, [initialTicketId, onClearInitialTicketId, onViewChange]);

  useEffect(() => {
    const refresh = debounceRealtime(() => {
      void reloadTickets();
      if (activeTicket) {
        void getSupportTicketById(activeTicket.id).then((t) => {
          if (t) setActiveTicket(t);
        });
      }
    }, 100);

    const unsubs = [
      subscribePostgresChanges(
        {
          channelName: `live-chat-support-tickets-${user.uid}`,
          table: 'support_tickets',
          event: '*',
          filter: `openerUserId=eq.${user.uid}`,
        },
        refresh,
      ),
      subscribePostgresChanges(
        {
          channelName: `live-chat-support-msgs-${user.uid}`,
          table: 'support_ticket_messages',
          event: 'INSERT',
        },
        refresh,
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [user.uid, activeTicket?.id, reloadTickets]);

  const openThread = async (ticket: SupportTicket) => {
    const fresh = await getSupportTicketById(ticket.id);
    setActiveTicket(fresh ?? ticket);
    onViewChange('thread');
  };

  const handleCreateTicket = async () => {
    setTicketCreating(true);
    setErr('');
    const result = await createSupportTicket({
      opener: user,
      subject: ticketSubject,
      message: ticketMessage,
      imageFile: ticketImage.file,
    });
    setTicketCreating(false);
    if (result.ok && result.ticketId) {
      setTicketSubject('');
      setTicketMessage('');
      ticketImage.clear();
      await reloadTickets();
      const ticket = await getSupportTicketById(result.ticketId);
      if (ticket) {
        setActiveTicket(ticket);
        onViewChange('thread');
      } else {
        onViewChange('list');
      }
    } else {
      setErr(result.errorMessage || 'Could not open ticket.');
    }
  };

  const canSubmitTicket =
    ticketSubject.trim() && (ticketMessage.trim() || ticketImage.file);

  if (compact) {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={() => {
            setErr('');
            onViewChange('new');
          }}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm w-full inline-flex items-center justify-center gap-2 mb-2"
        >
          <MessageSquarePlus className="w-3.5 h-3.5" />
          New support ticket
        </button>
        {ticketsLoading ? (
          <p className="text-xs text-muted px-1 py-2">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-muted px-1 py-2">No support tickets yet.</p>
        ) : (
          <ul className="space-y-1">
            {tickets.map((ticket) => {
              const isActive = view === 'thread' && activeTicket?.id === ticket.id;
              return (
                <li key={ticket.id}>
                  <button
                    type="button"
                    onClick={() => void openThread(ticket)}
                    className={`text-left w-full p-2.5 flex items-start gap-2 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-accent-soft border-l-[3px] border-l-accent'
                        : 'hover:bg-surface-hover border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <LifeBuoy className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-app truncate">{ticket.subject}</p>
                      <p className="text-[10px] text-muted">
                        {ticket.status === 'open' ? 'Open' : 'Closed'}
                        {' · '}
                        {new Date(ticket.updatedAt).toLocaleDateString()}
                      </p>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  if (view === 'new') {
    return (
      <div className={`flex flex-col min-h-0 h-full ${className}`}>
        <header className="shrink-0 px-3 py-3 border-b border-app bg-surface flex items-center gap-2">
          <button
            type="button"
            onClick={() => onViewChange('list')}
            className="p-2 rounded-full text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Back to tickets"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-sm text-app">Open support ticket</h3>
            <p className="text-xs text-muted">Staff will reply here</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="sbn-help-card space-y-4 max-w-lg mx-auto">
            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Subject</span>
              <input
                className="sbn-input text-sm"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="What do you need help with?"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Message</span>
              <textarea
                className="sbn-input text-sm min-h-[8rem]"
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Describe your question or issue in detail."
              />
            </label>
            <ImageAttachmentPicker
              label="Attach a photo (optional)"
              hint="You can send a photo instead of or along with your message."
              file={ticketImage.file}
              previewUrl={ticketImage.previewUrl}
              onChange={ticketImage.setFile}
              disabled={ticketCreating}
            />
            <button
              type="button"
              disabled={ticketCreating || !canSubmitTicket}
              onClick={() => void handleCreateTicket()}
              className="sbn-btn sbn-btn-primary w-full"
            >
              {ticketCreating ? 'Opening…' : 'Open ticket'}
            </button>
          </div>
          {onOpenGoFundMe && <PageScrollFooter onOpenDetails={onOpenGoFundMe} />}
        </div>
      </div>
    );
  }

  if (view === 'thread' && activeTicket) {
    return (
      <div className={`flex flex-col min-h-0 h-full ${className}`}>
        <header className="shrink-0 px-3 py-3 border-b border-app bg-surface flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTicket(null);
              onViewChange('list');
              void reloadTickets();
            }}
            className="p-2 rounded-full text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Back to tickets"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-sm text-app truncate">{activeTicket.subject}</h3>
            <p className="text-xs text-muted">
              {activeTicket.status === 'open' ? 'Support conversation' : 'Closed'}
            </p>
          </div>
        </header>
        <div className="flex-1 min-h-0 flex flex-col">
          <SupportTicketThread
            ticket={activeTicket}
            viewer={user}
            onClosed={() => {
              void getSupportTicketById(activeTicket.id).then((t) => {
                if (t) setActiveTicket(t);
                void reloadTickets();
              });
            }}
            onUpdated={() => {
              void getSupportTicketById(activeTicket.id).then((t) => {
                if (t) setActiveTicket(t);
              });
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-0 h-full ${className}`}>
      <header className="shrink-0 px-3 py-3 border-b border-app bg-surface flex items-center gap-2">
        {onBackToChat && (
          <button
            type="button"
            onClick={onBackToChat}
            className="p-2 rounded-full text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Back to chat"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-sm text-app">Support tickets</h3>
          <p className="text-xs text-muted">One-on-one help from staff</p>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        <button
          type="button"
          onClick={() => {
            setErr('');
            onViewChange('new');
          }}
          className="sbn-btn sbn-btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Open new ticket
        </button>
        {ticketsLoading ? (
          <p className="text-sm text-muted text-center py-6">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8">
            <LifeBuoy className="w-10 h-10 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No tickets yet.</p>
            <p className="text-xs text-muted mt-1">Open a ticket if you need personal help from staff.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <button
                  type="button"
                  onClick={() => void openThread(ticket)}
                  className="sbn-help-list-item w-full"
                >
                  <span className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-sm text-app truncate">{ticket.subject}</p>
                    <p className="text-[11px] text-muted">
                      {ticket.status === 'open' ? 'Open' : 'Closed'}
                      {' · '}
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </p>
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {onOpenGoFundMe && <PageScrollFooter onOpenDetails={onOpenGoFundMe} />}
      </div>
    </div>
  );
}
