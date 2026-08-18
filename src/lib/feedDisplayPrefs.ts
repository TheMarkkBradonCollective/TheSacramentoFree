import type { ItemPost } from '../types';

const HIDE_GIVEN_KEY = 'sbn_feed_hide_given_v1';
const HIDE_FULFILLED_KEY = 'sbn_feed_hide_fulfilled_v1';

function readBool(key: string, fallback = false): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function readHideGivenFromFeed(): boolean {
  return readBool(HIDE_GIVEN_KEY);
}

export function readHideFulfilledFromFeed(): boolean {
  return readBool(HIDE_FULFILLED_KEY);
}

export function writeHideGivenFromFeed(value: boolean): void {
  writeBool(HIDE_GIVEN_KEY, value);
}

export function writeHideFulfilledFromFeed(value: boolean): void {
  writeBool(HIDE_FULFILLED_KEY, value);
}

export function isGivenListing(item: Pick<ItemPost, 'type' | 'status'>): boolean {
  return item.type === 'giveaway' && item.status === 'completed';
}

export function isFulfilledListing(item: Pick<ItemPost, 'type' | 'status'>): boolean {
  return item.type === 'looking' && item.status === 'completed';
}

export function shouldHideCompletedListing(
  item: Pick<ItemPost, 'type' | 'status'>,
  prefs: { hideGiven: boolean; hideFulfilled: boolean },
): boolean {
  if (prefs.hideGiven && isGivenListing(item)) return true;
  if (prefs.hideFulfilled && isFulfilledListing(item)) return true;
  return false;
}
