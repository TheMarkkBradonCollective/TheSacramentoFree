import type { UserProfile } from '../types';
import { isNativeApp } from './nativePlatform';
import { isProfileWithinPickupAvailability } from './pickupAvailability';
import {
  getNotificationPreferences,
  getPushPermissionState,
  hasActivePushSubscription,
} from './pushNotifications';
import type { AlertOptions } from '../contexts/ConfirmContext';

export type GoGetBlockReason =
  | 'need_install'
  | 'need_notifications'
  | 'opted_out'
  | 'other_opted_out'
  | 'outside_availability';

export type GoGetEligibility = { ok: true } | { ok: false; reason: GoGetBlockReason; otherName?: string };

/** Go Get / pickup coordination — Android APK & AAB only (not browser or PWA). */
export function supportsGoGetCoordination(): boolean {
  return isNativeApp();
}

/** @deprecated Use supportsGoGetCoordination — kept for existing call sites. */
export function isInstalledApp(): boolean {
  return supportsGoGetCoordination();
}

export function isGoGetCoordinationEnabled(profile: Pick<UserProfile, 'goGetEnabled'> | null | undefined): boolean {
  return profile?.goGetEnabled === true;
}

export async function hasNotificationsReadyForGoGet(userId: string): Promise<boolean> {
  if (getPushPermissionState() !== 'granted') return false;
  if (!(await hasActivePushSubscription())) return false;
  const prefs = await getNotificationPreferences(userId);
  return prefs.enabled !== false;
}

/** Local device + account checks for the current user. */
export async function checkSelfGoGetEligibility(
  profile: Pick<UserProfile, 'uid' | 'goGetEnabled' | 'displayName' | 'pickupAvailability'>,
): Promise<GoGetEligibility> {
  if (!isGoGetCoordinationEnabled(profile)) {
    return { ok: false, reason: 'opted_out' };
  }
  if (!isProfileWithinPickupAvailability(profile)) {
    return { ok: false, reason: 'outside_availability' };
  }
  if (!isInstalledApp()) {
    return { ok: false, reason: 'need_install' };
  }
  if (!(await hasNotificationsReadyForGoGet(profile.uid))) {
    return { ok: false, reason: 'need_notifications' };
  }
  return { ok: true };
}

/** Full check including the other neighbor’s opt-out preference. */
export async function checkGoGetCoordinationEligibility(params: {
  self: Pick<UserProfile, 'uid' | 'goGetEnabled' | 'displayName' | 'pickupAvailability'>;
  otherUserId: string;
  otherDisplayName?: string;
}): Promise<GoGetEligibility> {
  const selfCheck = await checkSelfGoGetEligibility(params.self);
  if (!selfCheck.ok) return selfCheck;

  if (params.otherUserId && params.otherUserId !== params.self.uid) {
    const { getSupabaseProfile } = await import('../supabase');
    const other = await getSupabaseProfile(params.otherUserId);
    if (other && !isGoGetCoordinationEnabled(other)) {
      return {
        ok: false,
        reason: 'other_opted_out',
        otherName: other.displayName || params.otherDisplayName || 'This neighbor',
      };
    }
    if (other && !isProfileWithinPickupAvailability(other)) {
      return {
        ok: false,
        reason: 'outside_availability',
        otherName: other.displayName || params.otherDisplayName || 'This neighbor',
      };
    }
  }

  return { ok: true };
}

export function goGetBlockAlert(eligibility: Extract<GoGetEligibility, { ok: false }>): AlertOptions {
  switch (eligibility.reason) {
    case 'need_install':
      return {
        title: 'Install the Android app to use Go Get',
        message:
          'Pickup coordination (Go Get, Drop off, Meet up, and claim-at-pin) only works in the Sacramento Buy Nothing Android app (APK or Play Store). Install from Download in Account, turn on notifications, then enable coordination in Account settings.',
        okLabel: 'Got it',
      };
    case 'need_notifications':
      return {
        title: 'Turn on notifications',
        message:
          'Go Get and pickup coordination require notifications so both neighbors get arrival and handoff alerts. Open the bell → Notification settings, enable alerts, then try again.',
        okLabel: 'Got it',
      };
    case 'opted_out':
      return {
        title: 'Pickup coordination is off',
        message:
          'You turned off Go Get & pickup coordination in Account settings. You can still list items and message neighbors independently. Turn the setting back on anytime to use app-supported pickups.',
        okLabel: 'Got it',
      };
    case 'other_opted_out':
      return {
        title: 'Neighbor opted out',
        message: `${eligibility.otherName || 'This neighbor'} isn’t using app pickup coordination. Message them to arrange pickup on your own — listing and chat still work as usual.`,
        okLabel: 'Got it',
      };
    case 'outside_availability':
      return {
        title: 'Outside pickup hours',
        message: `${eligibility.otherName || 'This neighbor'} isn’t available for app pickup coordination right now (or you’re outside your own pickup hours). Message them to coordinate manually, or try again during their availability window.`,
        okLabel: 'Got it',
      };
  }
}

/** Run eligibility check and show a blocking alert when not allowed. Returns true if allowed. */
export async function ensureGoGetAllowed(params: {
  self: Pick<UserProfile, 'uid' | 'goGetEnabled' | 'displayName' | 'pickupAvailability'>;
  otherUserId: string;
  otherDisplayName?: string;
  alert: (options: AlertOptions) => Promise<void>;
}): Promise<boolean> {
  const eligibility = await checkGoGetCoordinationEligibility(params);
  if (eligibility.ok === false) {
    await params.alert(goGetBlockAlert(eligibility));
    return false;
  }
  return true;
}
