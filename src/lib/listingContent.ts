import { ItemPost } from '../types';

export const MAX_LISTING_PHOTOS = 6;

const DETAILS_BLOCK_RE = /\[DETAILS\]([\s\S]*?)\[\/DETAILS\]/i;
const PICKUP_NOTES_BLOCK_RE = /\[PICKUP_NOTES\]([\s\S]*?)\[\/PICKUP_NOTES\]/i;
const PHOTOS_TAG_RE = /\[PHOTOS:\s*([^\]]+)\]/i;
const LEGACY_PHOTO_RE = /\[Photo\]:\s*(\S+)/gi;

export function parseListingDetails(description: string): string {
  const match = (description || '').match(DETAILS_BLOCK_RE);
  return match ? match[1].trim() : '';
}

export function parsePickupNotes(description: string): string {
  const match = (description || '').match(PICKUP_NOTES_BLOCK_RE);
  return match ? match[1].trim() : '';
}

/** User-facing item description (excludes pickup notes and machine tags). */
export function getListingDetailsText(description: string): string {
  const fromBlock = parseListingDetails(description);
  if (fromBlock) return fromBlock;

  let text = description || '';
  text = text.replace(/^\[TRANSPORT:\s*.+?\]\s*\n\n/s, '');
  text = text.replace(/\[PICKUP_NOTES\][\s\S]*?\[\/PICKUP_NOTES\]\s*/gi, '');
  text = text.replace(/\[DETAILS\][\s\S]*?\[\/DETAILS\]\s*/gi, '');
  text = text.replace(/\[LOCATION:\s*(public|private)\]\s*/gi, '');
  text = text.replace(/\n\n\[GPS:\s*[\d.]+,[\d.]+\]\s*/g, '');
  text = text.replace(/\n\n\[PHOTOS:[^\]]+\]\s*/gi, '');
  text = text.replace(/\n\n\[Photo\]:\s*https?:\/\/\S+\s*/g, '');
  text = text.replace(/\[ADDRESS:\s*.+?\]\s*/gi, '');
  return text.trim();
}

export function extractListingImageUrls(item: { description?: string; imageUrl?: string }): string[] {
  const urls: string[] = [];

  const add = (url: string | undefined) => {
    const t = url?.trim();
    if (!t) return;
    const ok =
      t.startsWith('http://') ||
      t.startsWith('https://') ||
      t.startsWith('data:image/');
    if (!ok) return;
    if (!urls.includes(t)) urls.push(t);
  };

  add(item.imageUrl);

  const desc = item.description || '';
  const photosTag = desc.match(PHOTOS_TAG_RE);
  if (photosTag) {
    photosTag[1].split('|').forEach((part) => add(part));
  }

  for (const match of desc.matchAll(LEGACY_PHOTO_RE)) {
    add(match[1]);
  }

  return urls.slice(0, MAX_LISTING_PHOTOS);
}

export function appendPhotosToDescription(description: string, urls: string[]): string {
  let text = description || '';
  text = text.replace(/\n\n\[PHOTOS:[^\]]+\]\s*/gi, '');
  text = text.replace(/\n\n\[Photo\]:\s*\S+\s*/g, '');
  if (urls.length === 0) return text.trim();
  return `${text.trim()}\n\n[PHOTOS: ${urls.join('|')}]`.trim();
}

export function normalizeItemMedia(item: ItemPost): ItemPost {
  const imageUrls = extractListingImageUrls(item);
  return {
    ...item,
    imageUrl: imageUrls[0] || item.imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}
