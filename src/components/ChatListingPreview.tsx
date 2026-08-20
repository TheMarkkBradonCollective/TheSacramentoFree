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
      className="item-feed-card w-full text-left hover:border-accent/40 transition-colors flex items-stretch overflow-hidden"
    >
      <span className="w-[4.25rem] min-h-[4.25rem] shrink-0 bg-inset border-r border-app flex items-center justify-center text-accent">
        <Gift className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1 p-2.5 text-left">
        <span className="sbn-badge sbn-badge-give text-[8px] px-1 py-0 leading-none whitespace-nowrap">
          Listing
        </span>
        <p className="text-sm font-display font-bold text-app truncate mt-1">{itemTitle}</p>
        <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
          <ExternalLink className="w-3 h-3 shrink-0" />
          Open listing
        </p>
      </span>
    </button>
  );
}
