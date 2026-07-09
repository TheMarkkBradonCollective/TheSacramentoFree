import type { ItemPost } from '../types';
import { isUserAtPickupLocation, pickupHasGpsPin } from './pickupProximity';

/** First-come curb pickups — grab without coordinating first. */
export const CONTACTLESS_CLAIM_CATEGORIES = ['Curb Alert'] as const;

export function isContactlessClaimCategory(category: string): boolean {
  return (CONTACTLESS_CLAIM_CATEGORIES as readonly string[]).includes(category);
}

/** Primary map/detail navigation label per listing type. */
export function getListingNavigateLabel(item: Pick<ItemPost, 'type' | 'category'>): string {
  if (item.type === 'looking') return 'Drop off';
  if (item.type === 'trade') return 'Meet up';
  if (item.type === 'giveaway' && isContactlessClaimCategory(item.category)) return 'Pick Up';
  return 'Go Get';
}

/** Chat coordination chip label (Looking / Trade). */
export function getChatCoordinationLabel(item: Pick<ItemPost, 'type'>): string {
  if (item.type === 'looking') return 'Drop off';
  if (item.type === 'trade') return 'Meet up';
  return 'Go Get';
}

/** Curb alerts navigate straight to the pin — no Go Get handshake. */
export function navigatesDirectlyToPin(item: Pick<ItemPost, 'type' | 'category'>): boolean {
  return item.type === 'giveaway' && isContactlessClaimCategory(item.category);
}

/** Contactless "I picked up" — curb alerts only, when the neighbor is at the pin. */
export function canOfferContactlessClaim(
  item: ItemPost,
  userId: string,
  userLat: number | null,
  userLng: number | null,
): boolean {
  if (item.type !== 'giveaway' || item.status !== 'active') return false;
  if (item.userId === userId) return false;
  if (!isContactlessClaimCategory(item.category)) return false;
  if (!pickupHasGpsPin(item)) return false;
  if (userLat == null || userLng == null) return false;
  return isUserAtPickupLocation(userLat, userLng, item);
}
