import { useEffect, useMemo, useState } from 'react';
import { optimizedImageUrl } from '../lib/imageUrl';

interface ListingImageProps {
  src: string | undefined | null;
  alt?: string;
  className?: string;
  /** Target width for Supabase transform / cache-friendly sizing */
  width?: number;
  priority?: boolean;
  onLoadError?: () => void;
}

function objectPublicFallback(url: string): string | null {
  if (!url.includes('/storage/v1/render/image/public/')) return null;
  return url.replace('/storage/v1/render/image/public/', '/storage/v1/object/public/').replace(/\?.*$/, '');
}

export default function ListingImage({
  src,
  alt = '',
  className = '',
  width = 640,
  priority = false,
  onLoadError,
}: ListingImageProps) {
  const original = src || '';
  const optimized = useMemo(
    () => optimizedImageUrl(original, { width, quality: 78 }),
    [original, width],
  );
  const [currentSrc, setCurrentSrc] = useState(optimized || original);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(optimized || original);
    setFailed(false);
  }, [optimized, original]);

  if (!original || failed) return null;

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
        if (currentSrc !== original) {
          setCurrentSrc(original);
          return;
        }
        const objectUrl = objectPublicFallback(original);
        if (objectUrl && currentSrc !== objectUrl) {
          setCurrentSrc(objectUrl);
          return;
        }
        setFailed(true);
        onLoadError?.();
      }}
    />
  );
}
