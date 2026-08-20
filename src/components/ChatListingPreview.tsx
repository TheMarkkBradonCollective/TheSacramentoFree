import { ExternalLink, Gift } from 'lucide-react';

interface ChatListingPreviewProps {
  itemId: string;
  itemTitle: string;
  onViewListing?: (itemId: string) => void;
}

export default function ChatListingPreview({ itemId, itemTitle, onViewListing }: ChatListingPreviewProps) {
  return (
    <button
      type="button"
      onClick={() => onViewListing?.(itemId)}
      className="w-full text-left rounded-xl border border-accent/25 bg-accent/5 hover:bg-accent/10 transition-colors p-3 flex items-start gap-3"
    >
      <span className="p-2 rounded-lg bg-accent/15 text-accent shrink-0">
        <Gift className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent">Related listing</p>
        <p className="text-sm font-bold text-app truncate mt-0.5">{itemTitle}</p>
        <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Open listing preview
        </p>
      </div>
    </button>
  );
}
