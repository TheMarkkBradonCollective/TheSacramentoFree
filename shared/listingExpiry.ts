/** Listings auto-withdraw after this many days unless the owner edits or reposts. */
export const LISTING_TTL_DAYS = 30;

/** Send one warning when this many days remain before expiry. */
export const LISTING_EXPIRY_WARN_DAYS_BEFORE = 3;

export const LISTING_TTL_MS = LISTING_TTL_DAYS * 24 * 60 * 60 * 1000;
export const LISTING_EXPIRY_WARN_MS = LISTING_EXPIRY_WARN_DAYS_BEFORE * 24 * 60 * 60 * 1000;

export type ListingExpiryAnchor = {
  expiresAt?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function toMs(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  const ms = new Date(value as string | number | Date).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** When a listing should auto-withdraw (stored column or legacy createdAt + TTL). */
export function listingExpiresAtMs(item: ListingExpiryAnchor, nowMs = Date.now()): number {
  const explicit = toMs(item.expiresAt);
  if (explicit != null) return explicit;

  const created = toMs(item.createdAt);
  if (created != null) return created + LISTING_TTL_MS;

  return nowMs + LISTING_TTL_MS;
}

export function listingExpiresAtIso(fromMs = Date.now()): string {
  return new Date(fromMs + LISTING_TTL_MS).toISOString();
}

export function isListingExpired(item: ListingExpiryAnchor, nowMs = Date.now()): boolean {
  return listingExpiresAtMs(item, nowMs) <= nowMs;
}

export function isListingInExpiryWarningWindow(item: ListingExpiryAnchor, nowMs = Date.now()): boolean {
  const expiresMs = listingExpiresAtMs(item, nowMs);
  if (expiresMs <= nowMs) return false;
  return expiresMs - nowMs <= LISTING_EXPIRY_WARN_MS;
}

export function listingExpiryDaysRemaining(item: ListingExpiryAnchor, nowMs = Date.now()): number {
  const expiresMs = listingExpiresAtMs(item, nowMs);
  return Math.max(0, Math.ceil((expiresMs - nowMs) / (24 * 60 * 60 * 1000)));
}
