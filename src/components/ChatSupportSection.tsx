import { useCallback, useEffect, useState } from 'react';
import { UserProfile, SupportTicket } from '../types';
import {
  createSupportTicket,
  getSupportTicketsForUser,
  getSupportTicketsForStaff,
  getSupportTicketById,
  getSupportTicketLastMessages,
} from '../supabase';
import { canViewStaffTicketInbox } from '../lib/roles';
import { isStaffActingOfficial } from '../lib/staffInteractionMode';
import SupportTicketThread from './SupportTicketThread';
import SupportTicketRow from './SupportTicketRow';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { LifeBuoy, MessageSquarePlus, ChevronLeft } from 'lucide-react';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import PageScrollFooter, { ScrollPage } from './PageScrollFooter';
import ChatSectionEmptyState from './ChatSectionEmptyState';
import ChatSidebarRow from './ChatSidebarRow';
import type { SupportTicketLastMessage } from '../lib/supportChat';

export type ChatSupportView = 'list' | 'new' | 'thread' | null;

interface ChatSupportSectionProps {
  user: UserProfile;
  view: ChatSupportView;
  onViewChange: (view: ChatSupportView) => void;
  onBackToChat?: () => void;
  onOpenGoFundMe?: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
  initialTicketId?: string | null;
  onClearInitialTicketId?: () => void;
  onViewRelatedListing?: (itemId: string) => void;
  onViewRelatedEvent?: (eventId: string) => void;
  onArchiveTicket?: (ticketId: string) => void;
  onUnarchiveTicket?: (ticketId: string) => void;
  supportTicketArchived?: boolean;
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
  onOpenPrivacy,
  onOpenTerms,
  initialTicketId = null,
  onClearInitialTicketId,
  onViewRelatedListing,
  onViewRelatedEvent,
  onArchiveTicket,
  onUnarchiveTicket,
  supportTicketArchived = false,
  compact = false,
  className = '',
}: ChatSupportSectionProps) {
  const isStaffInbox = canViewStaffTicketInbox(user.role) && isStaffActingOfficial(user);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCreating, setTicketCreating] = useState(false);
  const ticketImage = useImageAttachment();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketPreviews, setTicketPreviews] = useState<Record<string, SupportTicketLastMessage>>({});
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const SIDEBAR_PREVIEW = 3;
  const [err, setErr] = useState('');

  const loadTicketPreviews = useCallback(async (rows: SupportTicket[]) => {
    if (rows.length === 0) {
      setTicketPreviews({});
      return;
    }
    const previews = await getSupportTicketLastMessages(rows.map((ticket) => ticket.id));
    setTicketPreviews(previews);
  }, []);

  const reloadTickets = useCallback(async () => {
    setTicketsLoading(true);
    const rows =
      isStaffInbox && view !== 'new'
        ? await getSupportTicketsForStaff(user)
        : await getSupportTicketsForUser(user.uid);
    setTickets(rows);
    await loadTicketPreviews(rows);
    setTicketsLoading(false);
  }, [user, isStaffInbox, view, loadTicketPreviews]);

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

    const unsubs = isStaffInbox
      ? [
          subscribePostgresChanges(
            { channelName: `live-chat-staff-tickets-${user.uid}`, table: 'support_tickets', event: '*' },
            refresh,
          ),
          subscribePostgresChanges(
            {
              channelName: `live-chat-staff-ticket-msgs-${user.uid}`,
              table: 'support_ticket_messages',
              event: '*',
            },
            refresh,
          ),
        ]
      : [
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
              event: '*',
            },
            refresh,
          ),
        ];

    return () => unsubs.forEach((u) => u());
  }, [user.uid, activeTicket?.id, reloadTickets, isStaffInbox]);

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
        onViewChange(null);
      }
    } else {
      setErr(result.errorMessage || 'Could not open ticket.');
    }
  };

  const canSubmitTicket =
    ticketSubject.trim() && (ticketMessage.trim() || ticketImage.file);

  const listTitle = isStaffInbox ? 'Support inbox' : 'Chat with support';
  const listSubtitle = isStaffInbox
    ? 'Neighbors waiting for a reply'
    : 'Private help from our team';

  if (compact) {
    return (
      <div className={className}>
        {!isStaffInbox ? (
          <button
            type="button"
            onClick={() => {
              setErr('');
              onViewChange('new');
            }}
            className="sbn-btn sbn-btn-secondary sbn-btn-sm w-full inline-flex items-center justify-center gap-2 mb-2"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            New conversation
          </button>
        ) : null}
        {ticketsLoading ? (
          <p className="text-xs text-muted text-center px-4 py-6">Loading…</p>
        ) : tickets.length === 0 ? (
          <ChatSectionEmptyState
            icon={LifeBuoy}
            title={isStaffInbox ? 'Inbox is clear' : 'No conversations yet'}
            description={
              isStaffInbox
                ? 'When neighbors open tickets, they will appear here.'
                : 'Start a new conversation to chat with staff.'
            }
          />
        ) : (
          <>
            <ul>
              {(showAllTickets ? tickets : tickets.slice(0, SIDEBAR_PREVIEW)).map((ticket) => (
                <li key={ticket.id}>
                  <SupportTicketRow
                    ticket={ticket}
                    preview={ticketPreviews[ticket.id]}
                    selected={view === 'thread' && activeTicket?.id === ticket.id}
                    showOpener={isStaffInbox}
                    onClick={() => void openThread(ticket)}
                  />
                </li>
              ))}
            </ul>
            {tickets.length > SIDEBAR_PREVIEW && !showAllTickets ? (
              <button
                type="button"
                onClick={() => setShowAllTickets(true)}
                className="w-full px-3 py-2 text-[11px] font-semibold text-accent hover:bg-inset text-left"
              >
                View all {tickets.length} {isStaffInbox ? 'conversations' : 'tickets'}
              </button>
            ) : null}
          </>
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
            onClick={() => onViewChange(null)}
            className="p-2 rounded-full text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-sm text-app">Ask for help</h3>
            <p className="text-xs text-muted">Start a private chat with staff</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollPage
            pinToBottom
            contentClassName="p-4"
            footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
          >
          <div className="sbn-help-card space-y-4 max-w-lg mx-auto">
            {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
            <label className="block space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted">Topic</span>
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
                placeholder="Tell us what is going on — we will reply here in chat."
              />
            </label>
            <ImageAttachmentPicker
              label="Attach a photo (optional)"
              hint="You can send a photo with your message."
              file={ticketImage.file}
              previewUrl={ticketImage.previewUrl}
              onChange={ticketImage.setFile}
              onInvalidFile={setErr}
              disabled={ticketCreating}
            />
            <button
              type="button"
              disabled={ticketCreating || !canSubmitTicket}
              onClick={() => void handleCreateTicket()}
              className="sbn-btn sbn-btn-primary w-full"
            >
              {ticketCreating ? 'Starting…' : 'Start conversation'}
            </button>
          </div>
          </ScrollPage>
        </div>
      </div>
    );
  }

  if (view === 'thread' && activeTicket) {
    const threadTitle = isStaffInbox ? activeTicket.openerName : activeTicket.subject;
    const threadSubtitle = isStaffInbox
      ? activeTicket.subject
      : activeTicket.status === 'open'
        ? 'Chat with support'
        : 'Closed';

    return (
      <div className={`flex flex-col min-h-0 h-full ${className}`}>
        <header className="shrink-0 px-3 py-3 border-b border-app bg-surface flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTicket(null);
              onViewChange(null);
              void reloadTickets();
            }}
            className="p-2 rounded-full text-muted hover:text-app hover:bg-inset shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-sm text-app truncate">{threadTitle}</h3>
            <p className="text-xs text-muted truncate">{threadSubtitle}</p>
          </div>
        </header>
        <div className="flex-1 min-h-0 flex flex-col">
          <SupportTicketThread
            ticket={activeTicket}
            viewer={user}
            showTicketMeta={false}
            onViewRelatedListing={onViewRelatedListing}
            onViewRelatedEvent={onViewRelatedEvent}
            isArchived={supportTicketArchived}
            onArchive={
              onArchiveTicket ? () => onArchiveTicket(activeTicket.id) : undefined
            }
            onUnarchive={
              onUnarchiveTicket ? () => onUnarchiveTicket(activeTicket.id) : undefined
            }
            onClosed={() => {
              void getSupportTicketById(activeTicket.id).then((t) => {
                if (t) setActiveTicket(t);
                void reloadTickets();
              });
            }}
            onDeleted={() => {
              setActiveTicket(null);
              onViewChange(null);
              void reloadTickets();
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
          <h3 className="font-display font-semibold text-sm text-app">{listTitle}</h3>
          <p className="text-xs text-muted">{listSubtitle}</p>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollPage pinToBottom footer={<PageScrollFooter pinToBottom onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}>
        {!isStaffInbox ? (
          <ChatSidebarRow
            id="chat_support_row_new"
            icon={LifeBuoy}
            iconClassName="bg-sky-500/10 text-sky-400"
            title="Open new support chat"
            subtitle="Two-way chat with staff"
            preview="Ask for help — staff will reply in this thread."
            selected={false}
            onClick={() => {
              setErr('');
              onViewChange('new');
            }}
          />
        ) : (
          <div className="px-4 py-2 border-b border-app flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted">Reply to neighbors from here — like a direct message.</p>
            <button
              type="button"
              onClick={() => {
                setErr('');
                onViewChange('new');
              }}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              Need help yourself?
            </button>
          </div>
        )}
        {ticketsLoading ? (
          <p className="text-xs text-muted text-center px-4 py-6">Loading conversations…</p>
        ) : tickets.length === 0 ? (
          <ChatSectionEmptyState
            icon={LifeBuoy}
            title={isStaffInbox ? 'Inbox is clear' : 'No conversations yet'}
            description={
              isStaffInbox
                ? 'When neighbors open tickets, they will appear here.'
                : 'Open new support chat above to talk with staff.'
            }
          />
        ) : (
          <ul>
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <SupportTicketRow
                  ticket={ticket}
                  preview={ticketPreviews[ticket.id]}
                  showOpener={isStaffInbox}
                  onClick={() => void openThread(ticket)}
                />
              </li>
            ))}
          </ul>
        )}
        </ScrollPage>
      </div>
    </div>
  );
}
