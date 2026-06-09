import { useMemo, useState } from 'react';
import { AlertCircle, Eye, MapPin, Search } from 'lucide-react';
import { ItemPost } from '../../types';
import { stripListingMetadata } from '../../lib/itemLocation';
import { extractListingImageUrls } from '../../lib/listingContent';
import ListingImage from '../ListingImage';
import HorizontalSnapRow, { SnapSlide } from '../HorizontalSnapRow';
import { DepthPanel } from './HomeScrollStage';
import { SITE } from '../../siteContent';

interface GuestListingPreviewProps {
  items: ItemPost[];
  isLoading?: boolean;
  onViewItem: (item: ItemPost) => void;
  onRequireSignIn: () => void;
  /** When nested inside HomeScrollStage DepthSection */
  embedded?: boolean;
}

export default function GuestListingPreview({
  items,
  isLoading = false,
  onViewItem,
  onRequireSignIn,
  embedded = false,
}: GuestListingPreviewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const previewItems = useMemo(() => {
    const active = items.filter((item) => item.status === 'active');
    const q = searchTerm.trim().toLowerCase();
    if (!q) return active;
    return active.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.category} ${item.neighborhood}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchTerm]);

  return (
    <section className={embedded ? '' : 'mt-14'} id={embedded ? undefined : 'guest_listing_preview'}>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-app">Live neighborhood listings</h2>
          <p className="mt-1 text-sm text-muted">
            Browse what neighbors are giving and looking for. Sign in to message, comment, or claim.
          </p>
        </div>
        <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary shrink-0">
          Sign in to interact
        </button>
      </div>

      <DepthPanel className="mb-4">
        <div className="sbn-card p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search listings…"
              className="sbn-input pl-11"
              aria-label="Search listings"
            />
          </div>
        </div>
      </DepthPanel>

      {isLoading ? (
        <p className="text-sm text-muted text-center py-12">Loading listings…</p>
      ) : previewItems.length === 0 ? (
        <DepthPanel>
          <div className="sbn-card text-center py-12 px-6 border-dashed">
            <AlertCircle className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="font-display font-bold text-app">No active listings right now</p>
            <p className="text-sm text-muted mt-2">{SITE.tagline}</p>
            <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary mt-4">
              Sign in to post the first one
            </button>
          </div>
        </DepthPanel>
      ) : (
        <HorizontalSnapRow label="Live neighborhood listings">
          {previewItems.map((item) => {
            const photos = item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item);
            const cover = photos[0];
            const preview = stripListingMetadata(item.description);

            return (
              <SnapSlide key={item.id} className="w-[min(100%,19rem)] sm:w-[min(85%,20rem)]">
                <article className="sbn-card overflow-hidden flex flex-col text-left h-full">
                  <button
                    type="button"
                    onClick={() => onViewItem(item)}
                    className="relative aspect-[16/10] bg-inset w-full cursor-pointer"
                  >
                    {cover ? (
                      <ListingImage src={cover} alt={item.title} width={640} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-subtle text-xs">
                        No photo
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 sbn-badge text-[10px] ${
                        item.type === 'giveaway' ? 'sbn-badge-give' : 'sbn-badge-ask'
                      }`}
                    >
                      {item.type === 'giveaway' ? 'Giving' : 'Looking for'}
                    </span>
                  </button>

                  <div className="p-4 flex flex-col flex-1">
                    <button type="button" onClick={() => onViewItem(item)} className="text-left cursor-pointer">
                      <h3 className="font-display font-bold text-app leading-snug line-clamp-2">{item.title}</h3>
                      {preview && (
                        <p className="text-sm text-muted mt-1.5 line-clamp-2 leading-relaxed">{preview}</p>
                      )}
                    </button>

                    <p className="text-xs text-muted mt-2 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                      {item.neighborhood}
                    </p>

                    <div className="mt-auto pt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onViewItem(item)}
                        className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={onRequireSignIn}
                        className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1"
                      >
                        Sign in
                      </button>
                    </div>
                  </div>
                </article>
              </SnapSlide>
            );
          })}
        </HorizontalSnapRow>
      )}
    </section>
  );
}
