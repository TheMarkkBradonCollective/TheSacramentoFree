import { Fragment, useMemo, useState } from 'react';
import { AlertCircle, MapPin, Search } from 'lucide-react';
import { ItemPost } from '../../../types';
import { stripListingMetadata } from '../../../lib/itemLocation';
import { getPostTypeGridBadgeLabel } from '../../../lib/postType';
import { extractListingImageUrls } from '../../../lib/listingContent';
import ListingImage from '../../ListingImage';
import { NEWSPAPER } from '../../../preview/newspaperBrand';

interface NewspaperClassifiedsProps {
  items: ItemPost[];
  isLoading?: boolean;
  onViewItem: (item: ItemPost) => void;
  onRequireSignIn: () => void;
}

export default function NewspaperClassifieds({
  items,
  isLoading = false,
  onViewItem,
  onRequireSignIn,
}: NewspaperClassifiedsProps) {
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
    <section className="tsf-section" id="guest_listing_preview">
      <div className="tsf-section-head">
        <div>
          <p className="tsf-kicker">Free to a good home</p>
          <h2 className="tsf-section-hed">{NEWSPAPER.classifiedsHed}</h2>
          <p className="tsf-section-dek">{NEWSPAPER.classifiedsDek}</p>
        </div>
        <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary shrink-0">
          Place a notice
        </button>
      </div>

      <div className="tsf-search">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle pointer-events-none" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search classifieds…"
          className="sbn-input pl-10"
          aria-label="Search classifieds"
        />
      </div>

      {isLoading && items.length === 0 ? (
        <p className="text-sm text-muted text-center py-12">Setting the type…</p>
      ) : previewItems.length === 0 ? (
        <div className="tsf-empty">
          <AlertCircle className="w-8 h-8 text-muted mx-auto mb-3" />
          <p className="font-display font-bold text-app">No notices on the board</p>
          <p className="text-sm text-muted mt-2">{NEWSPAPER.tagline}</p>
          <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary mt-4">
            Post the first classified
          </button>
        </div>
      ) : (
        <div className="tsf-classifieds-grid">
          {previewItems.map((item) => {
            const photos = item.imageUrls?.length ? item.imageUrls : extractListingImageUrls(item);
            const cover = photos[0];
            const preview = stripListingMetadata(item.description);

            return (
              <Fragment key={item.id}>
                <article className="tsf-classified">
                  <button
                    type="button"
                    onClick={() => onViewItem(item)}
                    className="tsf-classified-media"
                    aria-label={`Read ${item.title || 'classified'}`}
                  >
                    {cover ? (
                      <ListingImage src={cover} alt={item.title} width={640} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-subtle text-[10px] uppercase tracking-widest">No engraving</span>
                    )}
                  </button>
                  <p className="tsf-classified-flag">{getPostTypeGridBadgeLabel(item.type)}</p>
                  <button type="button" onClick={() => onViewItem(item)} className="text-left w-full">
                    <h3 className="tsf-classified-hed">{item.title}</h3>
                    {preview && <p className="tsf-classified-dek">{preview}</p>}
                  </button>
                  <p className="tsf-classified-where">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {item.neighborhood}
                  </p>
                  <div className="tsf-classified-actions">
                    <button type="button" onClick={() => onViewItem(item)} className="sbn-btn sbn-btn-secondary sbn-btn-sm flex-1">
                      Read
                    </button>
                    <button type="button" onClick={onRequireSignIn} className="sbn-btn sbn-btn-primary sbn-btn-sm flex-1">
                      Reply
                    </button>
                  </div>
                </article>
              </Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
}
