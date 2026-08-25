import type { UserProfile } from '../types';

/** Read receipts on by default; neighbors can turn off in Messages settings. */
export function readReceiptsEnabledForProfile(profile: Pick<UserProfile, 'appPreferences'> | null | undefined): boolean {
  return profile?.appPreferences?.readReceiptsEnabled !== false;
}
