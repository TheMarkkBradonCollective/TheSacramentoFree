import type { ItemPost, UserProfile } from '../types';
import { isGoGetCoordinationEnabled } from './goGetEligibility';
import { isProfileWithinPickupAvailability } from './pickupAvailability';
import { goGetHandshakeModeForItem } from './goGetSessions';

export type GoGetCoordinationGateReason =
  | 'coordination_off'
  | 'outside_availability'
  | 'instant_only';

export type GoGetCoordinationGate = { ok: true } | { ok: false; reason: GoGetCoordinationGateReason };

/** Whether app-coordinated pickup actions (Go Get, claim-at-pin, etc.) should show for this listing. */
export function canShowAppPickupCoordination(params: {
  item: ItemPost;
  posterProfile: Pick<UserProfile, 'uid' | 'goGetEnabled' | 'pickupAvailability'> | null | undefined;
  pickerProfile: Pick<UserProfile, 'uid' | 'goGetEnabled' | 'pickupAvailability'> | null | undefined;
  at?: Date;
}): GoGetCoordinationGate {
  const { item, posterProfile, pickerProfile } = params;
  if (!posterProfile || !pickerProfile) return { ok: false, reason: 'coordination_off' };
  if (item.userId === pickerProfile.uid) return { ok: true };

  if (!isGoGetCoordinationEnabled(posterProfile)) {
    return { ok: false, reason: 'coordination_off' };
  }
  if (!isGoGetCoordinationEnabled(pickerProfile)) {
    return { ok: false, reason: 'coordination_off' };
  }

  const at = params.at ?? new Date();
  if (!isProfileWithinPickupAvailability(posterProfile, at)) {
    return { ok: false, reason: 'outside_availability' };
  }
  if (!isProfileWithinPickupAvailability(pickerProfile, at)) {
    return { ok: false, reason: 'outside_availability' };
  }

  return { ok: true };
}

/** Navigate-style primary action on active listings (excludes instant curb flows). */
export function listingUsesNavigateCoordination(item: ItemPost): boolean {
  return item.status === 'active' && goGetHandshakeModeForItem(item) === 'availability';
}
