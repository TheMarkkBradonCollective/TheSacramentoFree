import { useEffect, useState } from 'react';
import type { UserProfile } from '../types';
import { isStaffRole } from '../lib/roles';
import {
  DEFAULT_STAFF_INTERACTION_MODE,
  normalizeStaffInteractionMode,
  type StaffInteractionMode,
} from '../lib/staffInteractionMode';
import { persistUserStaffInteractionMode } from '../lib/staffModePrefs';
import { writeCachedProfile } from '../lib/sessionCache';
import LabeledSwitch from './LabeledSwitch';

interface StaffModeSettingsProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function StaffModeSettings({ userProfile, onUpdateProfile }: StaffModeSettingsProps) {
  const [mode, setMode] = useState<StaffInteractionMode>(
    normalizeStaffInteractionMode(userProfile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setMode(normalizeStaffInteractionMode(userProfile.staffInteractionMode ?? DEFAULT_STAFF_INTERACTION_MODE));
  }, [userProfile.staffInteractionMode, userProfile.uid]);

  if (!isStaffRole(userProfile.role)) return null;

  const isStaffMode = mode === 'staff';

  const handleToggle = async (nextStaffMode: boolean) => {
    const next: StaffInteractionMode = nextStaffMode ? 'staff' : 'neighbor';
    if (next === mode || saving) return;
    const previous = mode;
    setSaving(true);
    setErr('');
    setMode(next);
    const result = await persistUserStaffInteractionMode(userProfile, next);
    setSaving(false);
    if (!result.ok) {
      setErr(result.errorMessage || 'Could not save this setting.');
      setMode(previous);
      return;
    }
    if (result.profile) {
      onUpdateProfile(result.profile);
      writeCachedProfile(result.profile);
    }
  };

  return (
    <div
      className="w-full p-3 rounded-xl border border-app bg-inset text-left"
      id="profile_staff_mode_settings"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-app">{isStaffMode ? 'Staff mode' : 'User mode'}</p>
          <p className="text-[10px] text-muted mt-0.5 leading-snug">
            {isStaffMode
              ? 'Staff tools, sidebar, and official outreach are on. New comments and messages show your staff role.'
              : 'User mode — browse and message like any neighbor. New comments and messages use your profile name only.'}
          </p>
          <p className="text-[10px] text-subtle mt-1 leading-snug">
            Saved to your account and follows you on any device. Whatever mode you are in when you send stays
            that way — switching later does not change past posts.
          </p>
        </div>
        <LabeledSwitch
          id="profile_staff_mode_switch"
          checked={isStaffMode}
          onLabel="Staff"
          offLabel="User"
          disabled={saving}
          ariaLabel={isStaffMode ? 'Staff mode' : 'User mode'}
          onChange={(checked) => void handleToggle(checked)}
        />
      </div>
      {err ? <p className="text-[10px] text-red-400 mt-2">{err}</p> : null}
    </div>
  );
}
