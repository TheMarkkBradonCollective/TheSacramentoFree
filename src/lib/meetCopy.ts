import type { CoordinationMode, ItemPost } from '../types';
import { coordinationModeFromItem, normalizeCoordinationMode } from './pickupEngine';

/** Umbrella name for coordinated in-person sessions. Listing buttons stay Go Get / Pick Up / Drop off / Meet up. */
export const MEET_UMBRELLA = 'Meet';

export interface MeetCopy {
  umbrella: string;
  requestTitle: string;
  requestLine: (requesterName: string, itemTitle: string) => string;
  scheduledTitle: string;
  locationKind: string;
  countdownNoun: string;
  readyQuestion: string;
  gettingReady: (otherName: string) => string;
  theyAreReady: (otherName: string) => string;
  youAreReady: (otherName: string) => string;
  startTrip: string;
  onTheWay: (otherName: string) => string;
  confirmHandoff: string;
  arrivedHint: string;
  waitForHandoff: (otherName: string) => string;
  completedChat: string;
  cancelTitle: string;
  inProgress: string;
  cannotOwn: string;
}

const GO_GET: MeetCopy = {
  umbrella: MEET_UMBRELLA,
  requestTitle: 'Meet request',
  requestLine: (name, title) => `${name} wants to pick up "${title}".`,
  scheduledTitle: 'Meet scheduled',
  locationKind: 'Pickup location',
  countdownNoun: 'Meet',
  readyQuestion: 'Are you ready for pickup?',
  gettingReady: (name) => `${name} is getting ready for your pickup.`,
  theyAreReady: (name) => `${name} is ready for pickup.`,
  youAreReady: (name) => `You're ready — waiting for ${name}.`,
  startTrip: 'Go Get it',
  onTheWay: (name) => `You're on the way to ${name}'s pickup.`,
  confirmHandoff: 'Confirm pickup',
  arrivedHint: 'Confirm once the item is in their hands.',
  waitForHandoff: (name) => `Waiting for ${name} to confirm the handoff…`,
  completedChat: 'Meet completed.',
  cancelTitle: 'Cancel Meet',
  inProgress: 'Meet in progress',
  cannotOwn: 'You cannot start a Meet on your own listing.',
};

const DROP_OFF: MeetCopy = {
  ...GO_GET,
  requestLine: (name, title) => `${name} can drop off "${title}".`,
  locationKind: 'Drop-off location',
  readyQuestion: 'Are you ready for drop-off?',
  gettingReady: (name) => `${name} is getting ready for drop-off.`,
  theyAreReady: (name) => `${name} is ready for drop-off.`,
  startTrip: 'Start drop-off',
  onTheWay: (name) => `You're on the way to drop off for ${name}.`,
  confirmHandoff: 'Confirm drop-off',
  arrivedHint: 'Confirm once the drop-off is complete.',
};

const MEET_UP: MeetCopy = {
  umbrella: MEET_UMBRELLA,
  requestTitle: 'Meet request',
  requestLine: (name, title) => `${name} wants to meet to trade "${title}".`,
  scheduledTitle: 'Meet scheduled',
  locationKind: 'Meet location',
  countdownNoun: 'Meet',
  readyQuestion: 'Are you ready to meet?',
  gettingReady: (name) => `${name} is getting ready to meet.`,
  theyAreReady: (name) => `${name} is ready to meet.`,
  youAreReady: (name) => `You're ready — waiting for ${name}.`,
  startTrip: 'Start Meet',
  onTheWay: (name) => `You're heading to the meetup pin for ${name}.`,
  confirmHandoff: 'Confirm exchange',
  arrivedHint: "Confirm once you've exchanged items.",
  waitForHandoff: (name) => `Waiting for ${name} to confirm the exchange…`,
  completedChat: 'Exchange completed.',
  cancelTitle: 'Cancel Meet',
  inProgress: 'Meet in progress',
  cannotOwn: 'You cannot start a Meet on your own listing from here — open the chat with that neighbor.',
};

export function meetCopyForMode(mode: CoordinationMode): MeetCopy {
  if (mode === 'meet_up') return MEET_UP;
  if (mode === 'drop_off') return DROP_OFF;
  return GO_GET;
}

export function meetCopyForItem(item: Pick<ItemPost, 'type' | 'category'>): MeetCopy {
  return meetCopyForMode(coordinationModeFromItem(item));
}

export function meetCopyForSession(session: { coordinationMode?: string | null; itemType?: string }): MeetCopy {
  if (session.coordinationMode) return meetCopyForMode(normalizeCoordinationMode(session.coordinationMode));
  if (session.itemType === 'trade') return MEET_UP;
  if (session.itemType === 'looking') return DROP_OFF;
  return GO_GET;
}
