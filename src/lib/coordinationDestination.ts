import type { ItemPost } from '../types';
import type { ChatMeetLocation } from '../types';
import { getItemMapDestination, hasNavigablePin } from './itemLocation';
import type { LatLng } from './mapRoute';

/** Listing pin used for coordination (poster pin for looking/trade; privacy-aware for giveaways). */
export function listingCoordinationPin(
  item: ItemPost,
  viewerUserId: string,
): LatLng | null {
  const ownerId =
    item.type === 'looking' || item.type === 'trade' ? item.userId : viewerUserId;
  return getItemMapDestination(item, ownerId);
}

export function hasCoordinationDestination(
  item: ItemPost,
  viewerUserId: string,
  chatMeet?: ChatMeetLocation | null,
): boolean {
  if (chatMeet && chatMeet.itemId === item.id) return true;
  if (item.type === 'looking' || item.type === 'trade') {
    return getItemMapDestination(item, item.userId) != null;
  }
  return hasNavigablePin(item, viewerUserId);
}

/** Chat meet pin wins when the poster set one for this neighbor. */
export function resolveCoordinationDestination(
  item: ItemPost,
  viewerUserId: string,
  chatMeet?: ChatMeetLocation | null,
): LatLng | null {
  if (chatMeet && chatMeet.itemId === item.id) {
    return { lat: chatMeet.lat, lng: chatMeet.lng };
  }
  return listingCoordinationPin(item, viewerUserId);
}

export function coordinationDestinationLabel(
  item: ItemPost,
  chatMeet?: ChatMeetLocation | null,
): string {
  if (chatMeet?.label) return chatMeet.label;
  if (chatMeet) return `Meet spot: ${item.title}`;
  if (item.type === 'looking') return `${item.neighborhood} area`;
  if (item.type === 'trade') return `Meetup: ${item.title}`;
  return item.title;
}
