import { ItemPost } from '../types';

export const MAX_LISTING_PHOTOS = 6;
/** Descriptions larger than this almost always contain camera dumps, not neighbor copy. */
export const MAX_LISTING_DESCRIPTION_CHARS = 20_000;

const DETAILS_BLOCK_RE = /\[DETAILS\]([\s\S]*?)\[\/DETAILS\]/i;
const PICKUP_NOTES_BLOCK_RE = /\[PICKUP_NOTES\]([\s\S]*?)\[\/PICKUP_NOTES\]/i;
const PHOTOS_TAG_RE = /\[PHOTOS:\s*([^\]]+)\]/i;
const LEGACY_PHOTO_RE = /\[Photo\]:\s*(\S+)/gi;

function extractPhotosTagUrls(desc: string): string[] {
  const photosIdx = desc.indexOf('[PHOTOS:');
  if (photosIdx < 0) return [];
  const match = desc.slice(photosIdx).match(PHOTOS_TAG_RE);
  if (!match?.[1]) return [];
  return match[1]
    .split('|')
    .map((part) => part.trim())
    .filter((url) => isPersistableListingImageUrl(url));
}

function extractLegacyPhotoUrls(desc: string): string[] {
  const scan = desc.length > 12_000 ? desc.slice(-12_000) : desc;
  const urls: string[] = [];
  for (const match of scan.matchAll(LEGACY_PHOTO_RE)) {
    const url = match[1]?.trim();
    if (isPersistableListingImageUrl(url) && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

/** Photos we may persist or render from the feed — never inlined camera dumps. */
export function isPersistableListingImageUrl(url: string | undefined | null): boolean {
  const t = url?.trim() ?? '';
  return t.startsWith('http://') || t.startsWith('https://');
}

/**
 * Drop embedded `data:image…` camera dumps before they enter React state or localStorage.
 * Eight live listings currently store 0.5–12MB each in `[PHOTOS:]`, which is ~51MB for the
 * whole feed — enough for a phone fetch to time out and show “0 listings”.
 */
export function plainListingDescription(raw: string | undefined | null): string {
  if (!raw) return '';
  if (raw.length > MAX_LISTING_DESCRIPTION_CHARS) {
    const photosAt = raw.indexOf('[PHOTOS:');
    const cut = photosAt > 0 ? photosAt : MAX_LISTING_DESCRIPTION_CHARS;
    return raw.slice(0, cut).trim();
  }
  const dataAt = raw.indexOf('data:image');
  if (dataAt < 0) return raw;
  const photosAt = raw.indexOf('[PHOTOS:');
  if (photosAt >= 0 && photosAt <= dataAt) {
    return raw.slice(0, photosAt).trim();
  }
  return `${raw.slice(0, dataAt).trim()} ${raw.slice(dataAt).replace(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/g, '').trim()}`.trim();
}

export function parseListingDetails(description: string): string {
  const match = plainListingDescription(description).match(DETAILS_BLOCK_RE);
  return match ? match[1].trim() : '';
}

export function parsePickupNotes(description: string): string {
  const match = plainListingDescription(description).match(PICKUP_NOTES_BLOCK_RE);
  return match ? match[1].trim() : '';
}

/** User-facing item description (excludes pickup notes and machine tags). */
export function getListingDetailsText(description: string): string {
  const safe = plainListingDescription(description);
  const fromBlock = parseListingDetails(safe);
  if (fromBlock) return fromBlock;

  let text = safe;
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

export function extractListingImageUrls(item: {
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
}): string[] {
  const urls: string[] = [];

  const add = (url: string | undefined) => {
    const t = url?.trim();
    if (!t || !isPersistableListingImageUrl(t) || urls.includes(t)) return;
    urls.push(t);
  };

  item.imageUrls?.forEach((url) => add(url));
  add(item.imageUrl);

  const desc = item.description || '';
  extractPhotosTagUrls(desc).forEach((url) => add(url));

  if (desc.length <= MAX_LISTING_DESCRIPTION_CHARS) {
    for (const match of desc.matchAll(LEGACY_PHOTO_RE)) {
      add(match[1]);
    }
  } else {
    extractLegacyPhotoUrls(desc).forEach((url) => add(url));
  }

  return urls.slice(0, MAX_LISTING_PHOTOS);
}

export function appendPhotosToDescription(description: string, urls: string[]): string {
  let text = plainListingDescription(description);
  text = text.replace(/\n\n\[PHOTOS:[^\]]+\]\s*/gi, '');
  text = text.replace(/\n\n\[Photo\]:\s*\S+\s*/g, '');
  const persistable = urls.filter((url) => isPersistableListingImageUrl(url));
  if (persistable.length === 0) return text.trim();
  return `${text.trim()}\n\n[PHOTOS: ${persistable.join('|')}]`.trim();
}

export function normalizeItemMedia(item: ItemPost): ItemPost {
  const description = plainListingDescription(item.description);
  const imageUrls = extractListingImageUrls({ ...item, description });
  return {
    ...item,
    description,
    imageUrl: imageUrls[0] || (isPersistableListingImageUrl(item.imageUrl) ? item.imageUrl : undefined),
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}
