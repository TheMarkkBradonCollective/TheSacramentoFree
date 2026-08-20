import { dicebearAvatar } from './presence';
import { optimizedImageUrl } from './imageUrl';

/** Prefer live profile photo, then denormalized snapshot, then stable dicebear from uid. */
export function resolveProfilePhoto(options: {
  live?: string | null;
  snapshot?: string | null;
  uid: string;
  name?: string;
}): string {
  const raw = options.live?.trim() || options.snapshot?.trim();
  if (raw) {
    return optimizedImageUrl(raw, { width: 96, quality: 80 }) || raw;
  }
  return dicebearAvatar(options.uid || options.name || 'neighbor');
}
