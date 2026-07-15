import type { AwardsUnlockStatus } from '../types';
import { getCommunityUnlockStatus } from './communityUnlock';

export const EVENTS_UNLOCK_TARGET = 500;

export async function getEventsUnlockStatus(): Promise<AwardsUnlockStatus> {
  return getCommunityUnlockStatus(EVENTS_UNLOCK_TARGET);
}
