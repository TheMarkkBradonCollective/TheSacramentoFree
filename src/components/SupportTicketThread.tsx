import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { UserProfile, SupportTicket, SupportTicketMessage } from '../types';
import {
  addSupportTicketMessage,
  closeSupportTicket,
  deleteSupportTicket,
  deleteSupportTicketMessage,
  getSupportTicketMessages,
} from '../supabase';
import { canDeleteSupportTicket, canUnsendSupportTicketMessage, canViewerAccessTicket } from '../lib/roles';
import RoleBadge from './RoleBadge';
import ListingImage from './ListingImage';
import SupportTicketRelatedPreview from './SupportTicketRelatedPreview';
import { safeHttpUrl } from '../lib/safeUrl';
import ImageAttachmentPicker from './ImageAttachmentPicker';
import { useImageAttachment } from '../hooks/useImageAttachment';
import { debounceRealtime, subscribePostgresChanges } from '../lib/supabaseRealtime';
import { useConfirm } from '../contexts/ConfirmContext';
import { confirmUnsendMessage } from '../lib/destructiveConfirm';
import {
  getMessageGroupMeta,
  messageBubbleClass,
  messageGroupSpacing,
} from '../lib/chatMessageLayout';

interface SupportTicketThreadProps {
  ticket: SupportTicket;
  viewer: UserProfile;
  onClosed?: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  isArchived?: boolean;
  /** Hide ticket meta bar when the parent header already shows context */
  showTicketMeta?: boolean;
  onViewRelatedListing?: (itemId: string) => void;
  onViewRelatedEvent?: (eventId: string) => void;
}

export default function SupportTicketThread({
  ticket,
  viewer,
  onClosed,
  onDeleted,
  onUpdated,
  onArchive,
  onUnarchive,
  isArchived = false,
  showTicketMeta = true,
  onViewRelatedListing,
  onViewRelatedEvent,
}: SupportTicketThreadProps) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const replyImage = useImageAttachment();
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [unsendingMessageId, setUnsendingMessageId] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const { confirm } = useConfirm();

  const canAccess = canViewerAccessTicket(viewer, ticket);
  const isOpen = ticket.status === 'open';
  const messageSenders = useMemo(
    () => messages.map((m) => ({ senderId: m.senderUserId })),
    [messages],
  );

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

    const unsubMessages = subscribePostgresChanges<Record<string, unknown>>(
      {
        channelName: `live-ticket-msgs-${ticket.id}`,
        table: 'support_ticket_messages',
        event: '*',
        filter: `ticketId=eq.${ticket.id}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          if (!row?.id) return;
          if (String(row.senderUserId) === viewer.uid) return;
        }
        void reload();
        if (payload.eventType === 'DELETE') {
          refreshTicket();
        }
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
  }, [ticket.id, viewer.uid, onUpdated, reload]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const restoreUnsentMessageToInput = (text: string) => {
    const restored = text === '📷 Photo' ? '' : text;
    setReply(restored);
    requestAnimationFrame(() => {
      const input = replyRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(0, restored.length);
    });
  };

  const handleUnsendMessage = async (message: SupportTicketMessage) => {
    if (!isOpen || unsendingMessageId) return;
    if (!canUnsendSupportTicketMessage(viewer, message)) return;

    const confirmed = await confirmUnsendMessage(confirm);
    if (!confirmed) return;

    setUnsendingMessageId(message.id);
    setErr('');

    const previousMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const result = await deleteSupportTicketMessage({
      messageId: message.id,
      ticketId: ticket.id,
      actor: viewer,
    });

    if (!result.ok) {
      setMessages(previousMessages);
      setErr(result.errorMessage || 'Could not unsend message.');
    } else {
      restoreUnsentMessageToInput(message.text);
      onUpdated?.();
    }

    setUnsendingMessageId(null);
  };

  const handleSend = async () => {
    const text = reply.trim();
    if (!text && !replyImage.file) return;
    setSending(true);
    setErr('');
    const result = await addSupportTicketMessage({
      ticketId: ticket.id,
      sender: viewer,
      text,
      imageFile: replyImage.file,
    });
    setSending(false);
    if (result.ok) {
      setReply('');
      replyImage.clear();
      await reload();
      onUpdated?.();
    } else {
      setErr(result.errorMessage || 'Could not send message.');
    }
  };

  const handleClose = async () => {
    const confirmed = await confirm({
      message: 'Close this ticket? You can open a new one later if you still need help.',
      confirmLabel: 'Close ticket',
    });
    if (!confirmed) return;
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

  const handleDelete = async () => {
    const confirmed = await confirm({
      message: 'Delete this closed ticket permanently? The conversation cannot be restored.',
      confirmLabel: 'Delete ticket',
      variant: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    setErr('');
    const result = await deleteSupportTicket({ ticketId: ticket.id, user: viewer });
    setDeleting(false);
    if (result.ok) {
      onDeleted?.();
    } else {
      setErr(result.errorMessage || 'Could not delete ticket.');
    }
  };

  if (!canAccess) {
    return (
      <p className="p-4 text-sm text-muted text-center sbn-help-empty">You do not have access to this ticket.</p>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {showTicketMeta ? (
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
      ) : null}

      {(ticket.relatedItemId || ticket.relatedEventId) && (
        <div className="shrink-0 px-4 py-3 border-b border-app">
          <SupportTicketRelatedPreview
            ticket={ticket}
            onViewListing={onViewRelatedListing}
            onViewEvent={onViewRelatedEvent}
          />
        </div>
      )}

      {err && <p className="px-4 py-2 text-xs font-semibold text-red-400">{err}</p>}

      <div className="chat-thread-bg flex-1 min-h-0 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-muted text-center py-6">Loading messages…</p>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderUserId === viewer.uid;
            const showText = msg.text && msg.text !== '📷 Photo';
            const showUnsend = isOpen && isMine && canUnsendSupportTicketMessage(viewer, msg);
            const isUnsending = unsendingMessageId === msg.id;
            const groupMeta = getMessageGroupMeta(messageSenders, index, viewer.uid, {
              showNames: true,
            });

            return (
              <div
                key={msg.id}
                className={`flex ${messageGroupSpacing(groupMeta)} ${
                  isMine ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex min-w-0 max-w-[min(85%,24rem)] flex-col ${
                    isMine ? 'items-end' : 'items-start'
                  }`}
                >
                  {groupMeta.showSenderName && (
                    <p className="mb-0.5 px-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                      {msg.senderName}
                    </p>
                  )}
                  <div className={messageBubbleClass(isMine, groupMeta)}>
                  {msg.imageUrl && (
                    (() => {
                      const safeHref = safeHttpUrl(msg.imageUrl);
                      const image = (
                        <ListingImage
                          src={msg.imageUrl}
                          alt="Attached photo"
                          width={320}
                          className="w-full max-h-52 object-contain bg-black/10"
                        />
                      );
                      if (!safeHref) {
                        return (
                          <div
                            className={`block rounded-lg overflow-hidden mb-1.5 ${isMine ? 'ring-1 ring-white/20' : 'border border-app'}`}
                          >
                            {image}
                          </div>
                        );
                      }
                      return (
                        <a
                          href={safeHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block rounded-lg overflow-hidden mb-1.5 ${isMine ? 'ring-1 ring-white/20' : 'border border-app'}`}
                        >
                          {image}
                        </a>
                      );
                    })()
                  )}
                  {showText && (
                    <p className="leading-snug whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {groupMeta.isLastInGroup && (
                    <div
                      className={`mt-1 flex items-center gap-1 ${
                        isMine ? 'justify-end' : 'justify-between'
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
                      <p className={`text-[9px] ${isMine ? 'text-white/70' : 'text-muted'}`}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isOpen ? (
        <div className="shrink-0 p-4 border-t border-app bg-surface space-y-2 sbn-input-tray">
          <textarea
            ref={replyRef}
            className="sbn-input text-sm min-h-[4rem] resize-none"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            disabled={sending}
          />
          <ImageAttachmentPicker
            label="Attach photo"
            file={replyImage.file}
            previewUrl={replyImage.previewUrl}
            onChange={replyImage.setFile}
            onInvalidFile={setErr}
            disabled={sending}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing || sending || deleting}
              className="sbn-btn sbn-btn-secondary flex-1 text-sm"
            >
              {closing ? 'Closing…' : 'Close ticket'}
            </button>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || deleting || (!reply.trim() && !replyImage.file)}
              className="sbn-btn sbn-btn-primary flex-1 text-sm"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 p-4 border-t border-app bg-surface space-y-2">
          {isArchived ? (
            onUnarchive ? (
              <button
                type="button"
                onClick={onUnarchive}
                className="sbn-btn sbn-btn-secondary w-full text-sm"
              >
                Unarchive ticket
              </button>
            ) : null
          ) : onArchive ? (
            <button
              type="button"
              onClick={onArchive}
              className="sbn-btn sbn-btn-secondary w-full text-sm"
            >
              Archive ticket
            </button>
          ) : null}
          {canDeleteSupportTicket(viewer, ticket) ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="sbn-btn sbn-btn-secondary w-full text-sm text-red-400 border-red-500/30 hover:bg-red-500/10"
            >
              {deleting ? 'Deleting…' : 'Delete closed ticket'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
