import { CalendarDays, ExternalLink } from 'lucide-react';

interface ChatEventPreviewProps {
  eventId: string;
  eventTitle: string;
  onViewEvent?: (eventId: string) => void;
}

export default function ChatEventPreview({ eventId, eventTitle, onViewEvent }: ChatEventPreviewProps) {
  return (
    <button
      type="button"
      onClick={() => onViewEvent?.(eventId)}
      className="item-feed-card w-full text-left hover:border-accent/40 transition-colors flex items-stretch overflow-hidden"
    >
      <span className="w-[4.25rem] min-h-[4.25rem] shrink-0 bg-inset border-r border-app flex items-center justify-center text-accent">
        <CalendarDays className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1 p-2.5 text-left">
        <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap">
          Event
        </span>
        <p className="text-sm font-display font-bold text-app truncate mt-1">{eventTitle}</p>
        <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Open event
        </p>
      </span>
    </button>
  );
}
