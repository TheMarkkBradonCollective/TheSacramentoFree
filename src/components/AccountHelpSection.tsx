import { useCallback, useEffect, useState } from 'react';
import { UserProfile, SupportTicket } from '../types';
import {
  submitUserReport,
  createSupportTicket,
  getSupportTicketsForUser,
  getSupportTicketById,
} from '../supabase';
import FullScreenPanel from './FullScreenPanel';
import SupportTicketThread from './SupportTicketThread';
import { Flag, LifeBuoy, MessageSquarePlus, ChevronRight } from 'lucide-react';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

interface AccountHelpSectionProps {
  user: UserProfile;
}

type Panel = 'report' | 'tickets' | 'newTicket' | 'thread' | null;

export default function AccountHelpSection({ user }: AccountHelpSectionProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCreating, setTicketCreating] = useState(false);
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
    if (panel === 'tickets' || panel === 'thread') void reloadTickets();
  }, [panel, reloadTickets]);

  useEffect(() => {
    if (panel !== 'tickets' && panel !== 'thread') return;

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
          channelName: `live-my-tickets-${user.uid}`,
          table: 'support_tickets',
          event: '*',
          filter: `openerUserId=eq.${user.uid}`,
        },
        refresh,
      ),
      subscribePostgresChanges(
        { channelName: `live-my-ticket-msgs-${user.uid}`, table: 'support_ticket_messages', event: 'INSERT' },
        refresh,
      ),
    ];

    return () => unsubs.forEach((u) => u());
  }, [panel, user.uid, activeTicket?.id, reloadTickets]);

  const openThread = async (ticket: SupportTicket) => {
    const fresh = await getSupportTicketById(ticket.id);
    setActiveTicket(fresh ?? ticket);
    setPanel('thread');
  };

  const handleSubmitReport = async () => {
    setReportSending(true);
    setErr('');
    const result = await submitUserReport({
      reporter: user,
      subject: reportSubject,
      body: reportBody,
    });
    setReportSending(false);
    if (result.ok) {
      setReportSent(true);
      setReportSubject('');
      setReportBody('');
    } else {
      setErr(result.errorMessage || 'Could not send report.');
    }
  };

  const handleCreateTicket = async () => {
    setTicketCreating(true);
    setErr('');
    const result = await createSupportTicket({
      opener: user,
      subject: ticketSubject,
      message: ticketMessage,
    });
    setTicketCreating(false);
    if (result.ok && result.ticketId) {
      setTicketSubject('');
      setTicketMessage('');
      await reloadTickets();
      const ticket = await getSupportTicketById(result.ticketId);
      if (ticket) {
        setActiveTicket(ticket);
        setPanel('thread');
      } else {
        setPanel('tickets');
      }
    } else {
      setErr(result.errorMessage || 'Could not open ticket.');
    }
  };

  const closePanel = () => {
    setPanel(null);
    setActiveTicket(null);
    setErr('');
    setReportSent(false);
  };

  return (
    <div className="space-y-3" id="account_help_section">
      <h3 className="font-display font-bold text-sm text-app">Help & safety</h3>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPanel('report')}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm inline-flex items-center gap-1.5"
        >
          <Flag className="w-4 h-4" />
          Send a report
        </button>
        <button
          type="button"
          onClick={() => setPanel('tickets')}
          className="sbn-btn sbn-btn-secondary sbn-btn-sm inline-flex items-center gap-1.5"
        >
          <LifeBuoy className="w-4 h-4" />
          Support tickets
        </button>
      </div>
      <p className="text-[10px] text-muted leading-snug">
        Reports are one-way — staff review them but you will not get a reply. For personal help, open a support ticket.
      </p>

      {panel === 'report' && (
        <FullScreenPanel title="Send a report" subtitle="No follow-up — staff will review" onClose={closePanel}>
          <div className="p-4 space-y-4 max-w-lg mx-auto">
            {reportSent ? (
              <div className="text-center py-8 space-y-2">
                <p className="font-display font-bold text-app">Report received</p>
                <p className="text-sm text-muted">
                  Thank you. Moderators will review this. You do not need to do anything else.
                </p>
                <button type="button" onClick={closePanel} className="sbn-btn sbn-btn-primary mt-4">
                  Done
                </button>
              </div>
            ) : (
              <>
                {err && <p className="text-xs font-semibold text-red-400">{err}</p>}
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">Subject</span>
                  <input
                    className="sbn-input text-sm"
                    value={reportSubject}
                    onChange={(e) => setReportSubject(e.target.value)}
                    placeholder="Brief summary"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted">What happened?</span>
                  <textarea
                    className="sbn-input text-sm min-h-[8rem]"
                    value={reportBody}
                    onChange={(e) => setReportBody(e.target.value)}
                    placeholder="Describe the issue. Include neighbor names or post details if relevant."
                  />
                </label>
                <button
                  type="button"
                  disabled={reportSending || !reportSubject.trim() || !reportBody.trim()}
                  onClick={() => void handleSubmitReport()}
                  className="sbn-btn sbn-btn-primary w-full"
                >
                  {reportSending ? 'Sending…' : 'Submit report'}
                </button>
              </>
            )}
          </div>
        </FullScreenPanel>
      )}

      {panel === 'tickets' && (
        <FullScreenPanel title="My support tickets" subtitle="One-on-one help from staff" onClose={closePanel}>
          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setErr('');
                setPanel('newTicket');
              }}
              className="sbn-btn sbn-btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Open new ticket
            </button>

            {ticketsLoading ? (
              <p className="text-sm text-muted text-center py-6">Loading tickets…</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">No tickets yet.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(ticket)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-app bg-surface text-left hover:bg-inset/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-app truncate">{ticket.subject}</p>
                        <p className="text-[11px] text-muted">
                          {ticket.status === 'open' ? 'Open' : 'Closed'}
                          {' · '}
                          {new Date(ticket.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </FullScreenPanel>
      )}

      {panel === 'newTicket' && (
        <FullScreenPanel title="Open support ticket" subtitle="Staff will reply here" onClose={() => setPanel('tickets')}>
          <div className="p-4 space-y-4 max-w-lg mx-auto">
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
            <button
              type="button"
              disabled={ticketCreating || !ticketSubject.trim() || !ticketMessage.trim()}
              onClick={() => void handleCreateTicket()}
              className="sbn-btn sbn-btn-primary w-full"
            >
              {ticketCreating ? 'Opening…' : 'Open ticket'}
            </button>
          </div>
        </FullScreenPanel>
      )}

      {panel === 'thread' && activeTicket && (
        <FullScreenPanel
          title={activeTicket.subject}
          subtitle={activeTicket.status === 'open' ? 'Support conversation' : 'Closed'}
          fillBody
          onClose={() => {
            setActiveTicket(null);
            setPanel('tickets');
            void reloadTickets();
          }}
        >
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
        </FullScreenPanel>
      )}
    </div>
  );
}
