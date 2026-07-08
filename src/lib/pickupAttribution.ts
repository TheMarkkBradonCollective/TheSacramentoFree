import type { ItemPost, PickupAttributionType, UserProfile } from '../types';

export const PICKUP_CHANNEL_OPTIONS = [
  { type: 'reddit' as const, label: 'r/SacramentoBuyNothing • Reddit' },
  { type: 'buynothing_project' as const, label: 'BuyNothing Project' },
  { type: 'facebook_group' as const, label: 'Facebook Group' },
  { type: 'other' as const, label: 'Other' },
];

export interface PickupAttributionInput {
  type: PickupAttributionType;
  userId?: string;
  userDisplayName?: string;
  label?: string;
}

export interface PickupNeighborCandidate {
  userId: string;
  displayName: string;
  photoURL?: string;
  neighborhood?: string;
  source: 'chat' | 'interest' | 'search';
}

export function getPickupAttributionLabel(item: ItemPost, neighborName?: string): string | null {
  if (neighborName?.trim()) return neighborName.trim();

  switch (item.pickupAttributionType) {
    case 'app_user':
      return item.pickupAttributionLabel?.trim() || 'Neighbor on the app';
    case 'reddit':
      return 'r/SacramentoBuyNothing • Reddit';
    case 'buynothing_project':
      return 'BuyNothing Project';
    case 'facebook_group':
      return item.pickupAttributionLabel?.trim()
        ? `Facebook Group · ${item.pickupAttributionLabel.trim()}`
        : 'Facebook Group';
    case 'other':
      return item.pickupAttributionLabel?.trim() || 'Other';
    default:
      return null;
  }
}

export function listingNeedsPickupAttribution(item: ItemPost, hasAppClaim: boolean): boolean {
  if (item.status !== 'completed') return false;
  if (hasAppClaim) return false;
  return !item.pickupAttributionType;
}

export function buildPickupAttributionInput(params: {
  selection: 'neighbor' | PickupAttributionType;
  neighbor?: PickupNeighborCandidate | null;
  facebookGroupName?: string;
  otherLabel?: string;
}): PickupAttributionInput | null {
  if (params.selection === 'neighbor') {
    if (!params.neighbor?.userId) return null;
    return {
      type: 'app_user',
      userId: params.neighbor.userId,
      userDisplayName: params.neighbor.displayName,
    };
  }

  if (params.selection === 'facebook_group') {
    const label = params.facebookGroupName?.trim();
    if (!label) return null;
    return { type: 'facebook_group', label };
  }

  if (params.selection === 'other') {
    const label = params.otherLabel?.trim() || 'Other';
    return { type: 'other', label };
  }

  if (params.selection === 'reddit' || params.selection === 'buynothing_project') {
    return { type: params.selection };
  }

  return null;
}

export function initialPickupSelection(
  item: ItemPost,
): 'neighbor' | PickupAttributionType {
  if (item.pickupAttributionType === 'app_user') return 'neighbor';
  if (item.pickupAttributionType) return item.pickupAttributionType;
  return 'other';
}

export function completedActionNeedsAttribution(item: ItemPost, owner: UserProfile): boolean {
  return item.userId === owner.uid && item.status !== 'completed' && item.status !== 'withdrawn';
}
