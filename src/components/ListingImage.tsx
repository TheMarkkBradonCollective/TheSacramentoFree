import { useEffect, useMemo, useState } from 'react';
import { optimizedImageUrl } from '../lib/imageUrl';

interface ListingImageProps {
  src: string | undefined | null;
  alt?: string;
  className?: string;
  /** Target width for Supabase transform / cache-friendly sizing */
  width?: number;
  priority?: boolean;
}

export default function ListingImage({
  src,
  alt = '',
  className = '',
  width = 640,
  priority = false,
}: ListingImageProps) {
  const original = src || '';
  const optimized = useMemo(
    () => optimizedImageUrl(original, { width, quality: 78 }),
    [original, width],
  );
  const [currentSrc, setCurrentSrc] = useState(optimized || original);

  useEffect(() => {
    setCurrentSrc(optimized || original);
  }, [optimized, original]);

  if (!original) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => {
        if (currentSrc !== original) setCurrentSrc(original);
      }}
    />
  );
}
