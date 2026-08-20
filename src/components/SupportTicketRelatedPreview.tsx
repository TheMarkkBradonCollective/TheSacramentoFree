import type { SupportTicket } from '../types';
import ChatListingPreview from './ChatListingPreview';
import ChatEventPreview from './ChatEventPreview';

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
      <ChatListingPreview
        itemId={ticket.relatedItemId}
        itemTitle={ticket.relatedItemTitle}
        onViewListing={onViewListing}
      />
    );
  }

  if (ticket.relatedEventId && ticket.relatedEventTitle) {
    return (
      <ChatEventPreview
        eventId={ticket.relatedEventId}
        eventTitle={ticket.relatedEventTitle}
        onViewEvent={onViewEvent}
      />
    );
  }

  return null;
}
