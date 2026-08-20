import { useState } from 'react';
import ListingImage from './ListingImage';
import ImageLightbox from './ImageLightbox';

interface ListingPhotoGalleryProps {
  urls: string[];
  title: string;
  className?: string;
}

export default function ListingPhotoGallery({ urls, title, className = '' }: ListingPhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (urls.length === 0) return null;

  const active = urls[Math.min(activeIndex, urls.length - 1)];

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="aspect-[4/3] sm:aspect-video bg-inset overflow-hidden relative w-full block cursor-zoom-in"
        aria-label="View full size photo"
      >
        <ListingImage
          src={active}
          alt={title}
          width={960}
          priority
          className="w-full h-full object-cover"
        />
        {urls.length > 1 && (
          <span className="absolute bottom-3 right-3 text-[10px] font-bold uppercase tracking-wide bg-black/70 text-white px-2 py-1 rounded-full">
            {activeIndex + 1} / {urls.length}
          </span>
        )}
      </button>
      {lightboxOpen && (
        <ImageLightbox src={active} alt={title} onClose={() => setLightboxOpen(false)} />
      )}
      {urls.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto bg-inset/50 border-t border-app">
          {urls.map((url, i) => (
            <button
              key={`${url}_${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show photo ${i + 1} of ${urls.length}`}
              aria-current={i === activeIndex}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                i === activeIndex ? 'border-accent' : 'border-app opacity-80 hover:opacity-100'
              }`}
            >
              <ListingImage src={url} alt="" width={128} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
