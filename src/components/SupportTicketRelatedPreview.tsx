import { CalendarDays, ExternalLink, Gift } from 'lucide-react';
import type { SupportTicket } from '../types';

interface SupportTicketRelatedPreviewProps {
  ticket: SupportTicket;
  onViewListing?: (itemId: string) => void;
  onViewEvent?: (eventId: string) => void;
}

export default function SupportTicketRelatedPreview({
  ticket,
  onViewListing,
  onViewEvent,
}: SupportTicketRelatedPreviewProps) {
  if (ticket.relatedItemId && ticket.relatedItemTitle) {
    return (
      <button
        type="button"
        onClick={() => onViewListing?.(ticket.relatedItemId!)}
        className="w-full text-left rounded-xl border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-colors p-3 flex items-start gap-3"
      >
        <span className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
          <Gift className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">Related listing</p>
          <p className="text-sm font-bold text-app truncate mt-0.5">{ticket.relatedItemTitle}</p>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <ExternalLink className="w-3 h-3 shrink-0" />
            Open listing preview
          </p>
        </div>
      </button>
    );
  }

  if (ticket.relatedEventId && ticket.relatedEventTitle) {
    return (
      <button
        type="button"
        onClick={() => onViewEvent?.(ticket.relatedEventId!)}
        className="w-full text-left rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 transition-colors p-3 flex items-start gap-3"
      >
        <span className="p-2 rounded-lg bg-fuchsia-500/15 text-fuchsia-400 shrink-0">
          <CalendarDays className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Related event</p>
          <p className="text-sm font-bold text-app truncate mt-0.5">{ticket.relatedEventTitle}</p>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <ExternalLink className="w-3 h-3 shrink-0" />
            Open event preview
          </p>
        </div>
      </button>
    );
  }

  return null;
}
