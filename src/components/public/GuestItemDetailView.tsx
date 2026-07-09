import { useEffect, useRef } from 'react';
import { ArrowLeft, MapPin, MessageSquare } from 'lucide-react';
import { ItemPost } from '../../types';
import { canViewerSeeExactLocation, parseTradeSeeking } from '../../lib/itemLocation';
import { getPostTypeBadgeClass, getPostTypeLabel } from '../../lib/postType';
import { extractListingImageUrls, getListingDetailsText } from '../../lib/listingContent';
import ListingPhotoGallery from '../ListingPhotoGallery';

interface GuestItemDetailViewProps {
  item: ItemPost;
  onClose: () => void;
  onRequireSignIn: () => void;
}

export default function GuestItemDetailView({ item, onClose, onRequireSignIn }: GuestItemDetailViewProps) {
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const photos = item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item);
  const detailsText = getListingDetailsText(item.description);
  const showExact = canViewerSeeExactLocation(item, undefined);
  const tradeSeeking = item.type === 'trade' ? parseTradeSeeking(item.description) : null;

  useEffect(() => {
    backButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] bg-app overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest_item_detail_title"
      id="guest_item_detail"
    >
      <header className="sticky top-0 z-10 sbn-glass-nav sbn-safe-top px-4 min-h-14 flex items-center gap-3">
        <button
          ref={backButtonRef}
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-inset text-app"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 id="guest_item_detail_title" className="font-display font-bold text-base text-app truncate flex-1">
          Listing preview
        </h1>
      </header>

      <div className="sbn-page-content pb-32">
        <ListingPhotoGallery urls={photos} title={item.title} />

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className={`sbn-badge ${getPostTypeBadgeClass(item.type)}`}>
              {getPostTypeLabel(item.type)}
            </span>
            <span className="sbn-badge">{item.category}</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-app">{item.title}</h2>

          {tradeSeeking && (
            <p className="text-sm text-app leading-relaxed">
              <span className="font-semibold text-purple-400">Seeking in trade: </span>
              {tradeSeeking}
            </p>
          )}

          {detailsText && <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{detailsText}</p>}

          <div className="sbn-card p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Pickup area</p>
            <p className="text-sm text-app flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent shrink-0" />
              {item.neighborhood}
            </p>
            {!showExact && (
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Sign in to coordinate pickup and see exact location when the poster shares it.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent-soft/30 p-4 text-sm text-app leading-relaxed">
            You are browsing as a guest. Sign in to message the poster, comment, vote, or claim items.
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 sbn-glass-nav border-t border-app safe-area-pb">
        <div className="max-w-2xl mx-auto flex gap-2">
          <button type="button" onClick={onClose} className="sbn-btn sbn-btn-secondary flex-1">
            Back
          </button>
          <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary flex-1">
            <MessageSquare className="w-4 h-4" />
            Sign in to interact
          </button>
        </div>
      </div>
    </div>
  );
}
