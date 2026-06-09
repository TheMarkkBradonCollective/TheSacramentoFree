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
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { Flag, LifeBuoy, MessageSquarePlus, ChevronRight, Megaphone, Star } from 'lucide-react';
import UpdatesList from './UpdatesList';
import CommunityReviews from './CommunityReviews';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';

interface AccountHelpSectionProps {
  user: UserProfile;
}

type Panel = 'report' | 'tickets' | 'newTicket' | 'thread' | 'updates' | 'reviews' | null;

export default function AccountHelpSection({ user }: AccountHelpSectionProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const [reportSubject, setReportSubject] = useState('');
  const [reportBody, setReportBody] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const reportProof = useImageAttachment();
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
      proofFile: reportProof.file,
    });
    setReportSending(false);
    if (result.ok) {
      setReportSent(true);
      setReportSubject('');
      setReportBody('');
      reportProof.clear();
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
    reportProof.clear();
    ticketImage.clear();
  };

  const canSubmitTicket =
    ticketSubject.trim() && (ticketMessage.trim() || ticketImage.file);

  return (
    <div className="space-y-3" id="account_help_section">
      <h3 className="font-display font-bold text-sm text-app">Help & safety</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => setPanel('updates')} className="sbn-help-list-item">
          <span className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
            <Megaphone className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">App updates</span>
            <span className="text-[11px] text-muted">See what&apos;s new and vote on changes</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button type="button" onClick={() => setPanel('reviews')} className="sbn-help-list-item">
          <span className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Star className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Community reviews</span>
            <span className="text-[11px] text-muted">Read all reviews — post or edit yours</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => setPanel('report')}
          className="sbn-help-list-item"
        >
          <span className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
            <Flag className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Send a report</span>
            <span className="text-[11px] text-muted">One-way — staff review only</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => setPanel('tickets')}
          className="sbn-help-list-item"
        >
          <span className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
            <LifeBuoy className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-sm text-app block">Support tickets</span>
            <span className="text-[11px] text-muted">Get personal help from staff</span>
          </span>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </button>
      </div>
      <p className="text-[10px] text-muted leading-snug">
        Reports are one-way — staff review them but you will not get a reply. For personal help, open a support ticket.
      </p>

      {panel === 'updates' && (
        <FullScreenPanel
          wide
          title="App updates"
          subtitle="Tap an update to read more — your votes go to the director"
          onClose={closePanel}
        >
          <UpdatesList userProfile={user} />
        </FullScreenPanel>
      )}

      {panel === 'reviews' && (
        <FullScreenPanel
          wide
          title="Community reviews"
          subtitle="Read neighbor feedback and share your own"
          onClose={closePanel}
        >
          <CommunityReviews userProfile={user} />
        </FullScreenPanel>
      )}

      {panel === 'report' && (
        <FullScreenPanel title="Send a report" subtitle="No follow-up — staff will review" onClose={closePanel}>
          {reportSent ? (
            <div className="sbn-help-empty space-y-2">
              <p className="font-display font-bold text-app">Report received</p>
              <p className="text-sm text-muted">
                Thank you. Moderators will review this. You do not need to do anything else.
              </p>
              <button type="button" onClick={closePanel} className="sbn-btn sbn-btn-primary mt-2">
                Done
              </button>
            </div>
          ) : (
            <div className="sbn-help-card space-y-4">
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
              <ImageAttachmentPicker
                label="Screenshot proof (optional)"
                hint="Attach a screenshot if it helps staff understand the issue."
                file={reportProof.file}
                previewUrl={reportProof.previewUrl}
                onChange={reportProof.setFile}
                disabled={reportSending}
              />
              <button
                type="button"
                disabled={reportSending || !reportSubject.trim() || !reportBody.trim()}
                onClick={() => void handleSubmitReport()}
                className="sbn-btn sbn-btn-primary w-full"
              >
                {reportSending ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          )}
        </FullScreenPanel>
      )}

      {panel === 'tickets' && (
        <FullScreenPanel
          wide
          title="My support tickets"
          subtitle="One-on-one help from staff"
          onClose={closePanel}
        >
          <div className="space-y-3">
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
              <p className="text-sm text-muted sbn-help-empty">Loading tickets…</p>
            ) : tickets.length === 0 ? (
              <div className="sbn-help-empty">
                <p className="text-sm text-muted">No tickets yet.</p>
                <p className="text-[11px] text-muted mt-1">Open a ticket above if you need help from staff.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(ticket)}
                      className="sbn-help-list-item"
                    >
                      <span className="min-w-0 flex-1">
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
          </div>
        </FullScreenPanel>
      )}

      {panel === 'newTicket' && (
        <FullScreenPanel title="Open support ticket" subtitle="Staff will reply here" onClose={() => setPanel('tickets')}>
          <div className="sbn-help-card space-y-4">
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
        </FullScreenPanel>
      )}

      {panel === 'thread' && activeTicket && (
        <FullScreenPanel
          wide
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
