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
      className="w-full text-left rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 transition-colors p-3 flex items-start gap-3"
    >
      <span className="p-2 rounded-lg bg-fuchsia-500/15 text-fuchsia-400 shrink-0">
        <CalendarDays className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Related event</p>
        <p className="text-sm font-bold text-app truncate mt-0.5">{eventTitle}</p>
        <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Open event preview
        </p>
      </div>
    </button>
  );
}
